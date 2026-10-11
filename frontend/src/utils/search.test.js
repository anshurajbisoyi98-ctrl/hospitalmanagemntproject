import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
    buildLiveStatusMessage,
    buildSearchQueryString,
    createRequestSequencer,
    extractCategories,
    normalizeCategory,
    normalizeQuery,
    parseSearchParams,
} from "./search.js";

describe("normalizeQuery", () => {
    it("trims whitespace from queries", () => {
        assert.equal(normalizeQuery("  clean code  "), "clean code");
    });

    it("handles null, undefined, non-strings safely", () => {
        assert.equal(normalizeQuery(null), "");
        assert.equal(normalizeQuery(undefined), "");
        assert.equal(normalizeQuery(123), "");
        assert.equal(normalizeQuery(""), "");
    });
});

describe("normalizeCategory", () => {
    it("trims whitespace from categories", () => {
        assert.equal(normalizeCategory("  Fiction  "), "Fiction");
    });

    it("handles non-string values safely", () => {
        assert.equal(normalizeCategory(null), "");
        assert.equal(normalizeCategory(undefined), "");
        assert.equal(normalizeCategory({}), "");
    });
});

describe("buildSearchQueryString", () => {
    it("returns empty string when no params provided", () => {
        assert.equal(buildSearchQueryString(), "");
        assert.equal(buildSearchQueryString({ q: "", category: "" }), "");
        assert.equal(buildSearchQueryString({ q: "   ", category: "   " }), "");
    });

    it("serializes q only", () => {
        assert.equal(buildSearchQueryString({ q: "dune" }), "?q=dune");
    });

    it("serializes category only", () => {
        assert.equal(buildSearchQueryString({ category: "Sci-Fi" }), "?category=Sci-Fi");
    });

    it("serializes both q and category", () => {
        const result = buildSearchQueryString({ q: "dune", category: "Sci-Fi" });
        assert.equal(result, "?q=dune&category=Sci-Fi");
    });

    it("handles special characters properly", () => {
        const result = buildSearchQueryString({ q: "C++ & Algorithms", category: "Computer Science" });
        assert.equal(result, "?q=C%2B%2B+%26+Algorithms&category=Computer+Science");
    });
});

describe("parseSearchParams", () => {
    it("parses from URLSearchParams instance", () => {
        const params = new URLSearchParams("q=1984&category=Classics");
        assert.deepEqual(parseSearchParams(params), { q: "1984", category: "Classics" });
    });

    it("parses from query string with or without leading ?", () => {
        assert.deepEqual(parseSearchParams("?q=dune"), { q: "dune", category: "" });
        assert.deepEqual(parseSearchParams("category=Fiction"), { q: "", category: "Fiction" });
    });

    it("handles empty or non-string input safely", () => {
        assert.deepEqual(parseSearchParams(""), { q: "", category: "" });
        assert.deepEqual(parseSearchParams(null), { q: "", category: "" });
    });
});

describe("extractCategories", () => {
    it("returns sorted distinct categories from books", () => {
        const books = [
            { category: "Science" },
            { category: "Fiction" },
            { category: "History" },
            { category: "Fiction" },
            { category: "  Art  " },
        ];
        assert.deepEqual(extractCategories(books), ["Art", "Fiction", "History", "Science"]);
    });

    it("handles missing or empty categories and non-array safely", () => {
        assert.deepEqual(extractCategories(null), []);
        assert.deepEqual(extractCategories([]), []);
        assert.deepEqual(extractCategories([{ title: "No category" }, { category: "" }, { category: "   " }]), []);
    });
});

describe("createRequestSequencer", () => {
    it("increments IDs and only recognizes latest ID", () => {
        const sequencer = createRequestSequencer();
        const id1 = sequencer.next();
        const id2 = sequencer.next();
        const id3 = sequencer.next();

        assert.equal(id1, 1);
        assert.equal(id2, 2);
        assert.equal(id3, 3);

        assert.equal(sequencer.isLatest(id1), false);
        assert.equal(sequencer.isLatest(id2), false);
        assert.equal(sequencer.isLatest(id3), true);
    });
});

describe("buildLiveStatusMessage", () => {
    it("handles loading states", () => {
        assert.equal(
            buildLiveStatusMessage({ loading: true, error: null, count: 0, q: "dune", category: "" }),
            "Loading results for 'dune'",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: true, error: null, count: 0, q: "", category: "" }),
            "Loading catalog…",
        );
    });

    it("handles error states", () => {
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: new Error("Fail"), count: 0, q: "dune", category: "" }),
            "Couldn't load results for 'dune'.",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: new Error("Fail"), count: 0, q: "", category: "" }),
            "Couldn't load results.",
        );
    });

    it("handles empty results states", () => {
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 0, q: "dune", category: "Fiction" }),
            "No results for 'dune' in Fiction.",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 0, q: "dune", category: "" }),
            "No results for 'dune'.",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 0, q: "", category: "Fiction" }),
            "No results in Fiction.",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 0, q: "", category: "" }),
            "No books in the catalog.",
        );
    });

    it("handles success count", () => {
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 1, q: "dune", category: "" }),
            "1 book found.",
        );
        assert.equal(
            buildLiveStatusMessage({ loading: false, error: null, count: 5, q: "dune", category: "" }),
            "5 books found.",
        );
    });
});
