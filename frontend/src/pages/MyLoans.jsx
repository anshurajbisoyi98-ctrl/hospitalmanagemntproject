import { useEffect, useMemo, useState } from "react";
import LoansTable from "../components/LoansTable.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getBooks } from "../services/bookService.js";
import { getMyLoans } from "../services/loanService.js";
import { mapLoanError, normalizeLoan } from "../utils/loans.js";

/**
 * Personal loans page for authenticated users (both Users and Admins).
 * Only displays the signed-in person's loans.
 */
const MyLoans = () => {
    const { user } = useAuth();
    const [loans, setLoans] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const handleRetry = () => {
        setReloadKey((prev) => prev + 1);
    };

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadMyLoans = async () => {
            setLoading(true);
            setError(null);
            try {
                // Scoped exclusively to current user: never calls the all-loans endpoint
                const [booksRes, loansRes] = await Promise.all([
                    getBooks({ signal: controller.signal }),
                    getMyLoans({
                        signal: controller.signal,
                        userId: user?.id || user?._id,
                    }),
                ]);

                if (!isMounted) return;

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
                setLoading(false);
            } catch (err) {
                if (!isMounted || controller.signal.aborted) return;
                const mapped = mapLoanError(
                    err,
                    "Unable to load your loans. Please check your connection and try again."
                );
                setError(mapped);
                setLoading(false);
            }
        };

        loadMyLoans();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [reloadKey, user?.id, user?._id]);

    const booksMap = useMemo(() => {
        const map = new Map();
        for (const b of books) {
            const id = b.id || b._id;
            if (id) map.set(String(id), b);
        }
        return map;
    }, [books]);

    const normalizedLoans = useMemo(() => {
        return loans.map((l) =>
            normalizeLoan(l, { booksMap })
        );
    }, [loans, booksMap]);

    return (
        <section className="loans-page" aria-labelledby="my-loans-heading">
            <header className="loans-page__header">
                <h1 id="my-loans-heading" className="loans-page__title">
                    My Loans
                </h1>
                <p className="loans-page__intro">
                    View your borrowed books, active due dates, and return history.
                </p>
            </header>

            {loading ? (
                <StatusMessage type="loading" message="Loading your loans…" />
            ) : error ? (
                <StatusMessage
                    type="error"
                    message={error.message || "Unable to load your loans. Please try again."}
                    onRetry={handleRetry}
                />
            ) : normalizedLoans.length === 0 ? (
                <StatusMessage type="empty" message="You have no loans." />
            ) : (
                <LoansTable
                    loans={normalizedLoans}
                    isAdmin={false}
                />
            )}
        </section>
    );
};

export default MyLoans;
