/**
 * Pure ES module utility helpers for loans and borrowing.
 * Never throws on missing or invalid inputs.
 */

/**
 * Extract calendar date parts (year, month 1-12, day 1-31, dateString YYYY-MM-DD).
 * Plain YYYY-MM-DD strings are parsed without timezone offsets.
 * Timestamps/Dates are parsed in the local timezone.
 *
 * @param {string | Date | number | null | undefined} input
 * @returns {{ year: number, month: number, day: number, dateString: string } | null}
 */
export const getCalendarDateParts = (input) => {
    if (!input) return null;

    if (typeof input === "string") {
        const trimmed = input.trim();
        // If it's a date-only string like YYYY-MM-DD
        const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const month = Number(dateOnlyMatch[2]);
            const day = Number(dateOnlyMatch[3]);
            return {
                year,
                month,
                day,
                dateString: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            };
        }
    }

    try {
        const d = input instanceof Date ? input : new Date(input);
        if (Number.isNaN(d.getTime())) return null;

        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return {
            year,
            month,
            day,
            dateString: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        };
    } catch {
        return null;
    }
};

/**
 * Returns default due date as today + 14 days formatted as YYYY-MM-DD in local time.
 * Handles month/year rollover and leap years safely.
 *
 * @param {Date | string | number} [now=new Date()]
 * @returns {string}
 */
export const defaultDueDate = (now = new Date()) => {
    try {
        const base = now instanceof Date ? now : (now ? new Date(now) : new Date());
        const validBase = Number.isNaN(base.getTime()) ? new Date() : base;
        const target = new Date(validBase.getFullYear(), validBase.getMonth(), validBase.getDate() + 14);
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, "0");
        const d = String(target.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    } catch {
        return "";
    }
};

/**
 * Checks whether an active loan is overdue (due date strictly before today's calendar date).
 * Returned loans are never overdue.
 *
 * @param {object} loan
 * @param {Date | string | number} [now=new Date()]
 * @returns {boolean}
 */
export const isOverdue = (loan, now = new Date()) => {
    if (!loan || typeof loan !== "object") return false;

    const status = typeof loan.status === "string" ? loan.status.toLowerCase() : "";
    const isReturned = status === "returned" || Boolean(loan.returnedAt || loan.returnDate);
    if (isReturned) return false;

    const dueParts = getCalendarDateParts(loan.dueDate);
    if (!dueParts) return false;

    const nowParts = getCalendarDateParts(now);
    if (!nowParts) return false;

    return dueParts.dateString < nowParts.dateString;
};

/**
 * Returns the whole-day difference between dueDate and now in calendar days.
 * Positive = remaining days, 0 = due today, Negative = days past due.
 *
 * @param {string | Date} dueDate
 * @param {Date | string | number} [now=new Date()]
 * @returns {number | null}
 */
export const daysUntilDue = (dueDate, now = new Date()) => {
    try {
        const dueParts = getCalendarDateParts(dueDate);
        const nowParts = getCalendarDateParts(now);
        if (!dueParts || !nowParts) return null;

        const dueUtc = Date.UTC(dueParts.year, dueParts.month - 1, dueParts.day);
        const nowUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
        return Math.round((dueUtc - nowUtc) / (1000 * 60 * 60 * 24));
    } catch {
        return null;
    }
};

/**
 * Formats a date into a localized human-readable string (e.g. "Oct 25, 2026").
 * Prevents timezone offset off-by-one errors for calendar dates. Never throws.
 *
 * @param {string | Date | null | undefined} dateVal
 * @returns {string}
 */
