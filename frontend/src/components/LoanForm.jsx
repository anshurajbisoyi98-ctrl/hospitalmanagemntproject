import { useEffect, useRef, useState } from "react";
import { defaultDueDate, validateBorrowForm } from "../utils/loans.js";
import { getAvailability } from "../utils/books.js";

/**
 * Controlled borrowing issue form for administrators.
 */
const LoanForm = ({
    books = [],
    borrowers = [],
    onSubmit,
    submitting = false,
    serverFieldErrors = {},
}) => {
    const [borrowerId, setBorrowerId] = useState("");
    const [bookId, setBookId] = useState("");
    const [dueDate, setDueDate] = useState(() => defaultDueDate());
    const [clientErrors, setClientErrors] = useState({});

    const borrowerRef = useRef(null);
    const bookRef = useRef(null);
    const dueDateRef = useRef(null);

    // Compute minimum due date (tomorrow)
    const minDueDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    })();

    // Filter books with live inventory > 0
    const availableBooks = books.filter((b) => {
        const avail = getAvailability(b);
        return avail.available > 0;
    });

    // Merge client validation errors and server 400 field errors
    const errors = {
        ...serverFieldErrors,
        ...clientErrors,
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { valid, errors: validationErrors } = validateBorrowForm({
            borrowerId,
            bookId,
            dueDate,
        });

        if (!valid) {
            setClientErrors(validationErrors);

            // Focus on first invalid field
            if (validationErrors.borrowerId && borrowerRef.current) {
                borrowerRef.current.focus();
            } else if (validationErrors.bookId && bookRef.current) {
                bookRef.current.focus();
            } else if (validationErrors.dueDate && dueDateRef.current) {
                dueDateRef.current.focus();
            }
            return;
        }

        setClientErrors({});
        const success = await onSubmit({ borrowerId, bookId, dueDate });
        if (success) {
            setBorrowerId("");
            setBookId("");
            setDueDate(defaultDueDate());
        }
    };

    return (
        <section className="loan-form-section" aria-labelledby="loan-form-title">
            <h2 id="loan-form-title" className="loan-form-section__title">
                Issue a book loan
            </h2>
            <p className="loan-form-section__desc">
                Select a registered borrower, an available book from the catalog, and a due date.
            </p>

            <form className="loan-form" onSubmit={handleSubmit} noValidate>
                <div className="loan-form__grid">
                    {/* Borrower picker */}
                    <div className="loan-form__group">
                        <label htmlFor="loan-borrower-select" className="loan-form__label">
                            Borrower
                        </label>
                        <select
                            id="loan-borrower-select"
                            ref={borrowerRef}
                            className="loan-form__select"
                            value={borrowerId}
                            onChange={(e) => {
                                setBorrowerId(e.target.value);
                                if (clientErrors.borrowerId) {
                                    setClientErrors((prev) => ({ ...prev, borrowerId: undefined }));
                                }
                            }}
                            disabled={submitting}
                            aria-invalid={Boolean(errors.borrowerId)}
                            aria-describedby={errors.borrowerId ? "loan-borrower-error" : undefined}
                            required
                        >
                            <option value="">Select a borrower</option>
                            {borrowers.map((b) => (
                                <option key={b.id || b._id} value={b.id || b._id}>
                                    {b.name} ({b.email})
                                </option>
                            ))}
                        </select>
                        {errors.borrowerId && (
                            <p id="loan-borrower-error" className="loan-form__error" role="alert">
                                {errors.borrowerId}
                            </p>
                        )}
                    </div>

                    {/* Book picker */}
                    <div className="loan-form__group">
                        <label htmlFor="loan-book-select" className="loan-form__label">
                            Book
                        </label>
                        <select
                            id="loan-book-select"
                            ref={bookRef}
                            className="loan-form__select"
                            value={bookId}
                            onChange={(e) => {
                                setBookId(e.target.value);
                                if (clientErrors.bookId) {
                                    setClientErrors((prev) => ({ ...prev, bookId: undefined }));
                                }
                            }}
                            disabled={submitting}
                            aria-invalid={Boolean(errors.bookId)}
                            aria-describedby={errors.bookId ? "loan-book-error" : undefined}
                            required
                        >
                            <option value="">Select an available book</option>
                            {availableBooks.map((book) => {
                                const avail = getAvailability(book);
                                return (
                                    <option key={book.id || book._id} value={book.id || book._id}>
                                        {book.title} ({avail.available} available)
                                    </option>
                                );
                            })}
                        </select>
                        {errors.bookId && (
                            <p id="loan-book-error" className="loan-form__error" role="alert">
                                {errors.bookId}
                            </p>
                        )}
                        {availableBooks.length === 0 && books.length > 0 && (
                            <span className="loan-form__hint">
                                All copies in the catalog are currently issued.
                            </span>
                        )}
                    </div>

                    {/* Due date input */}
                    <div className="loan-form__group">
                        <label htmlFor="loan-due-date-input" className="loan-form__label">
                            Due date
                        </label>
                        <input
                            type="date"
                            id="loan-due-date-input"
                            ref={dueDateRef}
                            className="loan-form__input"
                            value={dueDate}
                            min={minDueDate}
                            onChange={(e) => {
                                setDueDate(e.target.value);
                                if (clientErrors.dueDate) {
                                    setClientErrors((prev) => ({ ...prev, dueDate: undefined }));
                                }
                            }}
                            disabled={submitting}
                            aria-invalid={Boolean(errors.dueDate)}
                            aria-describedby={errors.dueDate ? "loan-due-date-error" : undefined}
                            required
                        />
                        {errors.dueDate && (
                            <p id="loan-due-date-error" className="loan-form__error" role="alert">
                                {errors.dueDate}
                            </p>
                        )}
                    </div>
                </div>

                <div className="loan-form__actions">
                    <button
                        type="submit"
                        className="loan-button loan-button--primary"
                        disabled={submitting}
                    >
                        {submitting ? "Issuing book…" : "Issue book"}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default LoanForm;
