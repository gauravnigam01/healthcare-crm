import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserMd, FaLock, FaUser } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
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
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <FaUserMd />
          <div>
            <h1>HINDVED HEALTHCARE</h1>
            <p>Agent Console</p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <div className="input-with-icon">
            <FaUser />
            <input
              name="username"
              placeholder="e.g. agent1"
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

          <button type="submit" disabled={submitting} className="login-submit">
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-hint">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="login-hint">
          Demo logins — admin / Admin@123 &nbsp;or&nbsp; agent1 / Agent@123
        </p>
      </div>
    </div>
  );
}

export default Login;
