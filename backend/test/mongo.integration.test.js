const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { once } = require("node:events");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const createApp = require("../src/app");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
    quiet: true
});

const mongoUri = process.env.MONGO_URI;
const hasMongoUri = Boolean(
    mongoUri &&
    /^mongodb(?:\+srv)?:\/\//.test(mongoUri) &&
    !mongoUri.includes("username:password") &&
    !mongoUri.includes("your_mongodb_atlas_connection")
);

test("Atlas connection reports healthy through the Express API", {
    skip: !hasMongoUri && "Set a test/Atlas MONGO_URI in backend/.env to run this integration test"
}, async (t) => {
    const frontendUrl = "http://127.0.0.1:5173";
    let server;

    t.after(async () => {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => error ? reject(error) : resolve());
            });
        }
        await mongoose.disconnect();
    });

    await connectDB(mongoUri);
    server = createApp({ frontendUrl }).listen(0);
    await once(server, "listening");

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
        headers: { Origin: frontendUrl }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), frontendUrl);
    assert.deepEqual(await response.json(), {
        data: { status: "ok" }
    });
});
