import { useState } from "react";
import { apiRequest } from "../api";

function CallTransfer() {
  const [toExtension, setToExtension] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!toExtension) {
      alert("Enter a target extension.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/call-transfer", {
        method: "POST",
        body: { toExtension, note },
      });
      setResult(data.message);
      setToExtension("");
      setNote("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="tab-panel">
      <div className="panel-title">
        <span>Call Transfer</span>
      </div>

      <p className="tab-note">
        No telephony/PBX is connected in this build — a transfer request is logged only.
      </p>

      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Transfer To Extension *</label>
          <input value={toExtension} onChange={(e) => setToExtension(e.target.value)} placeholder="e.g. 2010" />
        </div>

        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for transfer" />
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? "Transferring..." : "Transfer Call"}
        </button>
      </form>

      {result && <div className="tab-success">{result}</div>}
    </section>
  );
}

export default CallTransfer;
