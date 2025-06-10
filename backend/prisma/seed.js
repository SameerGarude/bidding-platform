const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Clear old data
  await prisma.bid.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const buyer = await prisma.user.create({
    data: {
      name: "Ravi Buyer",
      email: "sameer.21810614@viit.ac.in",
      password: "hashedpassword", // hash in real app
      role: "BUYER",
    },
  });

  const seller = await prisma.user.create({
    data: {
      name: "Priya Seller",
      email: "sugriv.garude@gmail.com",
      password: "hashedpassword", // hash in real app
      role: "SELLER",
    },
  });

  // Create a project
  const project = await prisma.project.create({
    data: {
      title: "Build a Portfolio Website",
      description: "Looking for a dev to build a personal portfolio site.",
      budgetMin: 5000,
      budgetMax: 10000,
      deadline: new Date("2025-06-15"),
      buyerId: buyer.id,
    },
  });

  // Create a bid
  await prisma.bid.create({
    data: {
      sellerId: seller.id,
      projectId: project.id,
      bidAmount: 7000,
      estimatedTime: "5 days",
      message: "I can deliver it within 5 days.",
    },
  });

  console.log("🌱 Seed data inserted successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
