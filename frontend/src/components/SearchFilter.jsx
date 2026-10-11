import { useEffect, useRef } from "react";
import { buildLiveStatusMessage } from "../utils/search.js";

/**
 * Accessible search and filter controls.
 * - Single labeled input for `q` (title, author, ISBN, category).
 * - Category select populated from catalog data.
 * - Real labels, visible focus, logical tab order.
 * - Enter submits immediately, Escape or Clear resets with focus return to input.
 * - Live region announcing loading, results count, empty, or error state.
 */
const SearchFilter = ({
    searchInput,
    activeQuery,
    selectedCategory,
    categories = [],
    totalResults = 0,
    loading = false,
    error = null,
    onSearchChange,
    onSearchSubmit,
    onCategoryChange,
    onClearSearch,
}) => {
    const inputRef = useRef(null);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (onSearchSubmit) {
                onSearchSubmit();
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            if (onClearSearch) {
                onClearSearch();
                inputRef.current?.focus();
            }
        }
    };

    const handleClearClick = () => {
        if (onClearSearch) {
            onClearSearch();
            inputRef.current?.focus();
        }
    };

    const liveMessage = buildLiveStatusMessage({
        loading,
        error,
        count: totalResults,
        q: activeQuery,
        category: selectedCategory,
    });

    return (
        <div className="catalog-search-filter" role="search" aria-label="Book search and filter">
            <div className="catalog-search-filter__controls">
                <div className="catalog-search-filter__field catalog-search-filter__field--search">
                    <label htmlFor="catalog-search-input" className="catalog-search-filter__label">
                        Search catalog
                    </label>
                    <div className="catalog-search-filter__input-wrapper">
                        <input
                            id="catalog-search-input"
                            ref={inputRef}
                            type="search"
                            className="catalog-search-filter__input"
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search title, author, ISBN or category"
                            autoComplete="off"
                            aria-describedby="catalog-search-hint"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                className="catalog-search-filter__clear-btn"
                                onClick={handleClearClick}
                                aria-label="Clear search query"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <span id="catalog-search-hint" className="catalog-search-filter__hint">
                        Searches title, author, ISBN, or category. Press Enter to submit or Escape to clear.
                    </span>
                </div>

                <div className="catalog-search-filter__field catalog-search-filter__field--category">
                    <label htmlFor="catalog-category-select" className="catalog-search-filter__label">
                        Category
                    </label>
                    <select
                        id="catalog-category-select"
                        className="catalog-search-filter__select"
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                    >
                        <option value="">All categories</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Polite live region for screen readers announcing result updates */}
            <div
                id="catalog-search-live-status"
                className="catalog-search-filter__live-region sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
            >
                {liveMessage}
            </div>
        </div>
    );
};

export default SearchFilter;
