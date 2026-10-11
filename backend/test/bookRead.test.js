const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const readConfig = require("../src/config/env");
const createApp = require("../src/app");
const Book = require("../src/models/bookModel");

const env = {
    MONGO_URI: "mongodb://localhost/library",
    JWT_SECRET: "x".repeat(32),
    FRONTEND_URL: "http://localhost:5173"
};

const makeToken = (role = "User") => {
    return jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), email: "user@test.com", role },
        env.JWT_SECRET,
        { expiresIn: "1h" }
    );
};

test("Book model validation and toSafeObject", () => {
    const book = new Book({
        title: "Dune",
        author: "Frank Herbert",
        ISBN: "978-0441172719",
        category: "Sci-Fi",
        totalCopies: 5,
        availableCopies: 5
    });

    const safe = book.toSafeObject();
    assert.equal(safe.title, "Dune");
    assert.equal(safe.author, "Frank Herbert");
    assert.equal(safe.ISBN, "978-0441172719");
    assert.equal(safe.category, "Sci-Fi");
    assert.equal(safe.totalCopies, 5);
    assert.equal(safe.availableCopies, 5);
    assert.ok(safe.id);
});

test("Book model rejects missing required fields", async () => {
    const emptyBook = new Book({});
    const error = await emptyBook.validate().catch((err) => err);
    assert.ok(error.errors.title);
    assert.ok(error.errors.author);
    assert.ok(error.errors.ISBN);
    assert.ok(error.errors.category);
    assert.ok(error.errors.totalCopies);
    assert.ok(error.errors.availableCopies);
});

test("Book model rejects negative copy counts", async () => {
    const invalidBook = new Book({
        title: "Invalid",
        author: "Author",
        ISBN: "12345",
        category: "Test",
        totalCopies: -1,
        availableCopies: -1
    });
    const error = await invalidBook.validate().catch((err) => err);
    assert.ok(error.errors.totalCopies);
    assert.ok(error.errors.availableCopies);
});

test("GET /api/books rejects unauthenticated requests with 401", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/books`;
    const res = await fetch(url);
    assert.equal(res.status, 401);
});

test("GET /api/books/:id rejects invalid ObjectId format with 400", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const token = makeToken();
    const url = `http://localhost:${server.address().port}/api/books/not-an-id`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.message, "Invalid book ID format");
});

test("GET /api/books/:id returns 404 for nonexistent book", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const token = makeToken();
    const validId = new mongoose.Types.ObjectId().toString();

    // Mock findById returning null
    const origFindById = Book.findById;
    Book.findById = async () => null;
    t.after(() => { Book.findById = origFindById; });

    const url = `http://localhost:${server.address().port}/api/books/${validId}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.message, "Book not found");
});

test("GET /api/books returns list of books for authenticated user", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const token = makeToken();
    const fakeBook = new Book({
        title: "Test Book",
        author: "Test Author",
        ISBN: "978-1111111111",
        category: "Fiction",
        totalCopies: 3,
        availableCopies: 3
    });

    const origFind = Book.find;
    Book.find = () => ({
        sort: () => Promise.resolve([fakeBook])
    });
    t.after(() => { Book.find = origFind; });

    const url = `http://localhost:${server.address().port}/api/books`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].title, "Test Book");
});
