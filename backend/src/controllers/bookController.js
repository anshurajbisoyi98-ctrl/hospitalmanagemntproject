const mongoose = require("mongoose");
const Book = require("../models/bookModel");

const getBooks = async (req, res, next) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        const data = books.map((b) => b.toSafeObject());
        return res.status(200).json({ data });
    } catch (err) {
        return next(err);
    }
};

const getBookById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: { message: "Invalid book ID format" }
            });
        }

        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({
                error: { message: "Book not found" }
            });
        }

        return res.status(200).json({
            data: book.toSafeObject()
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    getBooks,
    getBookById
};
