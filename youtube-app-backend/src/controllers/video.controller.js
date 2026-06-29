import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import uploadToCloudinary from "../utils/cloudinaryUploader.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

const deleteFromCloudinary = async (fileUrl, resourceType = "image") => {
    if (!fileUrl) return;

    const publicId = fileUrl.split("/").pop().split(".")[0];

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const videoFile = await uploadToCloudinary(videoLocalPath, {
        resource_type: "video",
    });
    const thumbnail = await uploadToCloudinary(thumbnailLocalPath);

    if (!videoFile?.url || !thumbnail?.url) {
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    if (!videoFile.duration) {
        throw new ApiError(500, "Failed to retrieve video duration");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
    });

    const createdVideo = await Video.findById(video._id).populate(
        "owner",
        "username fullName avatar"
    );

    if (!createdVideo) {
        throw new ApiError(500, "Failed to upload video");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdVideo, "Video uploaded successfully"));
});

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

    const pipeline = [];

    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } }, // i means case insensitive (i is regex operator)
                    { description: { $regex: query, $options: "i" } },
                ],
            },
        });
    }

    pipeline.push({
        $match: {
            isPublished: true,
        },
    });

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                    },
                },
            ],
        },
    });

    pipeline.push({
        $addFields: {
            owner: {
                $first: "$owner",
            },
        },
    });

    const sortField = sortBy || "createdAt";
    const sortOrder = sortType === "asc" ? 1 : -1;

    const videoAggregate = Video.aggregate(pipeline);

    const videos = await Video.aggregatePaginate(videoAggregate, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: {
            [sortField]: sortOrder,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const userObjectId = req.user?._id
        ? new mongoose.Types.ObjectId(String(req.user._id))
        : null;

    const isLikedExpression = userObjectId
        ? {
              $cond: {
                  if: { $in: [userObjectId, "$likes.likedBy"] },
                  then: true,
                  else: false,
              },
          }
        : false;

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: isLikedExpression,
            },
        },
        {
            $project: {
                likes: 0,
            },
        },
    ]);

    if (!video?.length) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }, //inc means increment the views by 1 (inc is aggregate pipeline operator)
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description, isPublished } = req.body;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const thumbnailLocalPath = req.file?.path;
    let thumbnail = video.thumbnail;

    if (thumbnailLocalPath) {
        const uploadedThumbnail = await uploadToCloudinary(thumbnailLocalPath);

        if (!uploadedThumbnail?.url) {
            throw new ApiError(500, "Failed to upload thumbnail");
        }

        thumbnail = uploadedThumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                ...(title && { title }),
                ...(description && { description }),
                ...(thumbnail && { thumbnail }),
                ...(typeof isPublished !== "undefined" && { isPublished }),
             },
        },
        { returnDocument: "after" }
    ).populate("owner", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    await deleteFromCloudinary(video.videoFile, "video");
    await deleteFromCloudinary(video.thumbnail, "image");

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo
};
