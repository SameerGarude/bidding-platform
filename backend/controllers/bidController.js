const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendEmail } = require("../utils/email");

exports.placeBid = async (req, res) => {
  const { projectId } = req.params;
  const { amount, proposal, estimatedTime, message } = req.body;
  const sellerId = req.user.userId;

  // Debug logging
  console.log("Received bid:", {
    projectId,
    sellerId,
    amount,
    proposal,
    estimatedTime,
    message,
  });

  // Validate input
  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project id" });
  }
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: "Invalid bid amount" });
  }

  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: { buyer: true },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check for duplicate bid by the same seller
    const existingBid = await prisma.bid.findFirst({
      where: {
        projectId: Number(projectId),
        sellerId: Number(sellerId),
      },
    });

    if (existingBid) {
      return res
        .status(400)
        .json({ message: "You have already placed a bid on this project." });
    }

    // Create bid
    const bid = await prisma.bid.create({
      data: {
        projectId: Number(projectId),
        sellerId: Number(sellerId),
        bidAmount: Number(amount),
        message,
        estimatedTime,
        proposal,
      },
      include: {
        project: { include: { buyer: true } },
        seller: true,
      },
    });

    // Send email to buyer
    await sendEmail({
      to: bid.project.buyer.email,
      subject: `New Bid on Your Project "${bid.project.title}"`,
      text: `Hi ${bid.project.buyer.name},\n\n${bid.seller.name} has placed a new bid of ₹${bid.bidAmount} on your project titled "${bid.project.title}".\n\nMessage: ${bid.message}`,
    });

    res.status(201).json({ message: "Bid placed successfully", bid });
  } catch (error) {
    console.error("Error placing bid:", error);
    res.status(500).json({ error: "Failed to place bid" });
  }
};

// GET All Bids for a Project
exports.getBidsForProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const bids = await prisma.bid.findMany({
      where: { projectId: Number(projectId) },
      include: {
        seller: true, // show who placed the bid
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Failed to fetch bids" });
  }
};

//Accept a bid
exports.acceptBid = async (req, res) => {
  const { bidId } = req.params;

  try {
    const bid = await prisma.bid.update({
      where: { id: Number(bidId) },
      data: { isAccepted: true },
      include: {
        seller: true,
        project: true,
      },
    });

    await prisma.project.update({
      where: { id: bid.projectId },
      data: { status: "IN_PROGRESS" },
    });

    await sendEmail({
      to: bid.seller.email,
      subject: `Your bid was accepted!`,
      text: `Hi ${bid.seller.name},\n\nYour bid on project "${bid.project.title}" was accepted!`,
    });

    res.status(200).json({ message: "Bid accepted successfully", bid });
  } catch (error) {
    console.error("Error accepting bid:", error);
    res.status(500).json({ error: "Failed to accept bid" });
  }
};

//get bids from seller
exports.getBidsBySeller = async (req, res) => {
  const { sellerId } = req.params;

  try {
    const bids = await prisma.bid.findMany({
      where: { sellerId: Number(sellerId) },
      include: { project: true },
    });

    res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching seller bids:", error);
    res.status(500).json({ error: "Failed to fetch seller bids" });
  }
};
