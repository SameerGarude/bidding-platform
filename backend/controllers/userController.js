// controllers/userController.js
/* -------------------------------------------------
   User registration & authentication controller
   Uses Prisma, bcryptjs for hashing and jsonwebtoken
--------------------------------------------------*/
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ⚠️  keep this key in .env in real projects!
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

/* ---------- GET  /api/users  ------------------- */
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

/* ---------- POST /api/users  (register) -------- */
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // 1. unique e-mail check
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    // 2. hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3. create
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

/* ---------- POST /api/users/login  ------------- */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email & password required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // compare hashed pw
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // generate JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = { getUsers, registerUser, loginUser };
