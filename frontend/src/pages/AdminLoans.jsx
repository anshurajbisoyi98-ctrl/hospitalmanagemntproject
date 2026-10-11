import { useEffect, useMemo, useState } from "react";
import LoanForm from "../components/LoanForm.jsx";
import LoansTable from "../components/LoansTable.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { getBooks } from "../services/bookService.js";
import {
    createLoan,
    getBorrowers,
    getLoans,
    returnLoan,
} from "../services/loanService.js";
import { mapLoanError, normalizeLoan } from "../utils/loans.js";

/**
 * Administrator loan management page: issue books, view loan records,
 * filter by status, and mark loans as returned with live inventory sync.
 */
const AdminLoans = () => {
    const [loans, setLoans] = useState([]);
    const [books, setBooks] = useState([]);
    const [borrowers, setBorrowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [filter, setFilter] = useState("all"); // "all" | "active" | "overdue" | "returned"
    const [submittingLoan, setSubmittingLoan] = useState(false);
    const [serverFieldErrors, setServerFieldErrors] = useState({});
    const [formNotice, setFormNotice] = useState(null);
    const [successNotice, setSuccessNotice] = useState(null);

    const handleRetry = () => {
        setReloadKey((prev) => prev + 1);
    };

    // Main data loading effect
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [booksRes, borrowersRes, loansRes] = await Promise.all([
                    getBooks({ signal: controller.signal }),
                    getBorrowers({ signal: controller.signal }),
                    getLoans({ signal: controller.signal }),
                ]);

                if (!isMounted) return;

                const bList = Array.isArray(booksRes)
                    ? booksRes
                    : Array.isArray(booksRes?.data)
                    ? booksRes.data
                    : [];
                const uList = Array.isArray(borrowersRes)
                    ? borrowersRes
                    : Array.isArray(borrowersRes?.data)
                    ? borrowersRes.data
                    : [];
                const lList = Array.isArray(loansRes)
                    ? loansRes
                    : Array.isArray(loansRes?.data)
                    ? loansRes.data
                    : [];

                setBooks(bList);
                setBorrowers(uList);
                setLoans(lList);
                setLoading(false);
            } catch (err) {
                if (!isMounted || controller.signal.aborted) return;
                const mapped = mapLoanError(
                    err,
                    "Unable to load loans. Please check your connection and try again."
                );
                setError(mapped);
                setLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [reloadKey]);

    // Refetch helper to refresh state without unmounting
    const refreshData = async () => {
        try {
            const [booksRes, loansRes] = await Promise.all([
                getBooks(),
                getLoans(),
            ]);
            const bList = Array.isArray(booksRes)
                ? booksRes
                : Array.isArray(booksRes?.data)
                ? booksRes.data
                : [];
            const lList = Array.isArray(loansRes)
                ? loansRes
                : Array.isArray(loansRes?.data)
                ? loansRes.data
                : [];
            setBooks(bList);
            setLoans(lList);
        } catch {
            // Keep existing state if background refresh fails
        }
    };

    const handleCreateLoan = async ({ borrowerId, bookId, dueDate }) => {
        setSubmittingLoan(true);
        setFormNotice(null);
        setServerFieldErrors({});
        setSuccessNotice(null);

        try {
            await createLoan({ borrowerId, bookId, dueDate });
            setSuccessNotice("Loan created");
            await refreshData();
            return true;
        } catch (err) {
            const mapped = mapLoanError(err);
            setFormNotice(mapped.message);
            if (mapped.fieldErrors) {
                setServerFieldErrors(mapped.fieldErrors);
            }
            if (mapped.isUnavailable) {
                // Refresh book catalog on stock conflict
                try {
                    const booksRes = await getBooks();
                    const bList = Array.isArray(booksRes)
                        ? booksRes
                        : Array.isArray(booksRes?.data)
                        ? booksRes.data
                        : [];
                    setBooks(bList);
                } catch {}
            }
            return false;
        } finally {
            setSubmittingLoan(false);
        }
    };

    const handleReturnLoan = async (loanId) => {
        setFormNotice(null);
        setSuccessNotice(null);

        try {
            await returnLoan(loanId);
            setSuccessNotice("Book returned");
            await refreshData();
        } catch (err) {
            const mapped = mapLoanError(err);
            setFormNotice(mapped.message);
            if (mapped.isAlreadyReturned) {
                // Refresh loans on duplicate return conflict
                try {
                    const loansRes = await getLoans();
                    const lList = Array.isArray(loansRes)
                        ? loansRes
                        : Array.isArray(loansRes?.data)
                        ? loansRes.data
                        : [];
                    setLoans(lList);
                } catch {}
            }
        }
    };

    const booksMap = useMemo(() => {
        const map = new Map();
        for (const b of books) {
            const id = b.id || b._id;
            if (id) map.set(String(id), b);
        }
        return map;
    }, [books]);

    const borrowersMap = useMemo(() => {
        const map = new Map();
        for (const br of borrowers) {
            const id = br.id || br._id;
            if (id) map.set(String(id), br);
        }
        return map;
    }, [borrowers]);

    const normalizedLoans = useMemo(() => {
        return loans.map((l) =>
            normalizeLoan(l, { booksMap, borrowersMap })
        );
    }, [loans, booksMap, borrowersMap]);

    const filteredLoans = useMemo(() => {
        if (filter === "active") {
            return normalizedLoans.filter((l) => l.status === "Active");
        }
        if (filter === "overdue") {
            return normalizedLoans.filter((l) => l.status === "Overdue");
        }
        if (filter === "returned") {
            return normalizedLoans.filter((l) => l.status === "Returned");
        }
        return normalizedLoans;
    }, [normalizedLoans, filter]);

    return (
        <section className="loans-page" aria-labelledby="admin-loans-heading">
            <header className="loans-page__header">
                <h1 id="admin-loans-heading" className="loans-page__title">
                    Borrowing Management
                </h1>
                <p className="loans-page__intro">
                    Issue book loans to registered borrowers, track due dates, and mark returns.
                </p>
            </header>

            {/* Success notice */}
            {successNotice && (
                <div className="loans-notice loans-notice--success" role="status">
                    <span>{successNotice}</span>
                    <button
                        type="button"
                        className="loans-notice__close"
                        onClick={() => setSuccessNotice(null)}
                        aria-label="Dismiss notice"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* General form/action error notice */}
            {formNotice && (
                <div className="loans-notice loans-notice--error" role="alert">
                    <span>{formNotice}</span>
                    <button
                        type="button"
                        className="loans-notice__close"
                        onClick={() => setFormNotice(null)}
                        aria-label="Dismiss error"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Issue loan form */}
            <LoanForm
                books={books}
                borrowers={borrowers}
                onSubmit={handleCreateLoan}
                submitting={submittingLoan}
                serverFieldErrors={serverFieldErrors}
            />

            {/* Loans list header & filters */}
            <div className="loans-toolbar">
                <div className="loans-filters" role="tablist" aria-label="Filter loans by status">
                    <button
                        type="button"
                        className={`loans-filter-btn ${filter === "all" ? "loans-filter-btn--active" : ""}`}
                        onClick={() => setFilter("all")}
                        role="tab"
                        aria-selected={filter === "all"}
                    >
                        All ({normalizedLoans.length})
                    </button>
                    <button
                        type="button"
                        className={`loans-filter-btn ${filter === "active" ? "loans-filter-btn--active" : ""}`}
                        onClick={() => setFilter("active")}
                        role="tab"
                        aria-selected={filter === "active"}
                    >
                        Active ({normalizedLoans.filter((l) => l.status === "Active").length})
                    </button>
                    <button
                        type="button"
                        className={`loans-filter-btn ${filter === "overdue" ? "loans-filter-btn--active" : ""}`}
                        onClick={() => setFilter("overdue")}
                        role="tab"
                        aria-selected={filter === "overdue"}
                    >
                        Overdue ({normalizedLoans.filter((l) => l.status === "Overdue").length})
                    </button>
                    <button
                        type="button"
                        className={`loans-filter-btn ${filter === "returned" ? "loans-filter-btn--active" : ""}`}
                        onClick={() => setFilter("returned")}
                        role="tab"
                        aria-selected={filter === "returned"}
                    >
                        Returned ({normalizedLoans.filter((l) => l.status === "Returned").length})
                    </button>
                </div>

                <span className="loans-count">
                    Showing {filteredLoans.length} of {normalizedLoans.length} loans
                </span>
            </div>

            {/* Table states */}
            {loading ? (
                <StatusMessage type="loading" message="Loading loans…" />
            ) : error ? (
                <StatusMessage
                    type="error"
                    message={error.message || "Unable to load loans. Please try again."}
                    onRetry={handleRetry}
                />
            ) : filteredLoans.length === 0 ? (
                <StatusMessage
                    type="empty"
                    message={
                        normalizedLoans.length === 0
                            ? "No borrowing records recorded yet."
                            : `No ${filter} loans found.`
                    }
                />
            ) : (
                <LoansTable
                    loans={filteredLoans}
                    isAdmin={true}
                    onReturn={handleReturnLoan}
                />
            )}
        </section>
    );
};

export default AdminLoans;
