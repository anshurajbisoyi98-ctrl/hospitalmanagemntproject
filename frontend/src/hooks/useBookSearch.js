import { useCallback, useEffect, useRef, useState } from "react";
import { getBooks } from "../services/bookService.js";
import { createRequestSequencer, extractCategories } from "../utils/search.js";

/**
 * Custom hook to coordinate book catalog searching and filtering.
 * Manages debounce, cancellation, latest-request guard, and category stabilization.
 *
 * @param {{
 *   queryParam: string,
 *   categoryParam: string,
 *   token?: string,
 *   reloadKey?: number,
 *   onParamsChange?: (params: { q: string, category: string }) => void
 * }} options
 */
const useBookSearch = ({
    queryParam = "",
    categoryParam = "",
    token,
    reloadKey = 0,
    onParamsChange,
} = {}) => {
    // Local input states for instant responsiveness
    const [searchInput, setSearchInput] = useState(queryParam);
    const [activeQuery, setActiveQuery] = useState(queryParam);
    const [selectedCategory, setSelectedCategory] = useState(categoryParam);

    // Book data and request states
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Categories derived from the first unfiltered response and kept stable
    const [availableCategories, setAvailableCategories] = useState([]);
    const hasCapturedCategoriesRef = useRef(false);

    // Ref to track latest request ID across async operations
    const sequencerRef = useRef(createRequestSequencer());
    const activeAbortControllerRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Sync state when URL params change from external navigation (e.g. back/forward)
    useEffect(() => {
        setSearchInput(queryParam);
        setActiveQuery(queryParam);
    }, [queryParam]);

    useEffect(() => {
        setSelectedCategory(categoryParam);
    }, [categoryParam]);

    // Handle debounced search input updates (300ms debounce)
    const handleSearchChange = useCallback((value) => {
        setSearchInput(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            const trimmed = value.trim();
            setActiveQuery(trimmed);
            if (onParamsChange) {
                onParamsChange({ q: trimmed, category: selectedCategory });
            }
        }, 300);
    }, [onParamsChange, selectedCategory]);

    // Submit immediately on Enter
    const handleImmediateSearch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        const trimmed = searchInput.trim();
        setActiveQuery(trimmed);
        if (onParamsChange) {
            onParamsChange({ q: trimmed, category: selectedCategory });
        }
    }, [searchInput, onParamsChange, selectedCategory]);

    // Handle category dropdown change
    const handleCategoryChange = useCallback((newCategory) => {
        const trimmed = newCategory.trim();
        setSelectedCategory(trimmed);
        if (onParamsChange) {
            onParamsChange({ q: activeQuery, category: trimmed });
        }
    }, [activeQuery, onParamsChange]);

    // Clear search query
    const handleClearSearch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        setSearchInput("");
        setActiveQuery("");
        if (onParamsChange) {
            onParamsChange({ q: "", category: selectedCategory });
        }
    }, [onParamsChange, selectedCategory]);

    // Clear all filters (both query and category)
    const handleClearAll = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        setSearchInput("");
        setActiveQuery("");
        setSelectedCategory("");
        if (onParamsChange) {
            onParamsChange({ q: "", category: "" });
        }
    }, [onParamsChange]);

    // Fetch effect with AbortController, latest request guard, and category stabilization
    useEffect(() => {
        // Abort previous in-flight request
        if (activeAbortControllerRef.current) {
            activeAbortControllerRef.current.abort();
        }

        const controller = new AbortController();
        activeAbortControllerRef.current = controller;
        const requestId = sequencerRef.current.next();

        setLoading(true);
        setError(null);

        const runFetch = async () => {
            try {
                const result = await getBooks({
                    q: activeQuery,
                    category: selectedCategory,
                    signal: controller.signal,
                    token,
                });

                // Ignore if not latest request or aborted
                if (!sequencerRef.current.isLatest(requestId) || controller.signal.aborted) {
                    return;
                }

                const items = Array.isArray(result)
                    ? result
                    : (Array.isArray(result?.data) ? result.data : []);

                setBooks(items);

                // Stabilize category list from the unfiltered response
                if (!hasCapturedCategoriesRef.current && !activeQuery && !selectedCategory && items.length > 0) {
                    const extracted = extractCategories(items);
                    if (extracted.length > 0) {
                        setAvailableCategories(extracted);
                        hasCapturedCategoriesRef.current = true;
                    }
                } else if (!hasCapturedCategoriesRef.current && items.length > 0) {
                    // If first visit already has filters, still extract from what is available
                    const extracted = extractCategories(items);
                    setAvailableCategories((prev) => {
                        const merged = Array.from(new Set([...prev, ...extracted]));
                        return merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
                    });
                }

                setLoading(false);
            } catch (err) {
                // Ignore aborted requests cleanly without triggering error state
                if (!sequencerRef.current.isLatest(requestId) || controller.signal.aborted || err?.name === "AbortError") {
                    return;
                }
                setError(err);
                setLoading(false);
            }
        };

        runFetch();

        return () => {
            controller.abort();
        };
    }, [activeQuery, selectedCategory, token, reloadKey]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        searchInput,
        activeQuery,
        selectedCategory,
        books,
        loading,
        error,
        availableCategories,
        handleSearchChange,
        handleImmediateSearch,
        handleCategoryChange,
        handleClearSearch,
        handleClearAll,
    };
};

export default useBookSearch;
