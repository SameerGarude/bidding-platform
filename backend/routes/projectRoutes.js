const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();
const {
  createProject,
  getAllProjects,
  getOpenProjectsForSeller,
  getProjectsByBuyer,
  getProjectById,
  selectSeller,
  completeProject,
  deliverProject,
  getSellerProjects,
  awardBid,
} = require("../controllers/projectController");
const { sendEmail } = require("../utils/email");
const bidController = require("../controllers/bidController");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, createProject);
router.get("/", authMiddleware, getAllProjects);

router.get("/open", authMiddleware, getSellerProjects);
router.get("/open", authMiddleware, getOpenProjectsForSeller);

router.get("/open", authMiddleware, async (req, res) => {
  const sellerId = req.user.userId;
  console.log("🔍 Logged-in seller ID:", sellerId);

  try {
    const projects = await prisma.project.findMany({
      where: {
        status: "PENDING",
        sellerId: null,
        NOT: {
          bids: {
            some: {
              sellerId: sellerId,
            },
          },
        },
      },
      include: { bids: true },
    });

    res.json(projects); // ✅ Now it's correctly placed
  } catch (error) {
    console.error("Error fetching open projects:", error);
    res.status(400).json({ message: "Bad Request", error: error.message });
  }
});

//Create a POST route to submit a bid:
router.post("/bids", authMiddleware, async (req, res) => {
  const { projectId, amount, etaDays, message } = req.body;
  const sellerId = req.user.userId;

  const bid = await prisma.bid.create({
    data: {
      sellerId,
      projectId,
      amount,
      etaDays,
      message,
    },
  });

  res.status(201).json({ message: "Bid placed successfully", bid });
});

// Get projects by buyerId (protected route)
router.get("/buyer/:buyerId", authMiddleware, getProjectsByBuyer);

// Protected: Place bid - only SELLER
router.post("/:projectId/bid", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "SELLER") {
    return res.status(403).json({ message: "Only sellers can place bids" });
  }
  bidController.placeBid(req, res, next);
});

// ✅ Test email route
// router.get("/test-email", async (req, res) => {
//   try {
//     await sendEmail({
//       to: "your-other-email@gmail.com",
//       subject: "Test Email",
//       text: "This is a test email from your project system.",
//     });
//     res.send("✅ Email sent!");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("❌ Email failed");
//   }
// });

// Protected: Create new project - only BUYER
router.post("/", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "BUYER") {
    return res.status(403).json({ message: "Only buyers can create projects" });
  }
  createProject(req, res, next);
});
// Get all projects
router.get("/", getAllProjects);

// Get all projects with buyer details
router.get("/", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get all projects posted by a buyer
router.get("/buyer/:buyerId", async (req, res) => {
  const buyerId = Number(req.params.buyerId);

  try {
    const projects = await prisma.project.findMany({
      where: { buyerId },
      include: {
        bids: {
          include: { seller: true },
        },
      },
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching buyer projects:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get project by ID (with bids)
router.get("/:id", getProjectById);

// Protected: Select seller for project - only BUYER and must own project
router.put("/:id/select-seller", authMiddleware, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const user = req.user;

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project || project.buyerId !== user.userId) {
    return res.status(403).json({
      message: "You are not authorized to select seller for this project",
    });
  }
  if (user.role !== "BUYER") {
    return res.status(403).json({ message: "Only buyers can select sellers" });
  }

  // Call controller function
  return selectSeller(req, res);
});

// Get project by ID with all bids and seller info
router.get("/:id", async (req, res) => {
  const projectId = Number(req.params.id);

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bids: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Award project to seller (update sellerId & status)
router.post("/:id/award", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { sellerId } = req.body;

  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid sellerId or projectId" });
  }

  if (!sellerId || isNaN(sellerId)) {
    return res.status(400).json({ error: "Invalid sellerId or projectId" });
  }

  try {
    // Update project with seller and status
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        sellerId: sellerId, // ✅ this must be set
        assignedSellerId: sellerId,
        status: "IN_PROGRESS",
      },
    });

    // Fetch seller to send notification
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    // Send email notification
    if (seller && seller.email) {
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
});

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads (you can adjust to Cloudinary/S3 later)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post(
  "/:id/deliver",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const fileUrl = `/uploads/${req.file.filename}`;

    try {
      await prisma.project.update({
        where: { id: Number(id) },
        data: {
          status: "DELIVERED",
          deliverableUrl: fileUrl,
        },
      });

      res.json({ message: "Deliverable submitted successfully", fileUrl });
    } catch (err) {
      res.status(500).json({ error: "Delivery failed" });
    }
  }
);

// Protected: Deliver project - only assigned SELLER
// router.put("/:id/deliver", authMiddleware, async (req, res) => {
//   const projectId = parseInt(req.params.id);
//   const user = req.user;

//   const project = await prisma.project.findUnique({ where: { id: projectId } });

//   if (!project || project.sellerId !== user.userId) {
//     return res
//       .status(403)
//       .json({ message: "You are not authorized to deliver this project" });
//   }
//   if (user.role !== "SELLER") {
//     return res
//       .status(403)
//       .json({ message: "Only sellers can deliver projects" });
//   }

//   return deliverProject(req, res);
// });

//route to mark project as complete

router.put("/:id/complete", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: { status: "COMPLETED" },
      include: {
        buyer: true,
        seller: true, // ✅ Correct field
      },
    });

    // console.log("✅ Project fetch successful:");
    // console.log("📦 project.id:", project.id);
    // console.log("👤 buyerId:", project.buyerId);
    // console.log("👤 sellerId:", project.sellerId);
    // console.log("👤 assignedSellerId:", project.assignedSellerId);
    // console.log(
    //   "📬 buyer:",
    //   project.buyer ? project.buyer.email : "❌ Missing buyer"
    // );
    // console.log(
    //   "📬 seller:",
    //   project.seller ? project.seller.email : "❌ Missing seller"
    // );

    // if (!project.buyer || !project.seller) {
    //   console.error("❌ Project is not yet awarded to a seller");
    //   return res
    //     .status(400)
    //     .json({ error: "Project has not been awarded to any seller yet" });
    // }

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
    } catch (emailErr) {
      console.error("📧 Email sending error:", emailErr);
    }

    return res.status(200).json({
      message: "Project marked as completed and email sent",
      project,
    });
  } catch (error) {
    console.error("🔥 Completion error:", error);
    return res.status(500).json({ error: "Completion failed" });
  }
});

router.get("/:id/download", authMiddleware, async (req, res) => {
  // console.log("Headers received:", req.headers); //
  const projectId = parseInt(req.params.id);
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the buyer can download
    if (project.buyerId !== userId || userRole !== "BUYER") {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    if (!project.deliverableUrl) {
      return res.status(400).json({ error: "No file to download" });
    }

    // Ensure correct path resolution from project root
    // const filePath = path.join(__dirname, "..", project.deliverableUrl);
    const filePath = path.resolve(
      "uploads",
      path.basename(project.deliverableUrl)
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    // res.download(filePath, path.basename(filePath));
    // console.log("📁 Sending file from:", filePath);

    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: "Error during file download" });
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error during download" });
  }
});

module.exports = router;
