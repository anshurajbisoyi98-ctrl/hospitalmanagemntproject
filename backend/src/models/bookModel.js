const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },
        author: {
            type: String,
            required: [true, "Author is required"],
            trim: true
        },
        ISBN: {
            type: String,
            required: [true, "ISBN is required"],
            unique: true,
            trim: true,
            uppercase: true
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true
        },
        publisher: {
            type: String,
            trim: true,
            default: ""
        },
        publicationYear: {
            type: Number
        },
        totalCopies: {
            type: Number,
            required: [true, "Total copies is required"],
            min: [0, "Total copies cannot be negative"]
        },
        availableCopies: {
            type: Number,
            required: [true, "Available copies is required"],
            min: [0, "Available copies cannot be negative"]
        }
    },
    {
        timestamps: true
    }
);

bookSchema.methods.toSafeObject = function () {
    return {
        id: this._id.toString(),
        title: this.title,
        author: this.author,
        ISBN: this.ISBN,
        category: this.category,
        publisher: this.publisher,
        publicationYear: this.publicationYear,
        totalCopies: this.totalCopies,
        availableCopies: this.availableCopies,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
