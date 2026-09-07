function AppTabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="app-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={tab.key === activeTab ? "app-tab active" : "app-tab"}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default AppTabBar;
