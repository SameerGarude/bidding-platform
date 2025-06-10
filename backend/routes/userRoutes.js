const express = require("express");
const router = express.Router();
const {
  getUsers,
  registerUser,
  loginUser,
} = require("../controllers/userController");

router.get("/", getUsers);
router.post("/", registerUser);
router.post("/login", loginUser);

module.exports = router;
