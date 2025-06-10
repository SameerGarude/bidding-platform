"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message);
        setPassword(""); // Clear password on failure
        return;
      }

      setToken(data.token);

      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      setUser(decoded);

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-4">Login</h1>
      <input
        type="email"
        placeholder="Email"
        className="border p-2 mb-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="border p-2 mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
      >
        Login
      </button>
    </div>
  );
}
