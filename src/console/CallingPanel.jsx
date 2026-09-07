import { useState } from "react";
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaSearch,
  FaUserPlus,
  FaStickyNote,
  FaStepForward,
  FaSave,
} from "react-icons/fa";
import { useCallingPanelActions } from "../hooks/useCallingPanelActions";
import { useConfig } from "../context/ConfigContext";
import { apiRequest } from "../api";

function maskPhone(phone) {
  if (!phone) return "**********";
  const digits = String(phone);
  if (digits.length <= 4) return digits;
  return "*".repeat(digits.length - 4) + digits.slice(-4);
}

function CallingPanel({ activeCustomer, setActiveCustomer }) {
  const { actions } = useCallingPanelActions();
  const { config } = useConfig();

  const [callState, setCallState] = useState("idle"); // idle | dialing | connected
  const [muted, setMuted] = useState(false);
  const [breakStatus, setBreakStatus] = useState("");
  const [manualDial, setManualDial] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [disposition, setDisposition] = useState("");
  const [callNote, setCallNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleDial = () => {
    if (!activeCustomer?.mobile) {
      alert("Enter a mobile number on the order form first.");
      return;
    }
    setCallState("dialing");
    setTimeout(() => setCallState("connected"), 800);
  };

  const handleHangup = () => {
    if (callState === "idle") return;
    setCallState("idle");
    setShowDisposition(true);
  };

  const handleLogDisposition = async () => {
    if (!disposition) {
      alert("Please select a disposition.");
      return;
    }

    try {
      await apiRequest("/call-logs", {
        method: "POST",
        body: {
          customerId: activeCustomer?.id || null,
          phone: activeCustomer?.mobile || null,
          disposition,
          note: callNote || null,
          callbackAt: disposition === "Call Back" ? callNote : null,
        },
      });
      setShowDisposition(false);
      setDisposition("");
      setCallNote("");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBreakChange = async (e) => {
    const value = e.target.value;
    setBreakStatus(value);

    try {
      await apiRequest("/agents/status", {
        method: "POST",
        body: { status: value || "Ready" },
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleNextCall = () => {
    setActiveCustomer(null);
    setCallState("idle");
  };

  const runAction = async (fn) => {
    if (!fn) {
      alert("Nothing to save on this tab.");
      return;
    }
    setSaving(true);
    try {
      await fn();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="calling-panel">
      <div className="calling-header">Calling Panel</div>

      <div className="customer-call-info">
        <p>
          Customer Id <strong>{activeCustomer?.id || "-"}</strong>
        </p>
        <p>
          Phone No. <strong>{maskPhone(activeCustomer?.mobile)}</strong>
        </p>

        <select defaultValue="+91">
          <option>+91</option>
        </select>

        <div className={`dial-status dial-status-${callState}`}>
          <span>
            {callState === "idle" && "Idle"}
            {callState === "dialing" && "Dialing..."}
            {callState === "connected" && "Connected"}
          </span>
        </div>

        <p>DID No.: {activeCustomer?.mobile || "-"}</p>
        <p>IVR Desc.: Inbound/Outbound simulated</p>
      </div>

      {showDisposition && (
        <div className="disposition-picker">
          <label>Call Disposition</label>
          <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
            <option value="">--Select--</option>
            {config.dispositionCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <input
            placeholder={disposition === "Call Back" ? "Callback date/time note" : "Note (optional)"}
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
          />
          <button onClick={handleLogDisposition}>Log Call</button>
        </div>
      )}

      <div className="call-buttons">
        <button className="call-green" onClick={handleDial}>
          <FaPhone /> Dial
        </button>
        <button className="call-red" onClick={handleHangup}>
          <FaPhoneSlash /> Hangup
        </button>
        <button className={muted ? "call-purple active" : "call-purple"} onClick={() => setMuted((m) => !m)}>
          <FaMicrophone /> Mute
        </button>
        <button onClick={handleDial}>
          <FaPhone /> Call
        </button>
        <button onClick={() => setShowDisposition(true)}>
          <FaStickyNote /> Notes
        </button>
        <button onClick={() => setActiveCustomer(null)}>
          <FaUserPlus /> New
        </button>
        <button>
          <FaSearch /> Search
        </button>
        <button onClick={handleNextCall}>
          <FaStepForward /> Next Call
        </button>
      </div>

      <div className="agent-break">
        <label>Agent break:</label>
        <select value={breakStatus} onChange={handleBreakChange}>
          <option value="">--Select--</option>
          <option value="Tea Break">Tea Break</option>
          <option value="Lunch">Lunch</option>
          <option value="Meeting">Meeting</option>
        </select>

        <label className="manual-dial">
          <input
            type="checkbox"
            checked={manualDial}
            onChange={(e) => setManualDial(e.target.checked)}
          />
          Manual Dial On
        </label>
      </div>

      <div className="call-actions">
        <button
          className="save-button"
          disabled={saving}
          onClick={() => runAction(actions?.onSave)}
        >
          <FaSave /> {actions?.saveLabel || "SAVE"}
        </button>

        <button
          className="save-next-button"
          disabled={saving}
          onClick={() => runAction(actions?.onSaveAndNext)}
        >
          <FaSave /> Save & Next
        </button>
      </div>
    </aside>
  );
}

export default CallingPanel;
