import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, getToken, setToken } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest("/auth/me")
      .then((data) => setAgent(data.agent))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { username, password },
    });

    setToken(data.token);
    setAgent(data.agent);
    return data.agent;
  };

  const logout = async () => {
    try {
      await apiRequest("/agents/status", { method: "POST", body: { status: "Logout" } });
    } catch {
      // ignore — logging out locally regardless
    }
    setToken(null);
    setAgent(null);
  };

  return (
    <AuthContext.Provider value={{ agent, setAgent, loading, isLoggedIn: !!agent, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
