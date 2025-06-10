const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  res.status(201).json({ message: "User registered successfully" });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

router.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: `Hello user ${req.user.userId}, role: ${req.user.role}`,
  });
});

module.exports = router;
