const express = require("express");
const { authenticateUser } = require("../middleware/authMiddleware");
const { getBooks, getBookById } = require("../controllers/bookController");

const router = express.Router();

router.use(authenticateUser);

router.get("/", getBooks);
router.get("/:id", getBookById);

module.exports = router;
