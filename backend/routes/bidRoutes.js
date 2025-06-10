const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendEmail } = require("../utils/email");
const authMiddleware = require("../middleware/authMiddleware");

// Get all bids for a project
router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const bids = await prisma.bid.findMany({
      where: { projectId: Number(projectId) },
      include: { seller: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all bids by seller - only SELLER themselves
router.get("/seller/:sellerId", authMiddleware, async (req, res) => {
  const sellerId = Number(req.params.sellerId);

  if (req.user.userId !== sellerId && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Unauthorized access" });
  }

  try {
    const bids = await prisma.bid.findMany({
      where: { sellerId },
      include: { project: true },
    });
    res.json(bids);
  } catch (error) {
    console.error("Error fetching seller bids:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Accept a bid - only BUYER who owns the project
router.put("/accept/:bidId", authMiddleware, async (req, res) => {
  const bidId = Number(req.params.bidId);

  try {
    // Find bid with project
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true, seller: true },
    });

    if (!bid) return res.status(404).json({ message: "Bid not found" });

    if (req.user.role !== "BUYER" || req.user.userId !== bid.project.buyerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to accept this bid" });
    }

    const updatedBid = await prisma.bid.update({
      where: { id: bidId },
      data: { isAccepted: true },
      include: { seller: true, project: true },
    });

    // Update project status
    await prisma.project.update({
      where: { id: bid.projectId },
      data: { status: "IN_PROGRESS", sellerId: bid.sellerId },
    });

    // Send email to seller
    await sendEmail({
      to: updatedBid.seller.email,
      subject: `Your bid was accepted!`,
      text: `Hi ${updatedBid.seller.name},\n\nYour bid on project "${updatedBid.project.title}" was accepted!`,
    });

    res.json({ message: "Bid accepted successfully", bid: updatedBid });
  } catch (error) {
    console.error("Error accepting bid:", error);
    res.status(500).json({ error: "Failed to accept bid" });
  }
});

// ✅ Route: Submit a new bid on a project
// POST /api/bids
// POST /api/bids
// POST /api/bids
router.post("/", authMiddleware, async (req, res) => {
  const { projectId, amount, estimatedTime, message } = req.body;
  const sellerId = req.user.userId;

  const parsedProjectId = Number(projectId);
  const parsedAmount = Number(amount);
  const parsedEstimatedTime = estimatedTime ? Number(estimatedTime) : null;

  if (!parsedProjectId || !parsedAmount || !sellerId) {
    return res.status(400).json({ message: "Missing or invalid fields." });
  }

  try {
    const existingBid = await prisma.bid.findFirst({
      where: { projectId: parsedProjectId, sellerId },
    });

    if (existingBid) {
      return res
        .status(400)
        .json({ message: "You have already placed a bid on this project." });
    }

    const newBid = await prisma.bid.create({
      data: {
        projectId: parsedProjectId,
        sellerId,
        bidAmount: parsedAmount,
        estimatedTime: parsedEstimatedTime,
        message,
      },
    });

    return res
      .status(201)
      .json({ message: "Bid placed successfully", bid: newBid });
  } catch (err) {
    console.error("❌ Failed to place bid:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
