import Router from "express";
import {
    toggleLike,
    toggleCommentLike,
    getAllLikedVideos,
} from "../controllers/likes.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/toggle/v/:videoId").post(verifyJWT, toggleLike);
router.route("/toggle/c/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/liked-videos").get(verifyJWT, getAllLikedVideos);

export default router;
