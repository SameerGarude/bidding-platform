const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/:projectId", authMiddleware, reviewController.addReview);
router.get(
  "/buyer",
  authMiddleware,
  reviewController.getBuyerProjectsWithReviewStatus
);

module.exports = router;
