//middleware for finding user from jwt token (token comes from req) and then use it where we need to logout user. because directly in logout we dont have access to user.
//we can implement this directly inside logout controller function but implemented middleware for it because whereever we need user to verify we can use this middleware.

import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
import {User} from '../models/user.model.js'

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        //getting token from req (req has cookies access becuse we define cookie parser in app.tsx)
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if(!token){
            throw new ApiError(401, "Unauthorized access.")
        }
    
        //verifying token
        const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY)
    
        //finding user by id from decoded token because during generation of token we have passed id to it that's why it has id now when decoded.
        const user = await User.findById(decodedToken?.id).select('-password -refreshToken')
    
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }
    
        // add user to the request and next() will forward it to logout controller function so there we have access to user from req
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error.message || "invalid access token");  
    }

})