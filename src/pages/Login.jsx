import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaDumbbell, FaLock, FaUser, FaClipboardList, FaPhoneVolume, FaBrain } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginAs, setLoginAs] = useState("agent");
  const [form, setForm] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Please enter username and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(form.username, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page login-page-split">
      <div className="login-showcase">
        <div className="login-showcase-brand">
          <FaDumbbell />
          <div>
            <strong>HealVerse CRM</strong>
            <span>Care Better. Sell Smarter.</span>
          </div>
        </div>

        <h2>A complete telecalling &amp; order booking solution</h2>
        <p>Manage orders, quotations, calls and leads from one dashboard.</p>

        <div className="login-feature-cards">
          <div className="feature-card">
            <FaClipboardList />
            <span>Order &amp; Quotation Management</span>
          </div>
          <div className="feature-card">
            <FaPhoneVolume />
            <span>Call Back &amp; Disposition Tracking</span>
          </div>
          <div className="feature-card feature-card-floating">
            <FaBrain />
            <span>AI Lead Discovery Engine</span>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <FaDumbbell />
          <div>
            <h1>HealVerse CRM</h1>
            <p>Care Better. Sell Smarter.</p>
          </div>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={loginAs === "agent" ? "active" : ""}
            onClick={() => setLoginAs("agent")}
          >
            Agent
          </button>
          <button
            type="button"
            className={loginAs === "admin" ? "active" : ""}
            onClick={() => setLoginAs("admin")}
          >
            Admin
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>{loginAs === "admin" ? "Admin Username" : "Agent Username"}</label>
          <div className="input-with-icon">
            <FaUser />
            <input
              name="username"
              placeholder={loginAs === "admin" ? "e.g. admin" : "e.g. yogeshb"}
              value={form.username}
              onChange={handleChange}
              autoFocus
            />
          </div>

          <label>Password</label>
          <div className="input-with-icon">
            <FaLock />
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="login-remember-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember Me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" disabled={submitting} className="login-submit">
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {loginAs === "agent" && (
          <p className="login-hint">
            New agent? <Link to="/request-access">Request access</Link>
          </p>
        )}

        <p className="login-hint">
          Demo logins — admin / Admin@123 &nbsp;or&nbsp; yogeshb / Agent@123
        </p>
      </div>
    </div>
  );
}

export default Login;
