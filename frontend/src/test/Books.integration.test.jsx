import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Books from "../pages/Books.jsx";

const { getBooksMock, useAuthMock } = vi.hoisted(() => ({
    getBooksMock: vi.fn(),
    useAuthMock: vi.fn(),
}));

vi.mock("../services/bookService.js", () => ({ getBooks: getBooksMock }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: useAuthMock }));

const renderCatalog = (route = "/books") => render(
    <MemoryRouter initialEntries={[route]}>
        <Routes>
            <Route path="/books" element={<Books />} />
        </Routes>
    </MemoryRouter>
);

describe("catalog page integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthMock.mockReturnValue({
            user: { id: "reader-1", role: "User" },
            token: "reader-token"
        });
    });

    it("loads filtered deep links and renders API book results", async () => {
        getBooksMock.mockResolvedValue([{
            id: "book-1",
            title: "Dune",
            author: "Frank Herbert",
            ISBN: "978-0441172719",
            category: "Science Fiction",
            totalCopies: 2,
            availableCopies: 1
        }]);

        renderCatalog("/books?q=dune&category=Science%20Fiction");

        expect(await screen.findByText("Dune")).toBeTruthy();
        expect(getBooksMock).toHaveBeenCalledWith(expect.objectContaining({
            q: "dune",
            category: "Science Fiction",
            token: "reader-token"
        }));
    });

    it("submits search changes and exposes empty and error states accessibly", async () => {
        getBooksMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("API unavailable"));
        renderCatalog();

        expect(await screen.findByText("No books in the catalog yet.")).toBeTruthy();
        const search = screen.getByLabelText("Search catalog");
        fireEvent.change(search, { target: { value: "catalog" } });
        fireEvent.keyDown(search, { key: "Enter" });

        await waitFor(() => {
            expect(getBooksMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "catalog" }));
        });
        const errorAlert = await screen.findByRole("alert");
        expect(errorAlert.textContent).toContain("Couldn't load results for 'catalog'.");
    });
});
