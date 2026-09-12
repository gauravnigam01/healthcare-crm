import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaDumbbell, FaLock } from "react-icons/fa";
import { apiRequest } from "../api";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: form.newPassword },
      });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <FaDumbbell />
          <div>
            <h1>HealVerse CRM</h1>
            <p>Set a new password</p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        {done ? (
          <div className="tab-success">Password updated! Redirecting to sign in...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>New Password</label>
            <div className="input-with-icon">
              <FaLock />
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                autoFocus
              />
            </div>

            <label>Confirm New Password</label>
            <div className="input-with-icon">
              <FaLock />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={submitting} className="login-submit">
              {submitting ? "Saving..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="login-hint">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
