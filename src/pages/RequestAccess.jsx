import { useState } from "react";
import { Link } from "react-router-dom";
import { FaDumbbell, FaUser, FaLock, FaPhone, FaIdBadge } from "react-icons/fa";
import { apiRequest } from "../api";

function RequestAccess() {
  const [form, setForm] = useState({ fullName: "", username: "", extension: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.username || !form.password) {
      setError("Please fill your name, username and password.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/auth/request-agent", {
        method: "POST",
        body: {
          fullName: form.fullName,
          username: form.username,
          extension: form.extension,
          password: form.password,
        },
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
            <h1>ManForce CRM</h1>
            <p>Request Agent Access</p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="tab-success" style={{ marginBottom: "16px" }}>{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <div className="input-with-icon">
              <FaIdBadge />
              <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} autoFocus />
            </div>

            <label>Desired Username</label>
            <div className="input-with-icon">
              <FaUser />
              <input value={form.username} onChange={(e) => setField("username", e.target.value)} />
            </div>

            <label>Extension (optional)</label>
            <div className="input-with-icon">
              <FaPhone />
              <input value={form.extension} onChange={(e) => setField("extension", e.target.value)} />
            </div>

            <label>Password</label>
            <div className="input-with-icon">
              <FaLock />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
              />
            </div>

            <label>Confirm Password</label>
            <div className="input-with-icon">
              <FaLock />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className="login-submit">
              {submitting ? "Submitting..." : "Send Request"}
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

export default RequestAccess;
