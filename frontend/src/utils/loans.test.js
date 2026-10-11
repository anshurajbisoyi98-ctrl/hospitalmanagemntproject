import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    defaultDueDate,
    isOverdue,
    daysUntilDue,
    formatDate,
    validateBorrowForm,
    toLoanPayload,
    normalizeLoan,
    mapLoanError,
} from "./loans.js";

describe("defaultDueDate", () => {
    it("returns a date 14 days ahead in YYYY-MM-DD format", () => {
        const now = new Date(2026, 9, 11); // Oct 11, 2026
        const result = defaultDueDate(now);
        assert.equal(result, "2026-10-25");
    });

    it("handles month rollover correctly", () => {
        const now = new Date(2026, 9, 25); // Oct 25, 2026
        const result = defaultDueDate(now);
        assert.equal(result, "2026-11-08");
    });

    it("handles year rollover correctly", () => {
        const now = new Date(2026, 11, 25); // Dec 25, 2026
        const result = defaultDueDate(now);
        assert.equal(result, "2027-01-08");
    });

    it("handles leap year February (leap day 29)", () => {
        // 2024 is a leap year (February has 29 days)
        const now = new Date(2024, 1, 18); // Feb 18, 2024
        const result = defaultDueDate(now);
        assert.equal(result, "2024-03-03");

        const leapDay = new Date(2024, 1, 29); // Feb 29, 2024
        assert.equal(defaultDueDate(leapDay), "2024-03-14");
    });

    it("handles non-leap year February (28 days)", () => {
        // 2025 is not a leap year (February has 28 days)
        const now = new Date(2025, 1, 18); // Feb 18, 2025
        const result = defaultDueDate(now);
        assert.equal(result, "2025-03-04");
    });

    it("handles string dates and fallback gracefully", () => {
        const strDate = "2026-05-10";
        assert.equal(defaultDueDate(strDate), "2026-05-24");
        assert.match(defaultDueDate(), /^\d{4}-\d{2}-\d{2}$/);
    });
});

describe("isOverdue", () => {
    const fixedNow = new Date(2026, 9, 15); // Oct 15, 2026

    it("returns true for active loans with due date before today (past due)", () => {
        const loan = { dueDate: "2026-10-14", status: "issued" };
        assert.equal(isOverdue(loan, fixedNow), true);
    });

    it("returns false for active loans due today", () => {
        const loan = { dueDate: "2026-10-15", status: "issued" };
        assert.equal(isOverdue(loan, fixedNow), false);
    });

    it("returns false for active loans due in the future", () => {
        const loan = { dueDate: "2026-10-20", status: "issued" };
        assert.equal(isOverdue(loan, fixedNow), false);
    });

    it("returns false for returned loans even if the due date was in the past", () => {
        const loan = {
            dueDate: "2026-10-10",
            status: "returned",
            returnDate: "2026-10-12",
        };
        assert.equal(isOverdue(loan, fixedNow), false);
    });

    it("returns false for loans with returnedAt field populated", () => {
        const loan = {
            dueDate: "2026-10-01",
            status: "issued",
            returnedAt: "2026-10-05T10:00:00.000Z",
        };
        assert.equal(isOverdue(loan, fixedNow), false);
    });

    it("handles null, undefined and invalid loan objects without throwing", () => {
        assert.equal(isOverdue(null, fixedNow), false);
        assert.equal(isOverdue(undefined, fixedNow), false);
        assert.equal(isOverdue({}, fixedNow), false);
        assert.equal(isOverdue({ dueDate: "invalid-date" }, fixedNow), false);
        assert.equal(isOverdue("not-an-object", fixedNow), false);
    });
});

describe("daysUntilDue", () => {
    const fixedNow = new Date(2026, 9, 15); // Oct 15, 2026

    it("returns positive days for future due dates", () => {
        assert.equal(daysUntilDue("2026-10-20", fixedNow), 5);
    });

    it("returns 0 for due date today", () => {
        assert.equal(daysUntilDue("2026-10-15", fixedNow), 0);
    });

    it("returns negative days for overdue dates", () => {
        assert.equal(daysUntilDue("2026-10-12", fixedNow), -3);
    });

    it("returns null for invalid dates without throwing", () => {
        assert.equal(daysUntilDue(null, fixedNow), null);
        assert.equal(daysUntilDue("invalid", fixedNow), null);
    });
});

