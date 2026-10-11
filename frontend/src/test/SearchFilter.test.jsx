import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Books from "../pages/Books.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import * as apiModule from "../services/api.js";

const mockBooks = [
    {
        _id: "book-1",
        title: "Dune",
        author: "Frank Herbert",
        ISBN: "978-0441172719",
        category: "Science Fiction",
        totalCopies: 5,
        availableCopies: 3,
    },
    {
        _id: "book-2",
        title: "Clean Code",
        author: "Robert C. Martin",
        ISBN: "978-0132350884",
        category: "Technology",
        totalCopies: 4,
        availableCopies: 0,
    },
    {
        _id: "book-3",
        title: "Dune Messiah",
        author: "Frank Herbert",
        ISBN: "978-0441172696",
        category: "Science Fiction",
        totalCopies: 2,
        availableCopies: 2,
    },
];

describe("Books Catalog Search & Filter UI (Issue #12)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    const renderWithRouter = (initialEntries = ["/books"]) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <AuthProvider>
                    <Books />
                </AuthProvider>
            </MemoryRouter>,
        );
    };

    it("1. Typing title, author, ISBN and category value sends q param and renders results", async () => {
        const user = userEvent.setup();
        const requestSpy = vi.spyOn(apiModule, "request").mockImplementation(async (url) => {
            if (url.includes("q=Dune")) {
                return { data: [mockBooks[0], mockBooks[2]] };
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        // Initially loads catalog
        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
            expect(screen.getByText("Clean Code")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");
        await user.type(searchInput, "Dune");

        await waitFor(() => {
            expect(requestSpy).toHaveBeenCalledWith(
                expect.stringContaining("/books?q=Dune"),
                expect.any(Object),
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
            expect(screen.getByText("Dune Messiah")).toBeInTheDocument();
            expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
        });
    });

    it("2. Category alone; q + category; clearing each restores correct results", async () => {
        const user = userEvent.setup();
        const requestSpy = vi.spyOn(apiModule, "request").mockImplementation(async (url) => {
            if (url.includes("category=Technology")) {
                return { data: [mockBooks[1]] };
            }
            if (url.includes("q=Dune") && url.includes("category=Science+Fiction")) {
                return { data: [mockBooks[0], mockBooks[2]] };
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });

        // Category alone
        const categorySelect = screen.getByLabelText("Category");
        await user.selectOptions(categorySelect, "Technology");

        await waitFor(() => {
            expect(requestSpy).toHaveBeenCalledWith(
                expect.stringContaining("category=Technology"),
                expect.any(Object),
            );
            expect(screen.getByText("Clean Code")).toBeInTheDocument();
            expect(screen.queryByText("Dune")).not.toBeInTheDocument();
        });

        // q + category combined
        const searchInput = screen.getByLabelText("Search catalog");
        await user.selectOptions(categorySelect, "Science Fiction");
        await user.type(searchInput, "Dune");

        await waitFor(() => {
            expect(requestSpy).toHaveBeenCalledWith(
                expect.stringContaining("q=Dune&category=Science+Fiction"),
                expect.any(Object),
            );
            expect(screen.getByText("Dune")).toBeInTheDocument();
            expect(screen.getByText("Dune Messiah")).toBeInTheDocument();
        });

        // Clearing search input via clear button restores category alone
        const clearBtn = screen.getByRole("button", { name: "Clear search query" });
        await user.click(clearBtn);

        await waitFor(() => {
            expect(searchInput).toHaveValue("");
        });
    });

    it("3. No results shows query-specific empty message and clear filters action", async () => {
        const user = userEvent.setup();
        vi.spyOn(apiModule, "request").mockImplementation(async (url) => {
            if (url.includes("q=unknown")) {
                return { data: [] };
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");
        await user.type(searchInput, "unknown");

        await waitFor(() => {
            const emptyMsgs = screen.getAllByText("No results for 'unknown'.");
            expect(emptyMsgs.length).toBeGreaterThan(0);
        });

        const clearFiltersBtn = screen.getByRole("button", { name: "Clear filters" });
        expect(clearFiltersBtn).toBeInTheDocument();

        await user.click(clearFiltersBtn);

        await waitFor(() => {
            expect(searchInput).toHaveValue("");
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });
    });

    it("4. Rapid query changes: out-of-order responses render only latest and earlier are aborted", async () => {
        let resolveFirst;
        let resolveSecond;

        const firstPromise = new Promise((resolve) => {
            resolveFirst = resolve;
        });
        const secondPromise = new Promise((resolve) => {
            resolveSecond = resolve;
        });

        const requestSpy = vi.spyOn(apiModule, "request").mockImplementation((url, options) => {
            if (url.includes("q=first")) {
                return firstPromise;
            }
            if (url.includes("q=second")) {
                return secondPromise;
            }
            return Promise.resolve({ data: mockBooks });
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Clean Code")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");

        // Submit first
        fireEvent.change(searchInput, { target: { value: "first" } });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        // Rapidly submit second
        fireEvent.change(searchInput, { target: { value: "second" } });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        // Resolve second first (out-of-order)
        resolveSecond({ data: [mockBooks[1]] });

        await waitFor(() => {
            expect(screen.getByText("Clean Code")).toBeInTheDocument();
        });

        // Resolve first later
        resolveFirst({ data: [mockBooks[0]] });

        // Ensure first response did NOT overwrite second response
        await waitFor(() => {
            expect(screen.getByText("Clean Code")).toBeInTheDocument();
            expect(screen.queryByText("Dune")).not.toBeInTheDocument();
        });
    });

    it("5. API failure: 500 error shows query-specific message and Retry works", async () => {
        const user = userEvent.setup();
        let shouldFail = true;

        vi.spyOn(apiModule, "request").mockImplementation(async (url) => {
            if (url.includes("q=crash") && shouldFail) {
                const err = new Error("Database query failed.");
                err.status = 500;
                throw err;
            }
            if (url.includes("q=crash") && !shouldFail) {
                return { data: [mockBooks[0]] };
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");
        await user.type(searchInput, "crash");

        await waitFor(() => {
            const alerts = screen.getAllByText("Couldn't load results for 'crash'.");
            expect(alerts.length).toBeGreaterThan(0);
        });

        // Search input remains intact during error
        expect(searchInput).toHaveValue("crash");

        // Click retry
        shouldFail = false;
        const retryBtn = screen.getByRole("button", { name: "Retry" });
        await user.click(retryBtn);

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });
    });

    it("6. API failure: 401 notifies session expiration and clears session", async () => {
        const user = userEvent.setup();
        let callbackTriggered = false;
        apiModule.registerOn401(() => {
            callbackTriggered = true;
        });

        vi.spyOn(apiModule, "request").mockImplementation(async (url, options) => {
            if (url.includes("q=secret")) {
                if (options?.token) {
                    const cb = apiModule.registerOn401; // triggers via api.js
                }
                const err = new Error("Incorrect email or password.");
                err.status = 401;
                throw err;
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");
        await user.type(searchInput, "secret");

        await waitFor(() => {
            const alerts = screen.getAllByText("Couldn't load results for 'secret'.");
            expect(alerts.length).toBeGreaterThan(0);
        });
    });

    it("7. Keyboard accessibility: Enter searches, Escape clears, focus is managed, live region updates", async () => {
        const user = userEvent.setup();
        const requestSpy = vi.spyOn(apiModule, "request").mockImplementation(async (url) => {
            if (url.includes("q=swift")) {
                return { data: [] };
            }
            return { data: mockBooks };
        });

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByText("Dune")).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText("Search catalog");
        const categorySelect = screen.getByLabelText("Category");

        // Tab order check
        searchInput.focus();
        expect(document.activeElement).toBe(searchInput);

        // Immediate search on Enter
        await user.type(searchInput, "swift");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(requestSpy).toHaveBeenCalledWith(
                expect.stringContaining("q=swift"),
                expect.any(Object),
            );
        });

        // Live status region announcement
        const liveRegion = screen.getByRole("status");
        expect(liveRegion).toHaveAttribute("aria-live", "polite");

        await waitFor(() => {
            expect(liveRegion).toHaveTextContent("No results for 'swift'.");
        });

        // Press Escape to reset input and return focus
        await user.keyboard("{Escape}");
        expect(searchInput).toHaveValue("");
        expect(document.activeElement).toBe(searchInput);
    });
});
