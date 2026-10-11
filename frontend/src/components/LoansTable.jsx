import { formatDate } from "../utils/loans.js";
import ReturnButton from "./ReturnButton.jsx";

/**
 * Loans table rendering as a desktop data table and transforming
 * into stacked cards on viewports under 800px.
 */
const LoansTable = ({
    loans = [],
    isAdmin = false,
    onReturn,
}) => {
    return (
        <div className="loans-table-wrapper">
            <table className="loans-table" aria-label="Loans list">
                <thead>
                    <tr>
                        <th scope="col">Book</th>
                        {isAdmin && <th scope="col">Borrower</th>}
                        <th scope="col">Borrowed</th>
                        <th scope="col">Due Date</th>
                        <th scope="col">Status</th>
                        {isAdmin && <th scope="col">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {loans.map((loan) => {
                        const statusClass = loan.status
                            ? `loan-badge--${loan.status.toLowerCase()}`
                            : "loan-badge--active";

                        return (
                            <tr key={loan.id || `${loan.bookId}-${loan.borrowerId}-${loan.dueDate}`}>
                                <td data-label="Book">
                                    <span className="loans-table__book-title">
                                        {loan.bookTitle}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td data-label="Borrower">
                                        <div>{loan.borrowerName}</div>
                                        {loan.borrowerEmail && (
                                            <div className="loans-table__borrower-email">
                                                {loan.borrowerEmail}
                                            </div>
                                        )}
                                    </td>
                                )}
                                <td data-label="Borrowed">
                                    {formatDate(loan.borrowedAt)}
                                </td>
                                <td data-label="Due Date">
                                    <div>{formatDate(loan.dueDate)}</div>
                                    {!loan.isReturned && loan.isOverdue && (
                                        <div style={{ color: "var(--error)", fontSize: "0.8rem", fontWeight: 600 }}>
                                            Past due
                                        </div>
                                    )}
                                </td>
                                <td data-label="Status">
                                    <span className={`loan-badge ${statusClass}`}>
                                        {loan.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td data-label="Actions">
                                        <ReturnButton
                                            loan={loan}
                                            onReturn={onReturn}
                                        />
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default LoansTable;
