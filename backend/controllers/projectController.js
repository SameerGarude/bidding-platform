const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendEmail } = require("../utils/email");

exports.getSellerProjects = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const projects = await prisma.project.findMany({
      where: {
        sellerId: sellerId,
      },
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getOpenProjectsForSeller = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Optional: Get IDs of projects the seller has already bid on
    const bids = await prisma.bid.findMany({
      where: { sellerId },
      select: { projectId: true },
    });

    const alreadyBidProjectIds = bids.map((bid) => bid.projectId);

    const openProjects = await prisma.project.findMany({
      where: {
        status: "PENDING",
        sellerId: null,
        id: {
          notIn: alreadyBidProjectIds,
        },
      },
    });

    res.json(openProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new project
exports.createProject = async (req, res) => {
  try {
    const { title, description, budgetMin, budgetMax, deadline, buyerId } =
      req.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        budgetMin,
        budgetMax,
        deadline: new Date(req.body.deadline),
        buyerId,
      },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "PENDING" },
    });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single project with bids

exports.getProjectById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10); // Convert string id to number

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const project = await prisma.project.findUnique({
      where: {
        id: id, // Use the parsed number here
      },
      include: {
        bids: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Select seller for a project
exports.selectSeller = async (req, res) => {
  const { id } = req.params;
  const { sellerId } = req.body;

  try {
    const updatedProject = await prisma.project.update({
      where: { id: Number(id) },
      data: {
        sellerId: Number(sellerId),
        status: "IN_PROGRESS",
      },
      include: {
        buyer: true,
        seller: true,
      },
    });

    // Send email to selected seller

    await sendEmail({
      to: updatedProject.seller.email,
      subject: `You have been selected for project "${updatedProject.title}"`,
      text: `Hi ${updatedProject.seller.name},\n\nCongratulations! You have been selected for the project titled "${updatedProject.title}". Please login to your account to see the details and next steps.`,
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error selecting seller:", error);
    res.status(500).json({ error: "Failed to select seller" });
  }
};

exports.placeBid = async (req, res) => {
  const { projectId } = req.params;
  const { sellerId, amount, message } = req.body;

  try {
    console.log("Placing bid with data:", {
      projectId: Number(projectId),
      sellerId: Number(sellerId),
      amount,
      message,
    });

    const bid = await prisma.bid.create({
      data: {
        projectId: Number(projectId),
        sellerId: Number(sellerId),
        bidAmount: Number(amount), // ✅ match schema
        message,
      },

      include: {
        project: {
          include: {
            buyer: true,
          },
        },
        seller: true,
      },
    });

    // ✅ Email notification if buyer exists
    if (bid.project?.buyer?.email) {
      await sendEmail({
        to: bid.project.buyer.email,
        subject: `New Bid on Your Project "${bid.project.title}"`,
        text: `Hi ${bid.project.buyer.name},\n\n${bid.seller.name} has placed a new bid of ₹${bid.amount} on your project titled "${bid.project.title}".\n\nMessage: ${bid.message}`,
      });
    } else {
      console.warn("⚠️ No buyer found for the project. Skipping email.");
    }

    res.status(201).json(bid);
  } catch (error) {
    console.error("Error placing bid:", error);
    res.status(500).json({ error: "Failed to place bid" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        bids: true,
        buyer: true,
      },
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProjectsByBuyer = async (req, res) => {
  const buyerId = parseInt(req.params.buyerId);
  const user = req.user;

  if (isNaN(buyerId)) {
    return res.status(400).json({ message: "Invalid buyerId" });
  }

  if (user.userId !== buyerId && user.role !== "ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    const projects = await prisma.project.findMany({ where: { buyerId } });
    res.json({ projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching projects" });
  }
};

exports.awardProject = async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { sellerId } = req.body;

  await prisma.project.update({
    where: { id: Number(projectId) },
    data: {
      sellerId: sellerId,
      status: "AWARDED",
    },
  });

  if (!sellerId || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid sellerId or projectId" });
  }

  try {
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        sellerId: sellerId, // ✅ this must be set
        assignedSellerId: sellerId,
        status: "IN_PROGRESS",
      },
    });

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (seller?.email) {
      await sendEmail({
        to: seller.email,
        subject: `🎉 You've been awarded the project "${updatedProject.title}"`,
        text: `Hello ${seller.name},\n\nCongratulations! You've been awarded the project titled "${updatedProject.title}". Please begin the work as per your bid.\n\nThanks,\nTeam`,
      });
    }

    res.status(200).json({
      message: "Project awarded successfully and email sent to seller",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error awarding project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.awardBid = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { sellerId } = req.body;

    console.log("Updating project with ID:", projectId);

    if (!sellerId || isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID or seller ID" });
    }

    // 1. Find the project and its bids
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { bids: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 2. Ensure project is in PENDING status
    if (project.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Project is not in PENDING status" });
    }

    // 3. Find the selected bid
    const selectedBid = project.bids.find((bid) => bid.sellerId === sellerId);

    if (!selectedBid) {
      return res
        .status(404)
        .json({ error: "No bid found for this seller on the project" });
    }

    // 4. Reset all bids' isAccepted to false
    await prisma.bid.updateMany({
      where: { projectId },
      data: { isAccepted: false },
    });

    // 5. Mark selected bid as accepted
    await prisma.bid.update({
      where: { id: selectedBid.id },
      data: { isAccepted: true },
    });

    // 6. Update the project with assignedSellerId and status
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "IN_PROGRESS",
        assignedSellerId: sellerId,
        sellerId: sellerId,
      },
    });

    res.json({ message: "🎉 Project awarded successfully", projectId });
  } catch (error) {
    console.error("❌ Error awarding bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const nodemailer = require("nodemailer");

exports.deliverProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`; // Update if using Cloudinary/S3

    const updatedProject = await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        status: "DELIVERED",
        deliverableUrl: fileUrl,
      },
    });

    return res.status(200).json({
      message: "Deliverable uploaded successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error delivering project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Mark project as completed and notify both users
exports.completeProject = async (req, res) => {
  const { id } = req.params;
  console.log("🔄 Attempting to mark project complete, ID:", id);

  try {
    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: { status: "COMPLETED" },
      include: {
        buyer: true,
        seller: true,
      },
    });

    console.log(
      "📬 buyer:",
      project.buyer ? project.buyer.email : "❌ Missing buyer"
    );
    console.log(
      "📬 seller:",
      project.seller ? project.seller.email : "❌ Missing seller"
    );

    if (!project.sellerId || !project.seller) {
      console.error("❌ Project not yet awarded, seller info missing");
      return res
        .status(400)
        .json({ error: "Project has not been awarded to any seller yet" });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: `${project.buyer.email}, ${project.seller.email}`,
      subject: `Project "${project.title}" marked as completed`,
      text: `The project "${project.title}" has been marked as completed.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("📧 Emails sent to:", mailOptions.to);
    } catch (err) {
      console.error("📧 Email send error:", err);
    }

    return res.status(200).json({
      message: "Project marked as completed and email sent",
      project,
    });
  } catch (error) {
    console.error("❌ Error completing project:", error);
    return res.status(500).json({ error: "Failed to complete project" });
  }
};
