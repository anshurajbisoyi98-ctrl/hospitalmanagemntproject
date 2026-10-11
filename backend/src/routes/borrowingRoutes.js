const express = require("express");
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");
const borrowingController = require("../controllers/borrowingController");

const router = express.Router();

router.post("/", authenticateUser, requireAdmin, borrowingController.issueBook);
router.get("/", authenticateUser, borrowingController.getBorrowings);
router.patch("/:id/return", authenticateUser, requireAdmin, borrowingController.returnBook);

module.exports = router;
