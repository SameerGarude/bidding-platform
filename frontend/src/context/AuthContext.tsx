"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { getToken, removeToken } from "@/lib/auth";

type User = {
  userId: number;
  name: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUser(decoded);
    }
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
