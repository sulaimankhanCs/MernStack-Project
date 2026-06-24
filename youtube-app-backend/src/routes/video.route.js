import Router from "express";
import {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getAllVideos);

router.route("/upload-video").post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    uploadVideo
);

router.get("/:videoId", getVideoById);
router.delete("/:videoId", verifyJWT, deleteVideo);
router.patch("/:videoId", verifyJWT, upload.single("thumbnail"), updateVideo);

export default router;
