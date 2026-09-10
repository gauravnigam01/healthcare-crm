import { useState } from "react";
import LeadsList from "./LeadsList";
import LeadDetail from "./LeadDetail";
import CreateLeadForm from "./CreateLeadForm";

function Leads({ onConvertToOrder }) {
  const [view, setView] = useState("list");
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const openLead = (leadId) => {
    setSelectedLeadId(leadId);
    setView("detail");
  };

  const backToList = () => {
    setView("list");
    setSelectedLeadId(null);
  };

  if (view === "create") {
    return (
      <CreateLeadForm
        onCreated={(lead) => openLead(lead.id)}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "detail" && selectedLeadId) {
    return <LeadDetail leadId={selectedLeadId} onBack={backToList} onConvertToOrder={onConvertToOrder} />;
  }

  return <LeadsList onOpenLead={openLead} onNewLead={() => setView("create")} />;
}

export default Leads;
