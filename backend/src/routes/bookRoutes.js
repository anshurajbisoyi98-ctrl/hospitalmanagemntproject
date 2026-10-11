const express = require("express");
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");
const {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
} = require("../controllers/bookController");

const router = express.Router();

router.use(authenticateUser);

router.get("/", getBooks);
router.get("/:id", getBookById);

// Admin-only mutation routes
router.post("/", requireAdmin, createBook);
router.put("/:id", requireAdmin, updateBook);
router.delete("/:id", requireAdmin, deleteBook);

module.exports = router;
