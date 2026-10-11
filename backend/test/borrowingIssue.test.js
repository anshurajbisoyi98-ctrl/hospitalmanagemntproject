const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const readConfig = require("../src/config/env");
const createApp = require("../src/app");
const User = require("../src/models/userModel");
const Book = require("../src/models/bookModel");
const Borrowing = require("../src/models/borrowingModel");

const env = {
    MONGO_URI: "mongodb://localhost/library",
    JWT_SECRET: "x".repeat(32),
    FRONTEND_URL: "http://localhost:5173"
};

const adminToken = jwt.sign(
    { id: "60d5ecb8b5c9c61234567801", email: "admin@library.org", role: "Admin" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
);

const userToken = jwt.sign(
    { id: "60d5ecb8b5c9c61234567802", email: "student@library.org", role: "User" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
);

test("GET /api/users enforces Admin access and returns minimal borrower list", async (t) => {
    const origFind = User.find;
    t.after(() => {
        User.find = origFind;
    });

    User.find = () => ({
        sort: async () => [
            { _id: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567802"), name: "Alice", email: "alice@test.com", role: "User" },
            { _id: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567803"), name: "Bob", email: "bob@test.com", role: "User" }
        ]
    });

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/users`;

    // 1. Unauthenticated -> 401
    const resNoAuth = await fetch(url);
    assert.equal(resNoAuth.status, 401);

    // 2. Regular User -> 403 Forbidden
    const resUser = await fetch(url, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(resUser.status, 403);

    // 3. Admin -> 200 OK
    const resAdmin = await fetch(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resAdmin.status, 200);
    const body = await resAdmin.json();
    assert.equal(body.data.length, 2);
    assert.deepEqual(body.data[0], {
        id: "60d5ecb8b5c9c61234567802",
        name: "Alice",
        email: "alice@test.com",
        role: "User"
    });
});

test("POST /api/borrowings validates inputs and enforces role permission", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings`;

    // 1. Unauthenticated -> 401
    const resNoAuth = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    assert.equal(resNoAuth.status, 401);

    // 2. Regular User -> 403
    const resUser = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({})
    });
    assert.equal(resUser.status, 403);

    // 3. Missing/invalid userId
    const resInvalidUser = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: "invalid-id", bookId: "60d5ecb8b5c9c61234567804", dueDate: "2026-12-31" })
    });
    assert.equal(resInvalidUser.status, 400);

    // 4. Past dueDate
    const resPastDate = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            userId: "60d5ecb8b5c9c61234567802",
            bookId: "60d5ecb8b5c9c61234567804",
            dueDate: "2020-01-01"
        })
    });
    assert.equal(resPastDate.status, 400);
});

test("POST /api/borrowings handles missing records, unavailable stock, and duplicate active loans", async (t) => {
    const origFindUser = User.findById;
    const origFindBook = Book.findById;
    const origFindBorrowing = Borrowing.findOne;
    t.after(() => {
        User.findById = origFindUser;
        Book.findById = origFindBook;
        Borrowing.findOne = origFindBorrowing;
    });

    const validUserId = "60d5ecb8b5c9c61234567802";
    const validBookId = "60d5ecb8b5c9c61234567804";
    const futureDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings`;

    // 1. User not found -> 404
    User.findById = async () => null;
    const resUserNotFound = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: validUserId, bookId: validBookId, dueDate: futureDueDate })
    });
    assert.equal(resUserNotFound.status, 404);

    // 2. Book not found -> 404
    User.findById = async () => ({ _id: validUserId });
    Book.findById = async () => null;
    const resBookNotFound = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: validUserId, bookId: validBookId, dueDate: futureDueDate })
    });
    assert.equal(resBookNotFound.status, 404);

    // 3. Duplicate active loan -> 409 Conflict
    Book.findById = async () => ({ _id: validBookId, availableCopies: 3 });
    Borrowing.findOne = () => ({
        session: async () => ({ _id: "loan_1", status: "issued" })
    });
    const origStartSession1 = mongoose.startSession;
    mongoose.startSession = async () => ({
        startTransaction: () => {},
        abortTransaction: async () => {},
        endSession: async () => {}
    });
    t.after(() => {
        mongoose.startSession = origStartSession1;
    });
    const resDuplicateLoan = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: validUserId, bookId: validBookId, dueDate: futureDueDate })
    });
    assert.equal(resDuplicateLoan.status, 409);
    assert.deepEqual(await resDuplicateLoan.json(), {
        error: { message: "User already has an active loan for this book" }
    });

    // 4. No stock available -> 409 Conflict
    Borrowing.findOne = () => Object.assign(Promise.resolve(null), { session: async () => null });
    Book.findById = async () => ({ _id: validBookId, availableCopies: 0 });
    const resNoStock = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: validUserId, bookId: validBookId, dueDate: futureDueDate })
    });
    assert.equal(resNoStock.status, 409);
    assert.deepEqual(await resNoStock.json(), {
        error: { message: "No available copies for this book" }
    });
});

test("POST /api/borrowings successfully issues book, decrements availableCopies, and returns 201", async (t) => {
    const origFindUser = User.findById;
    const origFindBook = Book.findById;
    const origFindBorrowing = Borrowing.findOne;
    const origFindAndUpdate = Book.findOneAndUpdate;
    const origCreateBorrowing = Borrowing.create;
    const origStartSession = mongoose.startSession;

    t.after(() => {
        User.findById = origFindUser;
        Book.findById = origFindBook;
        Borrowing.findOne = origFindBorrowing;
        Book.findOneAndUpdate = origFindAndUpdate;
        Borrowing.create = origCreateBorrowing;
        mongoose.startSession = origStartSession;
    });

    mongoose.startSession = async () => ({
        startTransaction: () => {},
        commitTransaction: async () => {},
        abortTransaction: async () => {},
        endSession: async () => {}
    });

    const validUserId = "60d5ecb8b5c9c61234567802";
    const validBookId = "60d5ecb8b5c9c61234567804";
    const futureDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    User.findById = async () => new User({
        _id: validUserId,
        name: "Student One",
        email: "student@test.com",
        passwordHash: "hash",
        role: "User"
    });

    Book.findById = async () => new Book({
        _id: validBookId,
        title: "Clean Code",
        author: "Robert C. Martin",
        ISBN: "9780132350884",
        category: "Software",
        totalCopies: 5,
        availableCopies: 2
    });

    Borrowing.findOne = () => Object.assign(Promise.resolve(null), { session: async () => null });

    let decremented = false;
    Book.findOneAndUpdate = async () => {
        decremented = true;
        return new Book({
            _id: validBookId,
            title: "Clean Code",
            author: "Robert C. Martin",
            ISBN: "9780132350884",
            category: "Software",
            totalCopies: 5,
            availableCopies: 1 // decremented
        });
    };

    let createdLoan = null;
    Borrowing.create = async ([args]) => {
        createdLoan = args;
        return [
            new Borrowing({
                _id: "60d5ecb8b5c9c61234567899",
                ...args
            })
        ];
    };

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: validUserId, bookId: validBookId, dueDate: futureDueDate })
    });

    assert.equal(response.status, 201);
    const body = await response.json();

    assert.ok(decremented, "Book availableCopies was decremented");
    assert.ok(createdLoan, "Borrowing record was created");
    assert.equal(createdLoan.status, "issued");
    assert.equal(body.data.book.availableCopies, 1);
    assert.equal(body.data.borrowing.status, "issued");
    assert.equal(body.data.borrowing.bookId, validBookId);
});