export const formatDate = (dateVal) => {
    if (!dateVal) return "—";
    try {
        const parts = getCalendarDateParts(dateVal);
        if (!parts) return "—";
        const d = new Date(parts.year, parts.month - 1, parts.day);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
};

/**
 * Validates borrow form fields.
 * Borrower and book are required.
 * Due date is required, a real calendar date, after today, at most one year ahead.
 *
 * @param {{ bookId?: string, borrowerId?: string, dueDate?: string }} formValues
 * @param {Date | string | number} [now=new Date()]
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export const validateBorrowForm = (formValues = {}, now = new Date()) => {
    const errors = {};
    if (!formValues || typeof formValues !== "object") {
        return {
            valid: false,
            errors: {
                borrowerId: "Borrower is required.",
                bookId: "Book is required.",
                dueDate: "Due date is required.",
            },
        };
    }

    const borrowerId = formValues.borrowerId || formValues.userId;
    if (!borrowerId || typeof borrowerId !== "string" || borrowerId.trim() === "") {
        errors.borrowerId = "Borrower is required.";
    }

    const bookId = formValues.bookId;
    if (!bookId || typeof bookId !== "string" || bookId.trim() === "") {
        errors.bookId = "Book is required.";
    }

    const rawDue = formValues.dueDate;
    if (!rawDue || typeof rawDue !== "string" || rawDue.trim() === "") {
        errors.dueDate = "Due date is required.";
    } else {
        const trimmedDue = rawDue.trim();
        const match = trimmedDue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
            errors.dueDate = "Due date must be a valid calendar date.";
        } else {
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);

            if (month < 1 || month > 12) {
                errors.dueDate = "Due date must be a valid calendar date.";
            } else {
                const daysInMonth = new Date(year, month, 0).getDate();
                if (day < 1 || day > daysInMonth) {
                    errors.dueDate = "Due date must be a valid calendar date.";
                } else {
                    const todayParts = getCalendarDateParts(now);
                    const dueStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    if (!todayParts || dueStr <= todayParts.dateString) {
                        errors.dueDate = "Due date must be after today.";
                    } else {
                        const maxYear = todayParts.year + 1;
                        const maxDaysInTargetMonth = new Date(maxYear, todayParts.month, 0).getDate();
                        const maxDay = Math.min(todayParts.day, maxDaysInTargetMonth);
                        const maxStr = `${maxYear}-${String(todayParts.month).padStart(2, "0")}-${String(maxDay).padStart(2, "0")}`;

                        if (dueStr > maxStr) {
                            errors.dueDate = "Due date cannot be more than one year ahead.";
                        }
                    }
                }
            }
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
};

/**
 * Builds standard loan request payload.
 *
 * @param {{ bookId?: string, borrowerId?: string, dueDate?: string, userId?: string }} formValues
 * @returns {{ userId: string, borrowerId: string, bookId: string, dueDate: string }}
 */
export const toLoanPayload = (formValues = {}) => {
    if (!formValues || typeof formValues !== "object") {
        return { userId: "", borrowerId: "", bookId: "", dueDate: "" };
    }
    const borrower = formValues.borrowerId || formValues.userId || "";
    const bId = typeof borrower === "string" ? borrower.trim() : String(borrower);
    const book = formValues.bookId || "";
    const bkId = typeof book === "string" ? book.trim() : String(book);
    const due = formValues.dueDate || "";
    const dStr = typeof due === "string" ? due.trim() : String(due);

    return {
        userId: bId,
        borrowerId: bId,
        bookId: bkId,
        dueDate: dStr,
    };
};

/**
 * Normalizes a loan record safely without throwing on missing or unexpected values.
 *
 * @param {object} raw
 * @param {{ booksMap?: Map<string, object>, borrowersMap?: Map<string, object>, now?: Date | string | number }} [context={}]
 * @returns {object}
 */
export const normalizeLoan = (raw, context = {}) => {
    if (!raw || typeof raw !== "object") {
        return {
            id: "",
            _id: "",
            bookId: "",
            borrowerId: "",
            userId: "",
            bookTitle: "Untitled Book",
            borrowerName: "Unknown Borrower",
            borrowerEmail: "",
            borrowedAt: "",
            dueDate: "",
            returnedAt: null,
            status: "Active",
            rawStatus: "issued",
            isOverdue: false,
            isReturned: false,
            daysRemaining: null,
        };
    }

    const id = raw._id != null ? String(raw._id) : (raw.id != null ? String(raw.id) : "");

    // Book identification
    let bookId = "";
    let bookTitle = "";
    if (raw.bookId && typeof raw.bookId === "object") {
        bookId = String(raw.bookId._id || raw.bookId.id || "");
        bookTitle = typeof raw.bookId.title === "string" ? raw.bookId.title.trim() : "";
    } else if (raw.book && typeof raw.book === "object") {
        bookId = String(raw.book._id || raw.book.id || "");
        bookTitle = typeof raw.book.title === "string" ? raw.book.title.trim() : "";
    } else if (raw.bookId != null && typeof raw.bookId !== "object") {
        bookId = String(raw.bookId).trim();
    }

    if (!bookTitle && context.booksMap && bookId) {
        const found = context.booksMap.get(bookId);
        if (found) {
            bookTitle = found.title || "";
        }
    }
    if (!bookTitle && typeof raw.bookTitle === "string" && raw.bookTitle.trim()) {
        bookTitle = raw.bookTitle.trim();
    }
    if (!bookTitle) {
        bookTitle = "Untitled Book";
    }

    // Borrower identification
    let borrowerId = "";
    let borrowerName = "";
    let borrowerEmail = "";
    if (raw.userId && typeof raw.userId === "object") {
        borrowerId = String(raw.userId._id || raw.userId.id || "");
        borrowerName = typeof raw.userId.name === "string" ? raw.userId.name.trim() : "";
        borrowerEmail = typeof raw.userId.email === "string" ? raw.userId.email.trim() : "";
    } else if (raw.borrower && typeof raw.borrower === "object") {
        borrowerId = String(raw.borrower._id || raw.borrower.id || "");
        borrowerName = typeof raw.borrower.name === "string" ? raw.borrower.name.trim() : "";
        borrowerEmail = typeof raw.borrower.email === "string" ? raw.borrower.email.trim() : "";
    } else if (raw.userId != null && typeof raw.userId !== "object") {
        borrowerId = String(raw.userId).trim();
    } else if (raw.borrowerId != null && typeof raw.borrowerId !== "object") {
        borrowerId = String(raw.borrowerId).trim();
    }

    if ((!borrowerName || !borrowerEmail) && context.borrowersMap && borrowerId) {
        const found = context.borrowersMap.get(borrowerId);
        if (found) {
            if (!borrowerName) borrowerName = found.name || "";
            if (!borrowerEmail) borrowerEmail = found.email || "";
        }
    }
    if (!borrowerName && typeof raw.borrowerName === "string" && raw.borrowerName.trim()) {
        borrowerName = raw.borrowerName.trim();
    }
    if (!borrowerName) {
        borrowerName = "Unknown Borrower";
    }

    // Dates
    const rawBorrowed = raw.borrowedAt || raw.issueDate || raw.createdAt;
    const borrowedAt = rawBorrowed != null && typeof rawBorrowed !== "object" ? String(rawBorrowed) : "";

    const rawDue = raw.dueDate;
    const dueDate = rawDue != null && typeof rawDue !== "object" ? String(rawDue) : "";

    const rawReturned = raw.returnedAt !== undefined ? raw.returnedAt : (raw.returnDate !== undefined ? raw.returnDate : null);
    const returnedAt = rawReturned != null && rawReturned !== "" && typeof rawReturned !== "object" ? String(rawReturned) : null;

    // Status mapping
    const rawStatus = typeof raw.status === "string" ? raw.status.toLowerCase() : "";
    const isReturned = rawStatus === "returned" || returnedAt !== null;
    const overdue = !isReturned && isOverdue({ dueDate, status: rawStatus || "issued" }, context.now);

    let status = "Active";
    if (isReturned) {
        status = "Returned";
    } else if (overdue) {
        status = "Overdue";
    }

    const daysRemaining = !isReturned ? daysUntilDue(dueDate, context.now) : null;

    return {
        id,
        _id: id,
        bookId,
        borrowerId,
        userId: borrowerId,
        bookTitle,
        borrowerName,
        borrowerEmail,
        borrowedAt,
        dueDate,
        returnedAt,
        status,
        rawStatus: isReturned ? "returned" : "issued",
        isOverdue: overdue,
        isReturned,
        daysRemaining,
    };
};

/**
 * Maps API errors into user-friendly messages without exposing server internals.
 *
 * @param {any} err
 * @param {string} [fallback="An unexpected error occurred. Please try again."]
 * @returns {{ message: string, status: number, fieldErrors: Record<string, string>, isUnavailable?: boolean, isAlreadyReturned?: boolean }}
 */
export const mapLoanError = (err, fallback = "An unexpected error occurred. Please try again.") => {
    if (!err) return { message: fallback, status: 0, fieldErrors: {} };

    const status = err.status || 0;
    const serverMessage = String(err.serverData?.error?.message || err.message || "").toLowerCase();
    const fieldErrors = {};

    if (status === 400) {
        if (serverMessage.includes("user") || serverMessage.includes("borrower")) {
            fieldErrors.borrowerId = "Please select a valid borrower.";
        }
        if (serverMessage.includes("book")) {
            fieldErrors.bookId = "Please select a valid book.";
        }
        if (serverMessage.includes("due date") || serverMessage.includes("date")) {
            fieldErrors.dueDate = "Please provide a valid future due date.";
        }
        const message = err.serverData?.error?.message || "Please check the details you entered.";
        return { message, status, fieldErrors };
    }

    if (status === 401) {
        return {
            message: "Your session has expired. Please sign in again.",
            status,
            fieldErrors,
        };
    }

    if (status === 403) {
        return {
            message: "You do not have permission to do this.",
            status,
            fieldErrors,
        };
    }

    if (status === 404) {
        return {
            message: "This loan, book or borrower no longer exists.",
            status,
            fieldErrors,
        };
    }

    if (status === 409) {
        if (serverMessage.includes("already been returned") || serverMessage.includes("already returned")) {
            return {
                message: "This loan has already been returned.",
                status,
                fieldErrors,
                isAlreadyReturned: true,
            };
        }
        if (serverMessage.includes("no available copies") || serverMessage.includes("available copies")) {
            return {
                message: "No copies of this book are available.",
                status,
                fieldErrors,
                isUnavailable: true,
            };
        }
        if (serverMessage.includes("active loan")) {
            return {
                message: "This borrower already has an active loan for this book.",
                status,
                fieldErrors,
            };
        }
        return {
            message: "A conflict occurred with this loan request.",
            status,
            fieldErrors,
        };
    }

    if (status === 0) {
        return {
            message: "Cannot reach the server. Check your connection and try again.",
            status,
            fieldErrors,
        };
    }

    if (status >= 500) {
        return {
            message: "Something went wrong on our side. Please try again.",
            status,
            fieldErrors,
        };
    }

    return { message: fallback, status, fieldErrors };
};
