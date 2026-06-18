import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
            
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video',
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        refreshToken: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

// hash the password before saving the user by using 'pre(save)' mongoose hook
// 'pre(save)' mongoose hook is a middleware that runs before the user is saved to the database
// 'isModified' is a mongoose method that checks if the password field has been modified
// 'next' is a callback function that is called when the password is hashed
// '10' is the number of rounds to hash the password
// 'bcrypt.hash' is a method that hashes the password
//bcrypt is a library that hashes the password
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// 'bcrypt.compare' is a method that compares the password with the hashed password to check if the password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// 'jwt.sign' is a method that generates a token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { // payload data to be signed in the token (we can asign only id as well)
            id: this._id,
            userName: this.userName,
            email: this.email,
            fullName: this.fullName
        },
        process.env.JWT_ACCESS_TOKEN_SECRET_KEY, // secret key to sign the token
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN } // expiration time of the token
    );
};

//refresh token is used to generate a new access token when the access token is expired
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { // why only id here in refresh token? because we don't need to store any other data in the refresh token
            id: this._id,
        },
        process.env.JWT_REFRESH_TOKEN_SECRET_KEY, // secret key to sign the token
        { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN } // expiration time of the token
    );
};

export const User = mongoose.model('User', userSchema);