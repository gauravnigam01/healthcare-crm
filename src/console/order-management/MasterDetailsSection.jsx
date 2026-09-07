function MasterDetailsSection({ masterDetails, setField, mirror, orderNumber, agents }) {
  return (
    <section className="form-card">
      <h2>Master Details</h2>

      <div className="field">
        <label>Amount Advised</label>
        <input
          type="number"
          value={masterDetails.amountAdvised ?? ""}
          onChange={(e) => setField("amountAdvised", e.target.value)}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Customer_Name</label>
          <input value={mirror.name || ""} readOnly />
        </div>
        <div className="field">
          <label>Order No</label>
          <input value={orderNumber || "(assigned on save)"} readOnly />
        </div>
        <div className="field">
          <label>Age</label>
          <input
            type="number"
            value={masterDetails.age ?? ""}
            onChange={(e) => setField("age", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Weight (kg)</label>
          <input
            type="number"
            value={masterDetails.weight ?? ""}
            onChange={(e) => setField("weight", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Height (cm)</label>
          <input
            type="number"
            value={masterDetails.height ?? ""}
            onChange={(e) => setField("height", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Pincode</label>
          <input value={mirror.pincode || ""} readOnly />
        </div>
        <div className="field">
          <label>Problem</label>
          <input
            value={masterDetails.problem || ""}
            onChange={(e) => setField("problem", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Marital Status</label>
          <select
            value={masterDetails.maritalStatus || ""}
            onChange={(e) => setField("maritalStatus", e.target.value)}
          >
            <option value="">Select</option>
            <option value="Married">Married</option>
            <option value="Single">Single</option>
          </select>
        </div>
        <div className="field">
          <label>State</label>
          <input value={mirror.state || ""} readOnly />
        </div>
        <div className="field">
          <label>City</label>
          <input value={mirror.city || ""} readOnly />
        </div>
        <div className="field">
          <label>District</label>
          <input
            value={masterDetails.district || ""}
            onChange={(e) => setField("district", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Post_Office</label>
          <input
            value={masterDetails.postOffice || ""}
            onChange={(e) => setField("postOffice", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Address</label>
          <input value={mirror.address || ""} readOnly />
        </div>
        <div className="field">
          <label>Landmark</label>
          <input
            value={masterDetails.landmark || ""}
            onChange={(e) => setField("landmark", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Medicine Advised</label>
          <input
            value={masterDetails.medicineAdvised || ""}
            onChange={(e) => setField("medicineAdvised", e.target.value)}
          />
        </div>
        <div className="field">
          <label>ORDO</label>
          <input
            value={masterDetails.ordo || ""}
            onChange={(e) => setField("ordo", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Follow Up Agent</label>
          <select
            value={masterDetails.followUpAgentId || ""}
            onChange={(e) => setField("followUpAgentId", e.target.value)}
          >
            <option value="">--Select--</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="field field-wide">
          <label>Note</label>
          <input
            value={masterDetails.note || ""}
            onChange={(e) => setField("note", e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

export default MasterDetailsSection;
