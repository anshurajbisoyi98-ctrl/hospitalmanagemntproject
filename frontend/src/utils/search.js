/**
 * Normalize and trim a search query string.
 * @param {string|null|undefined} q
 * @returns {string}
 */
const normalizeQuery = (q) => {
    if (typeof q !== "string") return "";
    return q.trim();
};

/**
 * Normalize category string.
 * @param {string|null|undefined} category
 * @returns {string}
 */
const normalizeCategory = (category) => {
    if (typeof category !== "string") return "";
    return category.trim();
};

/**
 * Build URL query string given q and category.
 * Returns empty string if neither is set.
 * @param {{ q?: string, category?: string }} params
 * @returns {string} e.g. "?q=dune&category=Fiction"
 */
const buildSearchQueryString = ({ q = "", category = "" } = {}) => {
    const cleanQ = normalizeQuery(q);
    const cleanCategory = normalizeCategory(category);
    const searchParams = new URLSearchParams();

    if (cleanQ) {
        searchParams.set("q", cleanQ);
    }
    if (cleanCategory) {
        searchParams.set("category", cleanCategory);
    }

    const str = searchParams.toString();
    return str ? `?${str}` : "";
};

/**
 * Parse q and category from URLSearchParams or search string.
 * @param {URLSearchParams|string} search
 * @returns {{ q: string, category: string }}
 */
const parseSearchParams = (search) => {
    const params = search instanceof URLSearchParams
        ? search
        : new URLSearchParams(typeof search === "string" ? search : "");

    return {
        q: (params.get("q") || "").trim(),
        category: (params.get("category") || "").trim(),
    };
};

/**
 * Extract distinct, sorted category names from a list of books.
 * @param {Array<object>} books
 * @returns {Array<string>}
 */
const extractCategories = (books) => {
    if (!Array.isArray(books)) return [];
    const map = new Map();
    for (const b of books) {
        if (b && typeof b.category === "string") {
            const trimmed = b.category.trim();
            if (trimmed) {
                const lower = trimmed.toLowerCase();
                if (!map.has(lower)) {
                    map.set(lower, trimmed);
                }
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

/**
 * Factory for tracking the latest request ID to guard against out-of-order responses.
 */
const createRequestSequencer = () => {
    let currentId = 0;
    return {
        next: () => {
            currentId += 1;
            return currentId;
        },
        isLatest: (id) => id === currentId,
        reset: () => {
            currentId = 0;
        },
    };
};

/**
 * Build concise, user-friendly live region announcement text.
 * @param {{ loading: boolean, error: Error|null, count: number, q: string, category: string }} state
 * @returns {string}
 */
const buildLiveStatusMessage = ({ loading, error, count, q, category }) => {
    if (loading) {
        if (q) return `Loading results for '${q}'`;
        return "Loading catalog…";
    }
    if (error) {
        if (q) return `Couldn't load results for '${q}'.`;
        return "Couldn't load results.";
    }
    if (count === 0) {
        if (q && category) {
            return `No results for '${q}' in ${category}.`;
        }
        if (q) {
            return `No results for '${q}'.`;
        }
        if (category) {
            return `No results in ${category}.`;
        }
        return "No books in the catalog.";
    }
    return `${count} book${count === 1 ? "" : "s"} found.`;
};

export {
    normalizeQuery,
    normalizeCategory,
    buildSearchQueryString,
    parseSearchParams,
    extractCategories,
    createRequestSequencer,
    buildLiveStatusMessage,
};
