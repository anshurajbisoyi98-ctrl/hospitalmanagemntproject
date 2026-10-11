const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const readConfig = require("../src/config/env");
const createApp = require("../src/app");
const Book = require("../src/models/bookModel");
const Borrowing = require("../src/models/borrowingModel");

const env = {
    MONGO_URI: "mongodb://localhost/library",
    JWT_SECRET: "x".repeat(32),
    FRONTEND_URL: "http://localhost:5173"
};

const adminUser = { id: "60d5ecb8b5c9c61234567801", email: "admin@library.org", role: "Admin" };
const regularUserA = { id: "60d5ecb8b5c9c61234567802", email: "student_a@library.org", role: "User" };
const regularUserB = { id: "60d5ecb8b5c9c61234567803", email: "student_b@library.org", role: "User" };

const adminToken = jwt.sign(adminUser, env.JWT_SECRET, { expiresIn: "1h" });
const userTokenA = jwt.sign(regularUserA, env.JWT_SECRET, { expiresIn: "1h" });
const userTokenB = jwt.sign(regularUserB, env.JWT_SECRET, { expiresIn: "1h" });

test("GET /api/borrowings enforces auth and isolates records by role and user ownership", async (t) => {
    const origFind = Borrowing.find;
    t.after(() => {
        Borrowing.find = origFind;
    });

    const mockRecords = [
        {
            _id: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567810"),
            userId: regularUserA.id,
            bookId: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567820"),
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 86400000),
            returnDate: null,
            status: "issued",
            createdAt: new Date(),
            toSafeObject() {
                return {
                    id: this._id.toString(),
                    userId: this.userId,
                    bookId: this.bookId,
                    issueDate: this.issueDate,
                    dueDate: this.dueDate,
                    returnDate: this.returnDate,
                    status: this.status,
                    createdAt: this.createdAt
                };
            }
        },
        {
            _id: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567811"),
            userId: regularUserB.id,
            bookId: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567821"),
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 86400000),
            returnDate: new Date(),
            status: "returned",
            createdAt: new Date(),
            toSafeObject() {
                return {
                    id: this._id.toString(),
                    userId: this.userId,
                    bookId: this.bookId,
                    issueDate: this.issueDate,
                    dueDate: this.dueDate,
                    returnDate: this.returnDate,
                    status: this.status,
                    createdAt: this.createdAt
                };
            }
        }
    ];

    let lastQuery = null;
    Borrowing.find = (query) => {
        lastQuery = query;
        return {
            sort: async () => {
                if (query.userId) {
                    return mockRecords.filter((r) => r.userId === query.userId);
                }
                return mockRecords;
            }
        };
    };

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings`;

    // 1. Unauthenticated -> 401
    const resNoAuth = await fetch(url);
    assert.equal(resNoAuth.status, 401);

    // 2. Admin gets all records
    const resAdmin = await fetch(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resAdmin.status, 200);
    const bodyAdmin = await resAdmin.json();
    assert.equal(bodyAdmin.data.length, 2);
    assert.deepEqual(lastQuery, {});

    // 3. User A gets only User A records
    const resUserA = await fetch(url, {
        headers: { Authorization: `Bearer ${userTokenA}` }
    });
    assert.equal(resUserA.status, 200);
    const bodyUserA = await resUserA.json();
    assert.equal(bodyUserA.data.length, 1);
    assert.equal(bodyUserA.data[0].userId, regularUserA.id);
    assert.deepEqual(lastQuery, { userId: regularUserA.id });

    // 4. User A attempts to view User B records via query param -> strictly scoped to User A
    const resUserASpoof = await fetch(`${url}?userId=${regularUserB.id}`, {
        headers: { Authorization: `Bearer ${userTokenA}` }
    });
    assert.equal(resUserASpoof.status, 200);
    const bodyUserASpoof = await resUserASpoof.json();
    assert.equal(bodyUserASpoof.data.length, 1);
    assert.equal(bodyUserASpoof.data[0].userId, regularUserA.id);
    assert.deepEqual(lastQuery, { userId: regularUserA.id });
});

test("PATCH /api/borrowings/:id/return validates input, enforces Admin role, and handles missing/already returned loans", async (t) => {
    const origFindById = Borrowing.findById;
    t.after(() => {
        Borrowing.findById = origFindById;
    });

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const baseUrl = `http://localhost:${server.address().port}/api/borrowings`;

    // 1. Unauthenticated -> 401
    const resNoAuth = await fetch(`${baseUrl}/60d5ecb8b5c9c61234567899/return`, {
        method: "PATCH"
    });
    assert.equal(resNoAuth.status, 401);

    // 2. Regular User -> 403 Forbidden (Admin only)
    const resUser = await fetch(`${baseUrl}/60d5ecb8b5c9c61234567899/return`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${userTokenA}` }
    });
    assert.equal(resUser.status, 403);

    // 3. Invalid ObjectId -> 400 Bad Request
    const resInvalidId = await fetch(`${baseUrl}/not-an-objectid/return`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resInvalidId.status, 400);
    const bodyInvalid = await resInvalidId.json();
    assert.match(bodyInvalid.error.message, /valid borrowing id/i);

    // 4. Record not found -> 404
    Borrowing.findById = async () => null;
    const resNotFound = await fetch(`${baseUrl}/60d5ecb8b5c9c61234567899/return`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resNotFound.status, 404);
    const bodyNotFound = await resNotFound.json();
    assert.match(bodyNotFound.error.message, /borrowing record not found/i);

    // 5. Already returned -> 409 Conflict
    Borrowing.findById = async () => ({
        _id: new mongoose.Types.ObjectId("60d5ecb8b5c9c61234567899"),
        status: "returned"
    });
    const resAlreadyReturned = await fetch(`${baseUrl}/60d5ecb8b5c9c61234567899/return`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resAlreadyReturned.status, 409);
    const bodyAlready = await resAlreadyReturned.json();
    assert.match(bodyAlready.error.message, /already been returned/i);
});

test("PATCH /api/borrowings/:id/return successfully returns book, increments stock, and returns 200", async (t) => {
    const origBorrowingFindById = Borrowing.findById;
    const origBorrowingFindOneAndUpdate = Borrowing.findOneAndUpdate;
    const origBookFindByIdAndUpdate = Book.findByIdAndUpdate;

    t.after(() => {
        Borrowing.findById = origBorrowingFindById;
        Borrowing.findOneAndUpdate = origBorrowingFindOneAndUpdate;
        Book.findByIdAndUpdate = origBookFindByIdAndUpdate;
    });

    const loanId = "60d5ecb8b5c9c61234567899";
    const bookId = "60d5ecb8b5c9c61234567822";

    Borrowing.findById = async () => ({
        _id: new mongoose.Types.ObjectId(loanId),
        bookId: new mongoose.Types.ObjectId(bookId),
        userId: new mongoose.Types.ObjectId(regularUserA.id),
        status: "issued"
    });

    Borrowing.findOneAndUpdate = async (query, update) => {
        assert.equal(query.status, "issued");
        assert.equal(update.$set.status, "returned");
        assert(update.$set.returnDate instanceof Date);
        return {
            _id: new mongoose.Types.ObjectId(loanId),
            bookId: new mongoose.Types.ObjectId(bookId),
            userId: new mongoose.Types.ObjectId(regularUserA.id),
            status: "returned",
            returnDate: update.$set.returnDate,
            toSafeObject() {
                return {
                    id: loanId,
                    bookId,
                    userId: regularUserA.id,
                    status: "returned",
                    returnDate: this.returnDate
                };
            }
        };
    };

    Book.findByIdAndUpdate = async (targetBookId, update) => {
        assert.equal(targetBookId.toString(), bookId);
        assert.equal(update.$inc.availableCopies, 1);
        return {
            _id: new mongoose.Types.ObjectId(bookId),
            title: "Returned Book",
            availableCopies: 3,
            totalCopies: 5,
            toSafeObject() {
                return {
                    id: bookId,
                    title: this.title,
                    availableCopies: this.availableCopies,
                    totalCopies: this.totalCopies
                };
            }
        };
    };

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings/${loanId}/return`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.borrowing.status, "returned");
    assert.ok(body.data.borrowing.returnDate);
    assert.equal(body.data.book.availableCopies, 3);
});

