import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

function AgentBriefing() {
  const { agent } = useAuth();
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", message: "" });
  const [posting, setPosting] = useState(false);

  const load = () => {
    apiRequest("/briefings")
      .then(setBriefings)
      .catch(() => setBriefings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();

    if (!form.title || !form.message) {
      alert("Please fill title and message.");
      return;
    }

    setPosting(true);
    try {
      await apiRequest("/briefings", { method: "POST", body: form });
      setForm({ title: "", message: "" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="tab-panel">
      <div className="panel-title">
        <span>Agent Briefing</span>
      </div>

      {agent?.role === "admin" && (
        <form className="simple-form" onSubmit={handlePost}>
          <div className="field">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Briefing title"
            />
          </div>
          <div className="field field-wide">
            <label>Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Message for all agents"
            />
          </div>
          <button type="submit" disabled={posting}>
            {posting ? "Posting..." : "Post Briefing"}
          </button>
        </form>
      )}

      {loading && <p className="tab-note">Loading...</p>}

      {!loading && briefings.length === 0 && (
        <div className="empty-state">
          <h3>No briefings yet</h3>
          <p>Announcements from admins will appear here.</p>
        </div>
      )}

      <div className="briefing-list">
        {briefings.map((item) => (
          <div key={item.id} className="briefing-card">
            <h4>{item.title}</h4>
            <p>{item.message}</p>
            <span>
              {item.postedByName} &middot; {item.createdAt}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AgentBriefing;
