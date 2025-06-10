const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetProjects() {
  try {
    // Delete all reviews first (since Review has projectId FK)
    await prisma.review.deleteMany();

    // Delete all bids (since Bid has projectId FK)
    await prisma.bid.deleteMany();

    // Then delete all projects
    await prisma.project.deleteMany();

    console.log("All projects, bids, and reviews deleted successfully.");

    // Now create new projects (example)
    // await prisma.project.create({
    //   data: {
    //     title: "New Project 1",
    //     description: "Description for project 1",
    //     budgetMin: 1000,
    //     budgetMax: 2000,
    //     deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    //     buyerId: 1, // Adjust to valid buyer user ID
    //     status: "PENDING",
    //   },
    // });

    // Add more projects as needed...

    console.log("New projects created successfully.");
  } catch (err) {
    console.error("Error resetting projects:", err);
  } finally {
    await prisma.$disconnect();
  }
}

resetProjects();
