const express = require("express");
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/", authenticateUser, requireAdmin, userController.getBorrowers);

module.exports = router;