test("PATCH /api/borrowings/:id/return rolls back borrowing status if stock update fails", async (t) => {
    const origBorrowingFindById = Borrowing.findById;
    const origBorrowingFindOneAndUpdate = Borrowing.findOneAndUpdate;
    const origBorrowingFindByIdAndUpdate = Borrowing.findByIdAndUpdate;
    const origBookFindByIdAndUpdate = Book.findByIdAndUpdate;

    t.after(() => {
        Borrowing.findById = origBorrowingFindById;
        Borrowing.findOneAndUpdate = origBorrowingFindOneAndUpdate;
        Borrowing.findByIdAndUpdate = origBorrowingFindByIdAndUpdate;
        Book.findByIdAndUpdate = origBookFindByIdAndUpdate;
    });

    const loanId = "60d5ecb8b5c9c61234567899";
    const bookId = "60d5ecb8b5c9c61234567822";

    Borrowing.findById = async () => ({
        _id: new mongoose.Types.ObjectId(loanId),
        bookId: new mongoose.Types.ObjectId(bookId),
        status: "issued"
    });

    Borrowing.findOneAndUpdate = async () => ({
        _id: new mongoose.Types.ObjectId(loanId),
        status: "returned",
        toSafeObject: () => ({ id: loanId, status: "returned" })
    });

    let rolledBack = false;
    Borrowing.findByIdAndUpdate = async (id, update) => {
        if (update.$set && update.$set.status === "issued") {
            rolledBack = true;
        }
        return {};
    };

    // Simulate Book not found / update error
    Book.findByIdAndUpdate = async () => null;

    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const url = `http://localhost:${server.address().port}/api/borrowings/${loanId}/return`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 404);
    assert.equal(rolledBack, true, "Borrowing status must be rolled back to issued");
});
