import Router from 'express';
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

//register route
router.route('/register').post(
    upload.fields([
        { 
            name: 'avatar',
            maxCount: 1
        },
        { 
            name: 'coverImage',
            maxCount: 1
        }
    ]), // this is the middleware that will be used to upload the avatar and cover image to the cloudinary before the controller function is called
    registerUser // this is the controller function that will be called when the user registers
);

//login route
router.route('/login').post(loginUser);

//secure routes
router.route('/logout').post(verifyJWT, logoutUser) //verifyJWT is a middleware that will run before logout user
router.route('/refresh-access-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, changePassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-user').patch(verifyJWT, updateUser);
router.route('/update-user-avatar').put(verifyJWT,  upload.single('avatar'), updateUserAvatar);
router.route('/update-user-cover-image').put(verifyJWT,  upload.single('coverImage'), updateUserCoverImage);
router.route('/get-user-channel-profile/:username').get(verifyJWT, getUserChannelProfile);
router.route('/get-watch-history').get(verifyJWT, getWatchHistory);

export default router;