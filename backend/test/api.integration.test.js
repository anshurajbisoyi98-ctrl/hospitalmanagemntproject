const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const connectDB = require("../src/config/db");
const createApp = require("../src/app");
const User = require("../src/models/userModel");
const Book = require("../src/models/bookModel");
const Borrowing = require("../src/models/borrowingModel");

const mongoUri = process.env.API_TEST_MONGO_URI || process.env.TEST_MONGO_URI;
const databaseName = (uri) => {
    try {
        const normalized = uri.replace(/^mongodb(?:\+srv)?:\/\//, "http://");
        return new URL(normalized).pathname.slice(1).split("?")[0];
    } catch {
        return "";
    }
};

test("real MongoDB auth, roles, catalog CRUD, and search integration", {
    skip: !mongoUri && "Set TEST_MONGO_URI to an isolated test database"
}, async (t) => {
    const dbName = databaseName(mongoUri);
    if (!dbName.toLowerCase().includes("test")) {
        throw new Error("Refusing to run API integration tests unless the database name contains 'test'");
    }

    try {
        await connectDB(mongoUri);
    } catch (error) {
        t.skip("MongoDB test database unavailable: " + error.message);
        return;
    }

    const runId = randomUUID().replace(/-/g, "");
    const email = runId + "@integration.test";
    const isbn = "TEST-API-" + runId;
    const jwtSecret = "integration-test-secret-0123456789";
    const app = createApp({
        port: 0,
        mongoUri,
        jwtSecret,
        frontendUrl: "http://127.0.0.1:5173"
    });
    const server = app.listen(0);
    await once(server, "listening");
    const baseUrl = "http://127.0.0.1:" + server.address().port + "/api";
    let userId;
    let bookId;

    await Promise.all([User.syncIndexes(), Book.syncIndexes(), Borrowing.syncIndexes()]);

    const cleanup = async () => {
        if (userId || bookId) {
            await Borrowing.deleteMany({
                $or: [
                    ...(userId ? [{ userId }] : []),
                    ...(bookId ? [{ bookId }] : [])
                ]
            });
        }
        await Promise.all([
            User.deleteMany({ email: { $in: [email, "admin-" + email] } }),
            Book.deleteMany({ ISBN: { $in: [isbn] } })
        ]);
    };

    t.after(async () => {
        await cleanup();
        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });

    const request = (path, options = {}) => fetch(baseUrl + path, options);
    const json = (method, body, token) => ({
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify(body)
    });

    const registration = await request("/auth/register", json("POST", {
        name: "Integration Reader",
        email,
        password: "reader-password-123",
        role: "Admin"
    }));
    assert.equal(registration.status, 201);
    const registrationBody = await registration.json();
    assert.equal(registrationBody.data.user.role, "User", "registration must ignore role escalation");
    assert.equal(registrationBody.data.user.passwordHash, undefined);
    userId = registrationBody.data.user.id;
    const userToken = registrationBody.data.token;

    const duplicate = await request("/auth/register", json("POST", {
        name: "Duplicate Reader",
        email,
        password: "reader-password-123"
    }));
    assert.equal(duplicate.status, 409);

    const login = await request("/auth/login", json("POST", {
        email,
        password: "reader-password-123"
    }));
    assert.equal(login.status, 200);
    const loginBody = await login.json();
    assert.equal(loginBody.data.user.id, userId);
    assert.ok(jwt.verify(loginBody.data.token, jwtSecret));

    const adminToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), email: "admin@" + email, role: "Admin" },
        jwtSecret,
        { expiresIn: "1h" }
    );

    const deniedCreate = await request("/books", json("POST", {
        title: "Forbidden",
        author: "No Admin",
        ISBN: isbn,
        category: "Test",
        totalCopies: 2
    }, userToken));
    assert.equal(deniedCreate.status, 403);

    const created = await request("/books", json("POST", {
        title: "Integration Book",
        author: "Integration Author",
        ISBN: isbn,
        category: "Testing",
        totalCopies: 3
    }, adminToken));
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    bookId = createdBody.data.id;
    assert.equal(createdBody.data.availableCopies, 3);

    const duplicateBook = await request("/books", json("POST", {
        title: "Duplicate",
        author: "Another Author",
        ISBN: isbn,
        category: "Testing",
        totalCopies: 1
    }, adminToken));
    assert.equal(duplicateBook.status, 409);

    const search = await request("/books?q=integration&category=Testing", {
        headers: { Authorization: "Bearer " + userToken }
    });
    assert.equal(search.status, 200);
    const searchBody = await search.json();
    assert.equal(searchBody.data.length, 1);
    assert.equal(searchBody.data[0].id, bookId);

    const update = await request("/books/" + bookId, json("PUT", {
        title: "Updated Integration Book",
        totalCopies: 4
    }, adminToken));
    assert.equal(update.status, 200);
    const updateBody = await update.json();
    assert.equal(updateBody.data.title, "Updated Integration Book");
    assert.equal(updateBody.data.availableCopies, 4);

    const borrower = await User.create({
        name: "Loan Fixture",
        email: "admin-" + email,
        passwordHash: "test-hash",
        role: "User"
    });
    await Borrowing.create({
        userId: borrower._id,
        bookId,
        dueDate: new Date(Date.now() + 86400000),
        status: "issued"
    });
    await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: -1 } });

    const unsafeEdit = await request("/books/" + bookId, json("PUT", {
        totalCopies: 0
    }, adminToken));
    assert.equal(unsafeEdit.status, 400);

    const unsafeDelete = await request("/books/" + bookId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken }
    });
    assert.equal(unsafeDelete.status, 409);

    const detail = await request("/books/" + bookId, {
        headers: { Authorization: "Bearer " + userToken }
    });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.availableCopies, 3);
});
