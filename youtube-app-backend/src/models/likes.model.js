import mongoose, { Schema } from 'mongoose';

const likesSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video',
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
    },
    likedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
    },
}, { timestamps: true }
);

export const Likes = mongoose.model('Likes', likesSchema);