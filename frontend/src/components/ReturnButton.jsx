import { useEffect, useRef, useState } from "react";

/**
 * Return action button with native confirmation dialog and focus management.
 */
const ReturnButton = ({ loan, onReturn, disabled = false }) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const triggerRef = useRef(null);
    const dialogRef = useRef(null);
    const cancelBtnRef = useRef(null);

    const isReturned =
        loan?.isReturned ||
        loan?.status === "Returned" ||
        loan?.rawStatus === "returned";

    const handleOpen = () => {
        if (isReturned || submitting || disabled) return;
        setDialogOpen(true);
    };

    useEffect(() => {
        if (dialogOpen && dialogRef.current) {
            dialogRef.current.showModal();
            cancelBtnRef.current?.focus();
        }
    }, [dialogOpen]);

    const handleClose = () => {
        if (dialogRef.current?.open) {
            dialogRef.current.close();
        }
        setDialogOpen(false);
        triggerRef.current?.focus();
    };

    const handleConfirm = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await onReturn(loan.id);
        } finally {
            setSubmitting(false);
            handleClose();
        }
    };

    if (isReturned) {
        return (
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                Completed
            </span>
        );
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="loan-button loan-button--secondary"
                onClick={handleOpen}
                disabled={disabled || submitting}
                aria-label={`Return loan for ${loan.bookTitle || "book"}`}
            >
                {submitting ? "Returning…" : "Return"}
            </button>

            {dialogOpen && (
                <dialog
                    ref={dialogRef}
                    className="loan-dialog"
                    onCancel={(e) => {
                        e.preventDefault();
                        handleClose();
                    }}
                >
                    <h3 className="loan-dialog__title">Mark this loan as returned?</h3>
                    <p className="loan-dialog__desc">
                        This will mark <strong>{loan.bookTitle || "the book"}</strong> as returned
                        and restore 1 copy to the available catalog inventory.
                    </p>
                    <div className="loan-dialog__actions">
                        <button
                            ref={cancelBtnRef}
                            type="button"
                            className="loan-button loan-button--secondary"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="loan-button loan-button--primary"
                            onClick={handleConfirm}
                            disabled={submitting}
                        >
                            {submitting ? "Returning…" : "Confirm return"}
                        </button>
                    </div>
                </dialog>
            )}
        </>
    );
};

export default ReturnButton;
