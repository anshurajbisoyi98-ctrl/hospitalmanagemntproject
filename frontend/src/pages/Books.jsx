import { useCallback, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import BookCard from "../components/BookCard.jsx";
import SearchFilter from "../components/SearchFilter.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useBookSearch from "../hooks/useBookSearch.js";

const Books = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = (searchParams.get("q") || "").trim();
    const categoryParam = (searchParams.get("category") || "").trim();
    const { token, user } = useAuth() || {};
    const location = useLocation();
    const isAdmin = user?.role === "Admin";
    const [reloadKey, setReloadKey] = useState(0);

    const handleParamsChange = useCallback(({ q, category }) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (q) next.set("q", q);
            else next.delete("q");
            if (category) next.set("category", category);
            else next.delete("category");
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const {
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
    } = useBookSearch({
        queryParam,
        categoryParam,
        token,
        reloadKey,
        onParamsChange: handleParamsChange,
    });

    const handleRetry = () => setReloadKey((prev) => prev + 1);
    const hasFilters = Boolean(activeQuery || selectedCategory);
    const emptyMessage = activeQuery && selectedCategory
        ? `No results for '${activeQuery}' in ${selectedCategory}.`
        : activeQuery
        ? `No results for '${activeQuery}'.`
        : selectedCategory
        ? `No results in ${selectedCategory}.`
        : "No books in the catalog yet.";
    const errorMessage = activeQuery
        ? `Couldn't load results for '${activeQuery}'.`
        : (error?.message || "Unable to load books. Please check your connection and try again.");
    const loadingMessage = activeQuery
        ? `Loading results for '${activeQuery}'`
        : "Loading catalog…";

    return (
        <section className="catalog-page" aria-labelledby="catalog-heading">
            {location.state?.notice && (
                <div className="catalog-notice" role="status" aria-live="polite">
                    {location.state.notice}
                </div>
            )}
            <header className="catalog-page__header">
                <div className="catalog-page__header-row">
                    <div>
                        <h1 id="catalog-heading" className="catalog-page__title">Book Catalog</h1>
                        <p className="catalog-page__intro">Browse the collection and check live shelf availability.</p>
                    </div>
                    {isAdmin && (
                        <div className="catalog-page__header-actions">
                            <Link to="/admin/books/new" className="catalog-btn catalog-btn--primary">
                                Add book
                            </Link>
                        </div>
                    )}
                </div>
            </header>
            <SearchFilter
                searchInput={searchInput}
                activeQuery={activeQuery}
                selectedCategory={selectedCategory}
                categories={availableCategories}
                totalResults={books.length}
                loading={loading}
                error={error}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleImmediateSearch}
                onCategoryChange={handleCategoryChange}
                onClearSearch={handleClearSearch}
            />
            {error ? (
                <StatusMessage type="error" message={errorMessage} onRetry={handleRetry} />
            ) : loading && books.length === 0 ? (
                <StatusMessage type="loading" message={loadingMessage} />
            ) : books.length === 0 ? (
                <StatusMessage
                    type="empty"
                    message={emptyMessage}
                    onClear={hasFilters ? handleClearAll : undefined}
                />
            ) : (
                <div
                    className={`catalog-grid ${loading ? "catalog-grid--dimmed" : ""}`}
                    role="list"
                    aria-label="Books list"
                >
                    {books.map((book) => {
                        const key = book._id || book.id || `${book.title}-${book.ISBN}`;
                        return (
                            <div key={key} role="listitem">
                                <BookCard book={book} />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default Books;
