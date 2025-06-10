const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.addReview = async (req, res) => {
  console.log("Add review request received"); // <-- add this first

  const { projectId } = req.params;
  const { rating, review } = req.body;
  const user = req.user;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
    });

    if (!project || project.buyerId !== user.userId) {
      console.log("Unauthorized: Project not found or user is not buyer");
      return res.status(403).json({ message: "Unauthorized to review" });
    }

    if (project.status !== "COMPLETED") {
      console.log("Project status is not COMPLETED:", project.status);
      return res
        .status(400)
        .json({ message: "Only completed projects can be reviewed" });
    }

    if (!project.sellerId) {
      console.log("Project has no selected seller");
      return res
        .status(400)
        .json({ message: "Project has no selected seller." });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        projectId: project.id,
        // buyerId: user.userId,
      },
    });

    // console.log("Existing review found:", existingReview);

    if (existingReview) {
      console.log("You already reviewed this project");
      return res
        .status(400)
        .json({ message: "You already reviewed this project" });
    }

    const newReview = await prisma.review.create({
      data: {
        projectId: project.id,
        buyerId: user.userId,
        sellerId: project.sellerId,
        rating: Number(rating),
        review,
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getBuyerProjectsWithReviewStatus = async (req, res) => {
  console.log("getBuyerProjectsWithReviewStatus route hit");

  const user = req.user;

  try {
    const projects = await prisma.project.findMany({
      where: { buyerId: user.userId },
      include: {
        seller: true,
        review: true,
      },
    });

    console.log("✅ Projects fetched:", projects);
    projects.forEach((project) => {
      console.log(`Project ID: ${project.id}`);
      console.log("Review:", project.review);
    });

    const projectsWithReviewFlag = projects.map((project) => ({
      ...project,
      reviewed: !!project.review,
      review: project.review,
    }));
    console.log("✅ Sending Projects to Frontend");
    projectsWithReviewFlag.forEach((p) =>
      console.log(`Project ${p.id}, Reviewed: ${p.reviewed}, Review:`, p.review)
    );

    res.json(projectsWithReviewFlag);
  } catch (error) {
    console.error("Error fetching buyer projects:", error);
    res.status(500).json({ error: "Server error" });
  }
};
