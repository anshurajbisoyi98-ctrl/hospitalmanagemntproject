const mongoose = require("mongoose");

const borrowingSchema = new mongoose.Schema(
    {
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: [true, "Book ID is required"]
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"]
        },
        issueDate: {
            type: Date,
            default: Date.now,
            required: true
        },
        dueDate: {
            type: Date,
            required: [true, "Due date is required"]
        },
        returnDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ["issued", "returned"],
            default: "issued"
        }
    },
    {
        timestamps: true
    }
);

borrowingSchema.index(
    { userId: 1, bookId: 1 },
    { unique: true, partialFilterExpression: { status: "issued" } }
);

borrowingSchema.methods.toSafeObject = function () {
    return {
        id: this._id.toString(),
        bookId: this.bookId,
        userId: this.userId,
        issueDate: this.issueDate,
        dueDate: this.dueDate,
        returnDate: this.returnDate,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

const Borrowing = mongoose.model("Borrowing", borrowingSchema);

module.exports = Borrowing;
