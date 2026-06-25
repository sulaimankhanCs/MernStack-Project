import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { Likes } from "../models/likes.model.js";
import mongoose from "mongoose";

const toggleLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const likeAlready = await Likes.findOne({
        video: videoId,
        likedBy: req.user._id,
    });

    if (likeAlready) {
        await Likes.findByIdAndDelete(likeAlready._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"));
    }

    await Likes.create({
        video: videoId,
        likedBy: req.user._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const likeAlready = await Likes.findOne({
        comment: commentId,
        likedBy: req.user._id,
    });

    if (likeAlready) {
        await Likes.findByIdAndDelete(likeAlready._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"));
    }

    await Likes.create({
        comment: commentId,
        likedBy: req.user._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"));
});

const getAllLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Likes.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true, $ne: null },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
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
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: [
                        "$likedVideo",
                        { likedAt: "$createdAt" },
                    ],
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

export {
    toggleLike,
    toggleCommentLike,
    getAllLikedVideos,
};
