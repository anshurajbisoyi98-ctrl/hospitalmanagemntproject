import { request } from "./api.js";
import { toLoanPayload } from "../utils/loans.js";

/**
 * Retrieve active JWT token from persistent session storage if present.
 * @returns {string | null}
 */
const getAuthToken = () => {
    try {
        if (typeof window === "undefined" || !window.localStorage) return null;
        const raw = window.localStorage.getItem("lms_session");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token || null;
    } catch {
        return null;
    }
};

/**
 * Retrieve current user identifier from stored session if present.
 * @returns {string | null}
 */
const getStoredUserId = () => {
    try {
        if (typeof window === "undefined" || !window.localStorage) return null;
        const raw = window.localStorage.getItem("lms_session");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.user?.id || parsed?.user?._id || null;
    } catch {
        return null;
    }
};

/**
 * Issue a new book loan (Admin only).
 *
 * @param {{ bookId: string, borrowerId: string, dueDate: string }} loanData
 * @param {{ signal?: AbortSignal, token?: string }} [options]
 * @returns {Promise<any>}
 */
export const createLoan = async ({ bookId, borrowerId, dueDate }, { signal, token } = {}) => {
    const payload = toLoanPayload({ bookId, borrowerId, dueDate });
    const res = await request("/borrowings", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
        token: token || getAuthToken(),
    });
    return res?.data ?? res;
};

/**
 * Return an active loan record (Admin only).
 *
 * @param {string} id
 * @param {{ signal?: AbortSignal, token?: string }} [options]
 * @returns {Promise<any>}
 */
export const returnLoan = async (id, { signal, token } = {}) => {
    const encodedId = encodeURIComponent(id);
    const res = await request(`/borrowings/${encodedId}/return`, {
        method: "PATCH",
        signal,
        token: token || getAuthToken(),
    });
    return res?.data ?? res;
};

/**
 * Fetch all borrowing records across all users (Admin only).
 *
 * @param {{ signal?: AbortSignal, token?: string, status?: string, userId?: string, bookId?: string }} [options]
 * @returns {Promise<any>}
 */
export const getLoans = async ({ signal, token, status, userId, bookId } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (userId) params.set("userId", userId);
    if (bookId) params.set("bookId", bookId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await request(`/borrowings${qs}`, {
        signal,
        token: token || getAuthToken(),
    });
    return res?.data ?? res;
};

/**
 * Fetch borrowing records strictly for the currently authenticated user.
 *
 * @param {{ signal?: AbortSignal, token?: string, userId?: string }} [options]
 * @returns {Promise<any>}
 */
export const getMyLoans = async ({ signal, token, userId } = {}) => {
    const effectiveUserId = userId || getStoredUserId();
    const qs = effectiveUserId ? `?userId=${encodeURIComponent(effectiveUserId)}` : "";
    const res = await request(`/borrowings${qs}`, {
        signal,
        token: token || getAuthToken(),
    });
    return res?.data ?? res;
};

/**
 * Fetch minimal borrower list for selection (Admin only).
 *
 * @param {{ signal?: AbortSignal, token?: string }} [options]
 * @returns {Promise<any>}
 */
export const getBorrowers = async ({ signal, token } = {}) => {
    const res = await request("/users", {
        signal,
        token: token || getAuthToken(),
    });
    return res?.data ?? res;
};
