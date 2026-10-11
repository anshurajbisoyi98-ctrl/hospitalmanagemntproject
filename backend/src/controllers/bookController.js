const mongoose = require("mongoose");
const Book = require("../models/bookModel");
const Borrowing = require("../models/borrowingModel");

const getBooks = async (req, res, next) => {
    try {
        const { q, category } = req.query;
        const filter = {};

        if (category && typeof category === "string") {
            const cleanCategory = category.trim();
            if (cleanCategory) {
                // Escape regex special characters to treat input as literal text
                const escapedCategory = cleanCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                filter.category = new RegExp(`^${escapedCategory}$`, "i");
            }
        }

        if (q && typeof q === "string") {
            const cleanQ = q.trim();
            if (cleanQ) {
                const escapedQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(escapedQ, "i");
                filter.$or = [
                    { title: regex },
                    { author: regex },
                    { ISBN: regex },
                    { category: regex }
                ];
            }
        }

        const books = await Book.find(filter).sort({ createdAt: -1 });
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

const createBook = async (req, res, next) => {
    try {
        const { title, author, ISBN, category, publisher, publicationYear, totalCopies } = req.body;

        if (!title || !author || !ISBN || !category || totalCopies === undefined) {
            return res.status(400).json({
                error: { message: "Title, author, ISBN, category, and totalCopies are required" }
            });
        }

        const parsedCopies = Number(totalCopies);
        if (!Number.isInteger(parsedCopies) || parsedCopies < 0) {
            return res.status(400).json({
                error: { message: "Total copies must be a non-negative integer" }
            });
        }

        const normalizedIsbn = String(ISBN).trim().toUpperCase();
        const existing = await Book.findOne({ ISBN: normalizedIsbn });
        if (existing) {
            return res.status(409).json({
                error: { message: "A book with this ISBN already exists" }
            });
        }

        const book = new Book({
            title: String(title).trim(),
            author: String(author).trim(),
            ISBN: normalizedIsbn,
            category: String(category).trim(),
            publisher: publisher ? String(publisher).trim() : "",
            publicationYear: publicationYear ? Number(publicationYear) : undefined,
            totalCopies: parsedCopies,
            availableCopies: parsedCopies
        });

        await book.save();

        return res.status(201).json({
            data: book.toSafeObject()
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: { message: "A book with this ISBN already exists" }
            });
        }
        return next(err);
    }
};

const updateBook = async (req, res, next) => {
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

        const { title, author, category, publisher, publicationYear, totalCopies } = req.body;

        if (title !== undefined) book.title = String(title).trim();
        if (author !== undefined) book.author = String(author).trim();
        if (category !== undefined) book.category = String(category).trim();
        if (publisher !== undefined) book.publisher = String(publisher).trim();
        if (publicationYear !== undefined) book.publicationYear = Number(publicationYear);

        if (totalCopies !== undefined) {
            const newTotal = Number(totalCopies);
            if (!Number.isInteger(newTotal) || newTotal < 0) {
                return res.status(400).json({
                    error: { message: "Total copies must be a non-negative integer" }
                });
            }

            // Calculate active loans to preserve inventory balance
            const activeLoans = book.totalCopies - book.availableCopies;
            if (newTotal < activeLoans) {
                return res.status(400).json({
                    error: { message: `Cannot reduce total copies below active loans (${activeLoans})` }
                });
            }

            book.totalCopies = newTotal;
            book.availableCopies = newTotal - activeLoans;
        }

        await book.save();

        return res.status(200).json({
            data: book.toSafeObject()
        });
    } catch (err) {
        return next(err);
    }
};

const deleteBook = async (req, res, next) => {
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

        // Check if active loans exist
        const activeLoanCount = await Borrowing.countDocuments({
            bookId: book._id,
            status: "issued"
        });

        if (activeLoanCount > 0) {
            return res.status(409).json({
                error: { message: "Cannot delete book with active loans" }
            });
        }

        await Book.findByIdAndDelete(id);

        return res.status(204).send();
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
};
