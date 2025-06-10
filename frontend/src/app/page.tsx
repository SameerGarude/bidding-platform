"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100 gap-4">
      <h1 className="text-4xl font-bold text-blue-600">
        Welcome to the Bidding System
      </h1>
      <div className="flex gap-4">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded"
          onClick={() => router.push("/register")}
        >
          Register
        </button>
        <button
          className="bg-green-600 text-white px-6 py-2 rounded"
          onClick={() => router.push("/login")}
        >
          Login
        </button>
      </div>
    </div>
  );
}
