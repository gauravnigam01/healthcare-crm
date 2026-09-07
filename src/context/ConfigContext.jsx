import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api";

const ConfigContext = createContext();

const FALLBACK = {
  branches: [],
  customerTypes: [],
  leadTypes: [],
  paymentMethods: [],
  packages: [],
  dispositionCodes: [],
  courierPartners: [],
};

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/config")
      .then(setConfig)
      .catch(() => setConfig(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>{children}</ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
