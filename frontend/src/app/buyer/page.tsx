"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function BuyerPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleCreate = async () => {
    if (!user || !user.userId) {
      return Swal.fire("Error", "User not authenticated", "error");
    }

    try {
      const res = await fetch(
        "https://bidding-backend-77kc.onrender.com/api/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            title,
            description,
            budgetMin: parseFloat(budgetMin),
            budgetMax: parseFloat(budgetMax),
            deadline,
            buyerId: user.userId,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        return Swal.fire(
          "Error",
          data.message || "Failed to create project",
          "error"
        );
      }

      // Success message
      await Swal.fire("Success", "Project created successfully!", "success");

      // Clear form
      setTitle("");
      setDescription("");
      setBudgetMin("");
      setBudgetMax("");
      setDeadline("");

      // Redirect or refresh
      router.push("/dashboard");
    } catch (error) {
      console.error("Create project error:", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl mb-4">Create New Project</h1>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="number"
        placeholder="Minimum Budget"
        value={budgetMin}
        onChange={(e) => setBudgetMin(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="number"
        placeholder="Maximum Budget"
        value={budgetMax}
        onChange={(e) => setBudgetMax(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      <button
        onClick={handleCreate}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Create Project
      </button>
    </div>
  );
}
