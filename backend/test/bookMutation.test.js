const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const readConfig = require("../src/config/env");
const createApp = require("../src/app");
const Book = require("../src/models/bookModel");
const Borrowing = require("../src/models/borrowingModel");

const env = {
    MONGO_URI: "mongodb://localhost/library",
    JWT_SECRET: "x".repeat(32),
    FRONTEND_URL: "http://localhost:5173"
};

const makeToken = (role = "Admin") => {
    return jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), email: "admin@test.com", role },
        env.JWT_SECRET,
        { expiresIn: "1h" }
    );
};

test("POST /api/books enforces Admin role (403 for User)", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const userToken = makeToken("User");
    const url = `http://localhost:${server.address().port}/api/books`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ title: "Test" })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.message, "Admin access required");
});

test("POST /api/books validates required fields with 400", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const adminToken = makeToken("Admin");
    const url = `http://localhost:${server.address().port}/api/books`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ title: "Only Title" })
    });

    assert.equal(res.status, 400);
});

test("POST /api/books rejects duplicate ISBN with 409", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const origFindOne = Book.findOne;
    Book.findOne = async () => ({ ISBN: "978-0132350884" });
    t.after(() => { Book.findOne = origFindOne; });

    const adminToken = makeToken("Admin");
    const url = `http://localhost:${server.address().port}/api/books`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            title: "Clean Code",
            author: "Robert C. Martin",
            ISBN: "978-0132350884",
            category: "Technology",
            totalCopies: 5
        })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.message, "A book with this ISBN already exists");
});

test("PUT /api/books/:id rejects reducing totalCopies below active loans", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const bookId = new mongoose.Types.ObjectId();
    const fakeBook = {
        _id: bookId,
        title: "Test",
        totalCopies: 5,
        availableCopies: 2, // 3 active loans
        save: async () => {}
    };

    const origFindById = Book.findById;
    Book.findById = async () => fakeBook;
    t.after(() => { Book.findById = origFindById; });

    const adminToken = makeToken("Admin");
    const url = `http://localhost:${server.address().port}/api/books/${bookId}`;
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ totalCopies: 2 }) // less than 3 active loans
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /Cannot reduce total copies below active loans/);
});

test("DELETE /api/books/:id rejects deleting book with active loans with 409", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const bookId = new mongoose.Types.ObjectId();
    const fakeBook = { _id: bookId };

    const origFindById = Book.findById;
    const origCount = Borrowing.countDocuments;
    Book.findById = async () => fakeBook;
    Borrowing.countDocuments = async () => 2; // 2 active loans
    t.after(() => {
        Book.findById = origFindById;
        Borrowing.countDocuments = origCount;
    });

    const adminToken = makeToken("Admin");
    const url = `http://localhost:${server.address().port}/api/books/${bookId}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.message, "Cannot delete book with active loans");
});

test("DELETE /api/books/:id returns 204 when no active loans exist", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const bookId = new mongoose.Types.ObjectId();
    const fakeBook = { _id: bookId };

    const origFindById = Book.findById;
    const origCount = Borrowing.countDocuments;
    const origDelete = Book.findByIdAndDelete;

    Book.findById = async () => fakeBook;
    Borrowing.countDocuments = async () => 0;
    Book.findByIdAndDelete = async () => fakeBook;

    t.after(() => {
        Book.findById = origFindById;
        Borrowing.countDocuments = origCount;
        Book.findByIdAndDelete = origDelete;
    });

    const adminToken = makeToken("Admin");
    const url = `http://localhost:${server.address().port}/api/books/${bookId}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 204);
});
