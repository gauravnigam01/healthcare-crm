import { useAuth } from "../context/AuthContext";

function ProcessBar({ activeCustomer }) {
  const { agent } = useAuth();

  return (
    <div className="process-bar">
      <div>
        <strong>Process:</strong> HINDVED_HEALTHCARE
      </div>
      <div>
        <strong>Campaign:</strong> HINDVED_HEALTHCARE
      </div>
      <div>
        <strong>Ext:</strong> {agent?.extension || "-"}
      </div>
      <div>
        <strong>Agent:</strong> {agent?.username}
      </div>
      <div>
        <strong>Active Customer:</strong> {activeCustomer?.name || "-"}
      </div>
      <span className="process-arrow">&#10148;</span>
    </div>
  );
}

export default ProcessBar;
