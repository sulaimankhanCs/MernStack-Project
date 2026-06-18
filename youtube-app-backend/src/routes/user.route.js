import Router from 'express';
import { registerUser, loginUser, logoutUser, refreshAccessToken } from '../controllers/user.controller.js';
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

export default router;