const test = require("node:test");
const assert = require("node:assert/strict");
const { demoBooks, seedDemoBooks } = require("../src/data/demoBooks");

test("demo catalog contains distinct, complete books with visible demo labels", () => {
    assert.equal(demoBooks.length, 8);
    assert.equal(new Set(demoBooks.map((book) => book.ISBN)).size, demoBooks.length);

    for (const book of demoBooks) {
        assert.match(book.title, /^Demo:/);
        assert.ok(book.author);
        assert.ok(book.ISBN);
        assert.ok(book.category);
        assert.equal(book.availableCopies, book.totalCopies);
        assert.ok(Number.isInteger(book.publicationYear));
    }
});

test("seeding upserts by ISBN without overwriting existing records", async () => {
    let operations;
    const result = await seedDemoBooks({
        bulkWrite: async (receivedOperations, options) => {
            operations = receivedOperations;
            assert.deepEqual(options, { ordered: false });
            return { upsertedCount: 3, matchedCount: 5 };
        }
    });

    assert.equal(operations.length, demoBooks.length);
    assert.equal(result.inserted, 3);
    assert.equal(result.alreadyPresent, 5);

    for (const operation of operations) {
        assert.equal(operation.updateOne.upsert, true);
        assert.deepEqual(Object.keys(operation.updateOne.update), ["$setOnInsert"]);
        assert.deepEqual(operation.updateOne.filter, {
            ISBN: operation.updateOne.update.$setOnInsert.ISBN
        });
    }
});
