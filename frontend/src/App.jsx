import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Books from "./pages/Books.jsx";
import BookDetail from "./pages/BookDetail.jsx";
import AdminLoans from "./pages/AdminLoans.jsx";
import MyLoans from "./pages/MyLoans.jsx";
import BookNew from "./pages/BookNew.jsx";
import BookEdit from "./pages/BookEdit.jsx";
import "./styles/auth.css";
import "./styles/catalog.css";
import "./styles/loans.css";

const AdminRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const wasAuthRef = useRef(isAuthenticated);

    useEffect(() => {
        wasAuthRef.current = isAuthenticated;
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        if (wasAuthRef.current) {
            return <Navigate to="/login" state={{ expired: true, from: location }} replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role !== "Admin") {
        return (
            <main className="no-access">
                <h1>Access denied</h1>
                <p>You do not have access to this page.</p>
            </main>
        );
    }

    return children;
};

const App = () => {
    return (
        <AuthProvider>
            <Navbar />

            <main>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Navigate to="/books" replace />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/books"
                        element={
                            <ProtectedRoute>
                                <Books />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/books/:id"
                        element={
                            <ProtectedRoute>
                                <BookDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/loans"
                        element={
                            <ProtectedRoute role="Admin">
                                <AdminLoans />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-loans"
                        element={
                            <ProtectedRoute>
                                <MyLoans />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/books/new"
                        element={
                            <AdminRoute>
                                <BookNew />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="/admin/books/:id/edit"
                        element={
                            <AdminRoute>
                                <BookEdit />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <div style={{ maxWidth: 960, margin: "3rem auto", padding: "0 1rem" }}>
                                <h1>Page not found</h1>
                                <a href="/">Return home</a>
                            </div>
                        }
                    />
                </Routes>
            </main>
        </AuthProvider>
    );
};

export default App;
