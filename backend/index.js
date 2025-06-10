const express = require("express");
const app = express();
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
app.use(cors({ origin: "http://localhost:3000" }));
const path = require("path");

// Serve static files

const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const bidRoutes = require("./routes/bidRoutes");
const authRoutes = require("./routes/auth");

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/bids", bidRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/reviews", require("./routes/reviewRoutes"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
