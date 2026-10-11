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

test("GET /api/books with q and category builds literal search filters", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const token = makeToken();
    let capturedFilter = null;

    const origFind = Book.find;
    Book.find = (filter) => {
        capturedFilter = filter;
        return {
            sort: () => Promise.resolve([])
        };
    };
    t.after(() => { Book.find = origFind; });

    // Test with q only
    const url1 = `http://localhost:${server.address().port}/api/books?q=dune`;
    await fetch(url1, { headers: { Authorization: `Bearer ${token}` } });
    assert.ok(capturedFilter.$or);
    assert.equal(capturedFilter.$or.length, 4);

    // Test with category only
    const url2 = `http://localhost:${server.address().port}/api/books?category=Sci-Fi`;
    await fetch(url2, { headers: { Authorization: `Bearer ${token}` } });
    assert.ok(capturedFilter.category);
    assert.equal(capturedFilter.$or, undefined);

    // Test with combined q and category
    const url3 = `http://localhost:${server.address().port}/api/books?q=frank&category=Sci-Fi`;
    await fetch(url3, { headers: { Authorization: `Bearer ${token}` } });
    assert.ok(capturedFilter.category);
    assert.ok(capturedFilter.$or);

    // Test special characters (literal escaping)
    const url4 = `http://localhost:${server.address().port}/api/books?q=c%2B%2B`;
    await fetch(url4, { headers: { Authorization: `Bearer ${token}` } });
    assert.ok(capturedFilter.$or[0].title.test("c++"));
});
