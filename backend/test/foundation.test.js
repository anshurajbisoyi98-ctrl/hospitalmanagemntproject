const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const readConfig = require("../src/config/env");
const createApp = require("../src/app");

const env = { MONGO_URI: "mongodb://localhost/library", JWT_SECRET: "x".repeat(32), FRONTEND_URL: "http://localhost:5173" };
test("Configuration rejects missing and invalid values", () => {
    assert.equal(readConfig(env).port, 5000);
    for (const key of Object.keys(env)) {
        assert.throws(() => readConfig({ ...env, [key]: "" }));
    }
    for (const PORT of ["abc", "0", "65536", "1.5"]) {
        assert.throws(() => readConfig({ ...env, PORT }));
    }
    assert.throws(() => readConfig({ ...env, JWT_SECRET: "short" }));
    assert.throws(() => readConfig({ ...env, FRONTEND_URL: "http://localhost:5173/" }));
    assert.throws(() => readConfig({ ...env, MONGO_URI: "https://example.com" }));
});
test("API reports unavailable database, missing routes, and malformed JSON safely", async (t) => {
    const server = createApp(readConfig(env)).listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://localhost:${server.address().port}`;
    const health = await fetch(`${url}/api/health`, { headers: { Origin: env.FRONTEND_URL } });
    assert.equal(health.status, 503);
    assert.equal(health.headers.get("access-control-allow-origin"), env.FRONTEND_URL);
    assert.deepEqual(await health.json(), { error: { message: "Database unavailable" } });
    const missing = await fetch(`${url}/api/missing`);
    assert.equal(missing.status, 404);
    const malformed = await fetch(`${url}/api/missing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: { message: "Invalid JSON body" } });
});

test("Async controller failures reach the error handler without leaking details", async (t) => {
    const express = require("express");
    const errorHandler = require("../src/middleware/errorHandler");
    const app = express();

    app.get("/failure", async (req, res) => {
        await Promise.resolve();
        throw new Error("Private database connection details");
    });
    app.use(errorHandler);

    const server = app.listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const response = await fetch(`http://localhost:${server.address().port}/failure`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
        error: { message: "Internal server error" }
    });
});