describe("formatDate", () => {
    it("formats calendar date string without timezone shift", () => {
        const formatted = formatDate("2026-10-25");
        assert.match(formatted, /Oct 25, 2026/);
    });

    it("formats ISO timestamps properly", () => {
        const formatted = formatDate("2026-10-25T12:00:00.000Z");
        assert.ok(formatted.includes("2026"));
    });

    it("returns dash fallback for empty or invalid inputs", () => {
        assert.equal(formatDate(null), "—");
        assert.equal(formatDate(""), "—");
        assert.equal(formatDate("not-a-date"), "—");
    });
});

describe("validateBorrowForm", () => {
    const fixedNow = new Date(2026, 9, 15); // Oct 15, 2026

    it("rejects missing borrowerId", () => {
        const res = validateBorrowForm(
            { borrowerId: "", bookId: "b1", dueDate: "2026-10-20" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.borrowerId, "Borrower is required.");
    });

    it("rejects missing bookId", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "   ", dueDate: "2026-10-20" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.bookId, "Book is required.");
    });

    it("rejects missing dueDate", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date is required.");
    });

    it("rejects due date in the past", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2026-10-14" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date must be after today.");
    });

    it("rejects due date equal to today (must be strictly after today)", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2026-10-15" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date must be after today.");
    });

    it("rejects non-existent calendar date strings like 2026-02-30", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2026-02-30" },
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date must be a valid calendar date.");
    });

    it("rejects invalid leap year dates like 2025-02-29", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2025-02-29" },
            new Date(2025, 0, 1)
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date must be a valid calendar date.");
    });

    it("accepts valid leap year date like 2028-02-29", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2028-02-29" },
            new Date(2027, 2, 1)
        );
        assert.equal(res.valid, true);
        assert.deepEqual(res.errors, {});
    });

    it("rejects due date more than one year ahead", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2027-10-16" }, // > 1 year after 2026-10-15
            fixedNow
        );
        assert.equal(res.valid, false);
        assert.equal(res.errors.dueDate, "Due date cannot be more than one year ahead.");
    });

    it("accepts valid form with future due date within one year", () => {
        const res = validateBorrowForm(
            { borrowerId: "u1", bookId: "b1", dueDate: "2026-10-29" },
            fixedNow
        );
        assert.equal(res.valid, true);
        assert.deepEqual(res.errors, {});
    });

    it("handles null or undefined form object safely", () => {
        const res = validateBorrowForm(null, fixedNow);
        assert.equal(res.valid, false);
        assert.ok(res.errors.borrowerId);
        assert.ok(res.errors.bookId);
        assert.ok(res.errors.dueDate);
    });
});

describe("toLoanPayload", () => {
    it("maps borrowerId, bookId, and dueDate correctly", () => {
        const payload = toLoanPayload({
            borrowerId: "user-123",
            bookId: "book-456",
            dueDate: "2026-10-30",
        });
        assert.deepEqual(payload, {
            userId: "user-123",
            borrowerId: "user-123",
            bookId: "book-456",
            dueDate: "2026-10-30",
        });
    });

    it("falls back to userId if borrowerId is omitted", () => {
        const payload = toLoanPayload({
            userId: "user-789",
            bookId: "book-456",
            dueDate: "2026-10-30",
        });
        assert.equal(payload.userId, "user-789");
        assert.equal(payload.borrowerId, "user-789");
    });

    it("handles null and empty input safely", () => {
        const payload = toLoanPayload(null);
        assert.deepEqual(payload, {
            userId: "",
            borrowerId: "",
            bookId: "",
            dueDate: "",
        });
    });
});

