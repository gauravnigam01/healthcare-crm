import { useState } from "react";
import { Link } from "react-router-dom";
import { FaDumbbell, FaEnvelope } from "react-icons/fa";
import { apiRequest } from "../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setMessage(data.message);
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
            <p>Reset your password</p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="tab-success" style={{ marginBottom: "16px" }}>{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit}>
            <label>Registered Email</label>
            <div className="input-with-icon">
              <FaEnvelope />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" disabled={submitting} className="login-submit">
              {submitting ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
