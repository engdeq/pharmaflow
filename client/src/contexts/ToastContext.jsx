import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { setFeedbackHandlers } from "../services/feedbackBridge";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState({ open: false, message: "Saving..." });
  const [success, setSuccess] = useState({ open: false, message: "Saved successfully" });
  const lastSuccessAt = useRef(0);
  const successOpenRef = useRef(false);
  const successTimer = useRef(null);

  const pushToast = useCallback((message, type = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const showLoading = useCallback((message = "Saving...") => {
    setLoading({ open: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading((prev) => ({ ...prev, open: false }));
  }, []);

  const showSuccess = useCallback((message = "Saved successfully") => {
    const now = Date.now();
    // Avoid duplicate success dialogs from api + page toast.success
    if (successOpenRef.current && now - lastSuccessAt.current < 1200) {
      setSuccess({ open: true, message: message || "Saved successfully" });
      return;
    }
    lastSuccessAt.current = now;
    successOpenRef.current = true;
    setLoading((prev) => ({ ...prev, open: false }));
    setSuccess({ open: true, message: message || "Saved successfully" });
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      successOpenRef.current = false;
      setSuccess((prev) => ({ ...prev, open: false }));
    }, 1800);
  }, []);

  const closeSuccess = useCallback(() => {
    if (successTimer.current) clearTimeout(successTimer.current);
    successOpenRef.current = false;
    setSuccess((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    setFeedbackHandlers({
      showLoading,
      hideLoading,
      success: showSuccess,
      error: (m) => {
        hideLoading();
        pushToast(m, "error");
      },
    });
  }, [showLoading, hideLoading, showSuccess, pushToast]);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    []
  );

  const value = useMemo(
    () => ({
      success: (m) => showSuccess(m),
      error: (m) => {
        hideLoading();
        pushToast(m, "error");
      },
      info: (m) => pushToast(m, "info"),
      showLoading,
      hideLoading,
      showSuccess,
    }),
    [showLoading, hideLoading, showSuccess, pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>

      {loading.open ? (
        <div className="feedback-overlay" role="alert" aria-live="assertive">
          <div className="feedback-card feedback-loading">
            <div className="feedback-spinner">
              <Loader2 size={34} className="spin" />
            </div>
            <strong>{loading.message}</strong>
            <span>Please wait a moment…</span>
          </div>
        </div>
      ) : null}

      {success.open ? (
        <div className="feedback-overlay" role="status" aria-live="polite" onClick={closeSuccess}>
          <div className="feedback-card feedback-success" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="feedback-close" onClick={closeSuccess} aria-label="Close">
              <X size={16} />
            </button>
            <div className="feedback-check">
              <CheckCircle2 size={42} />
            </div>
            <strong>{success.message}</strong>
            <span>Your changes were saved.</span>
            <button type="button" className="btn btn-primary" onClick={closeSuccess}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function useFeedback() {
  return useContext(ToastContext);
}
