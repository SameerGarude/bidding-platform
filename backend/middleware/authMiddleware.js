const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "⚠️ Warning: JWT_SECRET is not defined in environment variables"
  );
}

const authMiddleware = (req, res, next) => {
  // console.log("Headers received:", req.headers);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error("❌ Authorization header missing");
    return res
      .status(401)
      .json({ message: "Unauthorized: No Authorization header" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.error("❌ Authorization header does not start with 'Bearer '");
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid Authorization format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
};

module.exports = authMiddleware;
