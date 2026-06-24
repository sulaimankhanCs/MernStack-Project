import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import uploadToCloudinary from '../utils/cloudinaryUploader.js';
import ApiResponse from '../utils/apiResponse.js';
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';

//function for generating tokens, will be used in login controller functionality
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(401, "something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    //steps we will follow to register a user. (its an Algorithm)
    //1. get the user data from the request body that will come from the client/frontend
    //2. validate the user data to check for empty fields or invalid data
    //3. check if the user already exists in the database
    //4. check for cover image, check for avatar
    //5. upload the avatar to the cloudinary
    //6. create a new user in db
    //7. Remove password and refresh token fields from the response
    //8. check for user creation status 
    //9. return the user

    // step:1
    const { userName, email, password, fullName } = req.body;

    // step:2
    if (!userName || !email || !password) {
        throw new ApiError(400, 'All fields are required');
    }

    // step:3
    const ExistedUser = await User.findOne({
        $or: [{ email }, { userName }]
    });
    if (ExistedUser) {
        throw new ApiError(400, 'User already exists with this email or username');
    }

    // step:4
    const avatarLocalPath = req.files.avatar?.[0]?.path;
    const coverImageLocalPath = req.files.coverImage?.[0]?.path; //its optional so we dont need to check its presence

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required');
    }

    // step:5
    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, 'Failed to upload avatar to cloudinary');
    }

    // step:6
    const user = await User.create({
        userName: userName.toLowerCase(),
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || null
    });

    // step:7
    const createdUser = await User.findById(user._id).select('-password -refreshToken'); //to remove the password and refresh token from the response

    // step:8
    if (!createdUser) {
        throw new ApiError(500, 'Failed to register this user.');
    }

    // step:9
    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User registered successfully')
    );

});


const loginUser = asyncHandler(async (req, res) => {

    //Algoritm steps to implement login controller
    //get data from request
    //check for empty data
    //find the user
    //check password
    //access and refresh tokens 
    //send cookies

    const { username, email, password } = req.body

    if (!password || (!email && !username)) {
        throw new ApiError(400, "username/email or password is missing");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user doen not exist");
    }

    const isValidPassword = await user.isPasswordCorrect(password)

    if (!isValidPassword) {
        throw new ApiError(401, "password is incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    //sending cookies needs some options to set
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
        status(200).
        cookie('accessToken', accessToken, options). //sending tokens in cookies
        cookie('refreshToken', refreshToken, options).
        json(
            new ApiResponse(
                200,
                {
                    user: loginUser, accessToken, refreshToken // also sends tokens into user response if user needs it.
                },
                "User logged in successfully."
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        //clearing refresh token from db
        {
            $unset: { refreshToken: 1 }
        },
        { 
            returnDocument: "after" //this will return the updated document instead of the original document
        }
    )

    //clearing cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
        status(200).
        clearCookie('accessToken', options).
        clearCookie('refreshToken', options).
        json(new ApiResponse(200, {}, "User logged out successfully."))

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_TOKEN_SECRET_KEY);

        if (!decodedToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const user = await User.findById(decodedToken?.id).select('-password');

        if (!user) {
            throw new ApiError(401, "User not found");
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res.status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', newRefreshToken, options)
            .json(new ApiResponse(200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed successfully"
            ));
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid refresh token");
    }

})

const changePassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    const isValidPassword = await user.isPasswordCorrect(oldPassword);

    if (!isValidPassword) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName, email
            }
        },
        { returnDocument: "after" } //this will return the updated document instead of the original document
    ).select('-password -refreshToken');

    return res.status(200).json(
        new ApiResponse(
            200, user, "User updated successfully"
        ));
});

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { avatar: avatar.url }
        },
        { returnDocument: "after" } //this will return the updated document instead of the original document
    ).select('-password -refreshToken');

    return res.status(200).json(
        new ApiResponse(
            200, user, "User avatar updated successfully"
        ));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required");
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(500, "Failed to upload cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { coverImage: coverImage.url }
        },
        { returnDocument: "after" } //this will return the updated document instead of the original document
    ).select('-password -refreshToken');

    return res.status(200).json(
        new ApiResponse(
            200, user, "User Cover Image updated successfully"
        ));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username) {
        throw new ApiError(404, "User not found");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {
            $addFields: {
                totalSubscribers: {
                     $size: '$subscribers'
                    },
                totalSubscribedTo: {
                    $size: '$subscribedTo'
                },
                isSubscribed: {
                    $in: [req.user._id, '$subscribers.subscriber']
                }
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                totalSubscribers: 1,
                totalSubscribedTo: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res.status(200).json(new ApiResponse(200, channel, "User channel profile fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {

    // req.user._id (this returns a string not the mongodb object id but mongoose behind the scenes converts it to object id when we use findById/find/findOne etc)

    const watchHistory = await User.aggregate([
        {
            $match: {
                 //Aggregation pipelines runs directly in MongoDB, so MongoDB expects an ObjectId.
                 //Therefore, we manually convert the string to ObjectId.
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $project: {
                watchHistory: 1,
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, watchHistory, "Watch history fetched successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
