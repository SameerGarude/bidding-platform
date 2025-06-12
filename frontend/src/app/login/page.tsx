// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { setToken } from "@/lib/auth";
// import { useAuth } from "@/context/AuthContext";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const { setUser } = useAuth();
//   const router = useRouter();

//   const handleLogin = async () => {
//     try {
//       const res = await fetch(
//         "https://bidding-backend-77kc.onrender.com/api/auth/login",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ email, password }),
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) {
//         alert(data.message);
//         setPassword(""); // Clear password on failure
//         return;
//       }

//       setToken(data.token);

//       const decoded = JSON.parse(atob(data.token.split(".")[1]));
//       setUser(decoded);

//       router.push("/dashboard");
//     } catch (error) {
//       console.error("Login error:", error);
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen">
//       <h1 className="text-2xl mb-4">Login</h1>
//       <input
//         type="email"
//         placeholder="Email"
//         className="border p-2 mb-2"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//       />
//       <input
//         type="password"
//         placeholder="Password"
//         className="border p-2 mb-4"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//       />
//       <button
//         onClick={handleLogin}
//         className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
//       >
//         Login
//       </button>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        "https://bidding-backend-77kc.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        setPassword("");
        setLoading(false);
        return;
      }

      setToken(data.token);
      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      setUser(decoded);

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-white-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">
          Login
        </h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-center mt-4">
          Don&apos;t have an account?{" "}
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => router.push("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
