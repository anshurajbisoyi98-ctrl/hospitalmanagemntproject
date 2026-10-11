const mongoose = require("mongoose");
const Borrowing = require("../models/borrowingModel");
const Book = require("../models/bookModel");
const User = require("../models/userModel");

const borrowingController = {
    issueBook: async (req, res, next) => {
        let session = null;
        let decremented = false;

        try {
            const { userId, bookId, dueDate } = req.body;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    error: { message: "Valid userId is required" }
                });
            }

            if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({
                    error: { message: "Valid bookId is required" }
                });
            }

            if (!dueDate) {
                return res.status(400).json({
                    error: { message: "Due date is required" }
                });
            }

            const parsedDueDate = new Date(dueDate);
            if (Number.isNaN(parsedDueDate.getTime())) {
                return res.status(400).json({
                    error: { message: "Invalid due date format" }
                });
            }

            if (parsedDueDate <= new Date()) {
                return res.status(400).json({
                    error: { message: "Due date must be in the future" }
                });
            }

            // Verify user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    error: { message: "User not found" }
                });
            }

            // Verify book exists
            const book = await Book.findById(bookId);
            if (!book) {
                return res.status(404).json({
                    error: { message: "Book not found" }
                });
            }

            if (book.availableCopies <= 0) {
                return res.status(409).json({
                    error: { message: "No available copies for this book" }
                });
            }

            // Use replica-set/Atlas transaction when supported
            const topology = mongoose.connection?.client?.topology?.description;
            const supportsTransactions = Boolean(
                topology && topology.type !== "Single" && topology.setName
            );

            if (supportsTransactions) {
                session = await mongoose.startSession();
                session.startTransaction();
            }

            const sessionOpt = session ? { session } : {};

            // Check duplicate active loan
            const activeLoan = await (session
                ? Borrowing.findOne({ userId, bookId, status: "issued" }).session(session)
                : Borrowing.findOne({ userId, bookId, status: "issued" }));

            if (activeLoan) {
                if (session) {
                    await session.abortTransaction();
                }
                return res.status(409).json({
                    error: { message: "User already has an active loan for this book" }
                });
            }

            // Atomically decrement stock
            const updatedBook = await Book.findOneAndUpdate(
                { _id: bookId, availableCopies: { $gt: 0 } },
                { $inc: { availableCopies: -1 } },
                { returnDocument: "after", ...sessionOpt }
            );

            if (!updatedBook) {
                if (session) {
                    await session.abortTransaction();
                }
                return res.status(409).json({
                    error: { message: "No available copies for this book" }
                });
            }
            decremented = true;

            // Create borrowing record
            const [borrowing] = await Borrowing.create(
                [
                    {
                        userId,
                        bookId,
                        dueDate: parsedDueDate,
                        status: "issued",
                        issueDate: new Date()
                    }
                ],
                sessionOpt
            );

            if (session) {
                await session.commitTransaction();
            }

            return res.status(201).json({
                data: {
                    borrowing:
                        typeof borrowing.toSafeObject === "function"
                            ? borrowing.toSafeObject()
                            : borrowing,
                    book:
                        typeof updatedBook.toSafeObject === "function"
                            ? updatedBook.toSafeObject()
                            : updatedBook
                }
            });
        } catch (err) {
            if (session) {
                try {
                    await session.abortTransaction();
                } catch {}
            } else if (decremented) {
                // Guaranteed atomic rollback: restore stock if loan creation failed
                try {
                    await Book.findByIdAndUpdate(req.body.bookId, { $inc: { availableCopies: 1 } });
                } catch {}
            }

            if (err.code === 11000) {
                return res.status(409).json({
                    error: { message: "User already has an active loan for this book" }
                });
            }
            return next(err);
        } finally {
            if (session) {
                try {
                    await session.endSession();
                } catch {}
            }
        }
    },

    returnBook: async (req, res, next) => {
        let session = null;
        let returnedUpdated = false;

        try {
            const { id } = req.params;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    error: { message: "Valid borrowing ID is required" }
                });
            }

            const borrowing = await Borrowing.findById(id);
            if (!borrowing) {
                return res.status(404).json({
                    error: { message: "Borrowing record not found" }
                });
            }

            if (borrowing.status !== "issued") {
                return res.status(409).json({
                    error: { message: "Book has already been returned" }
                });
            }

            const topology = mongoose.connection?.client?.topology?.description;
            const supportsTransactions = Boolean(
                topology && topology.type !== "Single" && topology.setName
            );

            if (supportsTransactions) {
                session = await mongoose.startSession();
                session.startTransaction();
            }

            const sessionOpt = session ? { session } : {};

            const returnDate = new Date();
            const updatedBorrowing = await Borrowing.findOneAndUpdate(
                { _id: id, status: "issued" },
                { $set: { status: "returned", returnDate } },
                { returnDocument: "after", ...sessionOpt }
            );

            if (!updatedBorrowing) {
                if (session) {
                    await session.abortTransaction();
                }
                return res.status(409).json({
                    error: { message: "Book has already been returned" }
                });
            }
            returnedUpdated = true;

            const updatedBook = await Book.findByIdAndUpdate(
                borrowing.bookId,
                { $inc: { availableCopies: 1 } },
                { returnDocument: "after", ...sessionOpt }
            );

            if (!updatedBook) {
                if (session) {
                    await session.abortTransaction();
                } else {
                    await Borrowing.findByIdAndUpdate(id, {
                        $set: { status: "issued", returnDate: null }
                    });
                }
                return res.status(404).json({
                    error: { message: "Book not found" }
                });
            }

            if (session) {
                await session.commitTransaction();
            }

            return res.status(200).json({
                data: {
                    borrowing:
                        typeof updatedBorrowing.toSafeObject === "function"
                            ? updatedBorrowing.toSafeObject()
                            : updatedBorrowing,
                    book:
                        typeof updatedBook.toSafeObject === "function"
                            ? updatedBook.toSafeObject()
                            : updatedBook
                }
            });
        } catch (err) {
            if (session) {
                try {
                    await session.abortTransaction();
                } catch {}
            } else if (returnedUpdated) {
                // Guaranteed atomic rollback: revert borrowing status back to issued if stock restoration failed
                try {
                    await Borrowing.findByIdAndUpdate(req.params.id, {
                        $set: { status: "issued", returnDate: null }
                    });
                } catch {}
            }
            return next(err);
        } finally {
            if (session) {
                try {
                    await session.endSession();
                } catch {}
            }
        }
    },

    getBorrowings: async (req, res, next) => {
        try {
            const query = {};

            if (req.user.role === "Admin") {
                if (req.query.userId) {
                    query.userId = req.query.userId;
                }
            } else {
                query.userId = req.user.id;
            }

            if (req.query.bookId) {
                query.bookId = req.query.bookId;
            }

            if (req.query.status) {
                query.status = req.query.status;
            }

            const borrowings = await Borrowing.find(query).sort({ createdAt: -1 });

            const data = borrowings.map((b) =>
                typeof b.toSafeObject === "function"
                    ? b.toSafeObject()
                    : {
                          id: (b._id || b.id)?.toString(),
                          bookId: b.bookId,
                          userId: b.userId,
                          issueDate: b.issueDate,
                          dueDate: b.dueDate,
                          returnDate: b.returnDate,
                          status: b.status,
                          createdAt: b.createdAt,
                          updatedAt: b.updatedAt
                      }
            );

            return res.status(200).json({ data });
        } catch (err) {
            return next(err);
        }
    }
};

module.exports = borrowingController;