describe("normalizeLoan", () => {
    const fixedNow = new Date(2026, 9, 15);

    it("normalizes a complete backend loan record", () => {
        const raw = {
            _id: "loan-1",
            bookId: "book-1",
            userId: "user-1",
            issueDate: "2026-10-01T00:00:00.000Z",
            dueDate: "2026-10-20",
            status: "issued",
        };
        const booksMap = new Map([["book-1", { title: "Dune" }]]);
        const borrowersMap = new Map([["user-1", { name: "Alice", email: "alice@test.com" }]]);

        const loan = normalizeLoan(raw, { booksMap, borrowersMap, now: fixedNow });
        assert.equal(loan.id, "loan-1");
        assert.equal(loan.bookId, "book-1");
        assert.equal(loan.bookTitle, "Dune");
        assert.equal(loan.borrowerName, "Alice");
        assert.equal(loan.borrowerEmail, "alice@test.com");
        assert.equal(loan.dueDate, "2026-10-20");
        assert.equal(loan.status, "Active");
        assert.equal(loan.isOverdue, false);
        assert.equal(loan.isReturned, false);
        assert.equal(loan.daysRemaining, 5);
    });

    it("detects overdue active loan", () => {
        const raw = {
            id: "loan-2",
            bookId: "book-2",
            userId: "user-2",
            dueDate: "2026-10-10",
            status: "issued",
        };
        const loan = normalizeLoan(raw, { now: fixedNow });
        assert.equal(loan.status, "Overdue");
        assert.equal(loan.isOverdue, true);
        assert.equal(loan.isReturned, false);
    });

    it("normalizes returned loan status", () => {
        const raw = {
            id: "loan-3",
            dueDate: "2026-10-05",
            status: "returned",
            returnDate: "2026-10-06T00:00:00.000Z",
        };
        const loan = normalizeLoan(raw, { now: fixedNow });
        assert.equal(loan.status, "Returned");
        assert.equal(loan.isReturned, true);
        assert.equal(loan.isOverdue, false);
    });

    it("handles populated book and user objects", () => {
        const raw = {
            _id: "loan-4",
            bookId: { _id: "b-100", title: "Neuromancer" },
            userId: { _id: "u-200", name: "Bob", email: "bob@test.com" },
            dueDate: "2026-10-22",
            status: "issued",
        };
        const loan = normalizeLoan(raw, { now: fixedNow });
        assert.equal(loan.bookId, "b-100");
        assert.equal(loan.bookTitle, "Neuromancer");
        assert.equal(loan.borrowerId, "u-200");
        assert.equal(loan.borrowerName, "Bob");
        assert.equal(loan.borrowerEmail, "bob@test.com");
    });

    it("handles missing and wrong-typed fields without throwing", () => {
        assert.doesNotThrow(() => {
            const l1 = normalizeLoan(null);
            assert.equal(l1.id, "");
            assert.equal(l1.bookTitle, "Untitled Book");
            assert.equal(l1.borrowerName, "Unknown Borrower");

            const l2 = normalizeLoan(12345);
            assert.equal(l2.id, "");

            const l3 = normalizeLoan({
                _id: null,
                bookId: 999,
                userId: ["array"],
                status: 42,
                dueDate: {},
            });
            assert.equal(l3.id, "");
            assert.equal(l3.status, "Active");
        });
    });
});

describe("mapLoanError", () => {
    it("maps 409 unavailable book error", () => {
        const err = {
            status: 409,
            serverData: { error: { message: "No available copies for this book" } },
        };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "No copies of this book are available.");
        assert.equal(mapped.isUnavailable, true);
    });

    it("maps 409 already returned error", () => {
        const err = {
            status: 409,
            serverData: { error: { message: "Book has already been returned" } },
        };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "This loan has already been returned.");
        assert.equal(mapped.isAlreadyReturned, true);
    });

    it("maps 403 forbidden error", () => {
        const err = { status: 403 };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "You do not have permission to do this.");
    });

    it("maps 404 not found error", () => {
        const err = { status: 404 };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "This loan, book or borrower no longer exists.");
    });

    it("maps 400 validation error with field mapping", () => {
        const err = {
            status: 400,
            serverData: { error: { message: "Valid bookId is required" } },
        };
        const mapped = mapLoanError(err);
        assert.equal(mapped.fieldErrors.bookId, "Please select a valid book.");
    });

    it("maps 0 network failure safely", () => {
        const err = { status: 0 };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "Cannot reach the server. Check your connection and try again.");
    });

    it("maps 500 server error safely", () => {
        const err = { status: 500 };
        const mapped = mapLoanError(err);
        assert.equal(mapped.message, "Something went wrong on our side. Please try again.");
    });
});
