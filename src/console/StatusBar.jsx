import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";

function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatTime(dateString) {
  if (!dateString) return "-";
  const d = new Date(`${dateString}Z`);
  return d.toLocaleTimeString();
}

function StatusBar() {
  const { agent } = useAuth();
  const [summary, setSummary] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const loadSummary = () => {
      apiRequest("/agents/status/summary")
        .then(setSummary)
        .catch(() => {});
    };

    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  return (
    <footer className="status-bar">
      <strong>HealVerse CRM</strong>
      <span>Login Id: {agent?.username}</span>
      <span>Login Time: {formatTime(summary?.loginTime)}</span>
      <span>Ext. No.: {agent?.extension || "-"}</span>
      <span>Break Time: {formatDuration(summary?.breakSeconds || 0)}</span>
      <span>Wrap Time: {formatDuration(summary?.wrapSeconds || 0)}</span>
      <span>Est. Status: {summary?.currentStatus || "-"}</span>
      <span>Campaign: HEALVERSE_CRM</span>
      <span>Terminal: LOCALHOST</span>
      <span className="footer-time">{now.toLocaleString()}</span>
    </footer>
  );
}

export default StatusBar;
