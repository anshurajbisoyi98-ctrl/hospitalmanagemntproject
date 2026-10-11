const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Book = require("../models/bookModel");
const { seedDemoBooks } = require("../data/demoBooks");

const runFromCli = async () => {
    if (process.env.SEED_DEMO_DATA !== "true") {
        console.error("Set SEED_DEMO_DATA=true to explicitly enable the demo data seed.");
        process.exitCode = 1;
        return;
    }

    if (!process.env.MONGO_URI || !/^mongodb(?:\+srv)?:\/\//.test(process.env.MONGO_URI)) {
        console.error("A valid MONGO_URI is required in backend/.env.");
        process.exitCode = 1;
        return;
    }

    try {
        await connectDB(process.env.MONGO_URI);
        const result = await seedDemoBooks(Book);
        console.log(`Demo books ready: ${result.inserted} inserted, ${result.alreadyPresent} already present.`);
    } catch {
        console.error("Demo data seeding failed. Check the MongoDB URI, network access, and database permissions.");
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

if (require.main === module) {
    runFromCli();
}

module.exports = runFromCli;
