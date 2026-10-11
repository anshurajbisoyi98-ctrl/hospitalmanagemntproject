const demoBooks = [
    {
        title: "Demo: The Hobbit",
        author: "J. R. R. Tolkien",
        ISBN: "9780000000002",
        category: "Fantasy",
        publisher: "Demo Library Press",
        publicationYear: 1937,
        totalCopies: 4,
        availableCopies: 4
    },
    {
        title: "Demo: Pride and Prejudice",
        author: "Jane Austen",
        ISBN: "9780000000019",
        category: "Classics",
        publisher: "Demo Library Press",
        publicationYear: 1813,
        totalCopies: 3,
        availableCopies: 3
    },
    {
        title: "Demo: 1984",
        author: "George Orwell",
        ISBN: "9780000000026",
        category: "Fiction",
        publisher: "Demo Library Press",
        publicationYear: 1949,
        totalCopies: 5,
        availableCopies: 5
    },
    {
        title: "Demo: The Great Gatsby",
        author: "F. Scott Fitzgerald",
        ISBN: "9780000000033",
        category: "Classics",
        publisher: "Demo Library Press",
        publicationYear: 1925,
        totalCopies: 2,
        availableCopies: 2
    },
    {
        title: "Demo: To Kill a Mockingbird",
        author: "Harper Lee",
        ISBN: "9780000000040",
        category: "Fiction",
        publisher: "Demo Library Press",
        publicationYear: 1960,
        totalCopies: 3,
        availableCopies: 3
    },
    {
        title: "Demo: Dune",
        author: "Frank Herbert",
        ISBN: "9780000000057",
        category: "Science Fiction",
        publisher: "Demo Library Press",
        publicationYear: 1965,
        totalCopies: 4,
        availableCopies: 4
    },
    {
        title: "Demo: The Little Prince",
        author: "Antoine de Saint-Exupéry",
        ISBN: "9780000000064",
        category: "Fantasy",
        publisher: "Demo Library Press",
        publicationYear: 1943,
        totalCopies: 2,
        availableCopies: 2
    },
    {
        title: "Demo: Clean Code",
        author: "Robert C. Martin",
        ISBN: "9780000000071",
        category: "Technology",
        publisher: "Demo Library Press",
        publicationYear: 2008,
        totalCopies: 3,
        availableCopies: 3
    }
];

const seedDemoBooks = async (BookModel) => {
    const operations = demoBooks.map((book) => ({
        updateOne: {
            filter: { ISBN: book.ISBN },
            update: { $setOnInsert: book },
            upsert: true
        }
    }));

    const result = await BookModel.bulkWrite(operations, { ordered: false });
    return {
        inserted: result.upsertedCount || 0,
        alreadyPresent: result.matchedCount || 0
    };
};

module.exports = { demoBooks, seedDemoBooks };
