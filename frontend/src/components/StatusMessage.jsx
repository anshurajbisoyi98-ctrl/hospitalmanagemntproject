const StatusMessage = ({ type, message, onRetry, onClear }) => {
    if (type === "loading") {
        return (
            <div className="catalog-status catalog-status--loading" aria-live="polite">
                <p className="catalog-status__message">{message || "Loading catalog…"}</p>
            </div>
        );
    }

    if (type === "error") {
        return (
            <div className="catalog-status catalog-status--error" role="alert">
                <p className="catalog-status__message">{message || "Failed to load data. Please try again."}</p>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="catalog-btn catalog-btn--retry">
                        Retry
                    </button>
                )}
            </div>
        );
    }

    if (type === "empty") {
        return (
            <div className="catalog-status catalog-status--empty">
                <p className="catalog-status__message">{message || "No books in the catalog yet."}</p>
                {onClear && (
                    <button type="button" onClick={onClear} className="catalog-btn catalog-btn--clear-filters">
                        Clear filters
                    </button>
                )}
            </div>
        );
    }

    return null;
};

export default StatusMessage;
