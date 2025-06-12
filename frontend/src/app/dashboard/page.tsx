"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [bidsByProject, setBidsByProject] = useState<{
    [projectId: number]: any[];
  }>({});
  const [sellerBids, setSellerBids] = useState<any[]>([]);
  const [showBidFormForProjectId, setShowBidFormForProjectId] = useState<
    number | null
  >(null);
  const [awardingProjectId, setAwardingProjectId] = useState<number | null>(
    null
  );

  const isBuyer = user?.role === "BUYER";
  const isSeller = user?.role === "SELLER";

  function BidForm({
    projectId,
    onBidPlaced,
  }: {
    projectId: number;
    onBidPlaced: () => void;
  }) {
    const [amount, setAmount] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      if (!amount || Number(amount) <= 0) {
        setError("Please enter a valid bid amount.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://bidding-backend-77kc.onrender.com/api/bids`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              projectId,
              amount: Number(amount),
              estimatedTime: estimatedTime ? Number(estimatedTime) : undefined,
              message,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          if (
            data.message === "You have already placed a bid on this project."
          ) {
            toast.error(data.message);
          } else {
            setError(data.message || "Failed to place bid");
          }
        } else {
          onBidPlaced();
        }
      } catch (err) {
        setError("Network error");
      }

      setLoading(false);
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="mt-4 p-4 border rounded bg-black"
      >
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="number"
          placeholder="Bid Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mb-2 p-2 rounded bg-white text-black"
          required
        />
        <input
          type="number"
          placeholder="Estimated Days"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          className="w-full mb-2 p-2 rounded bg-white text-black"
        />
        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full mb-2 p-2 rounded bg-white text-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
        >
          {loading ? "Placing Bid..." : "Submit Bid"}
        </button>
      </form>
    );
  }

  const ReviewForm = ({
    project,
    fetchProjects,
  }: {
    project: any;
    fetchProjects: () => void;
  }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewText, setReviewText] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://bidding-backend-77kc.onrender.com/api/reviews/${project.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating, review: reviewText }),
        }
      );

      const data = await res.json();
      // console.log("Projects fetched:", data);

      if (res.ok) {
        toast.success("Review submitted!");
        fetchProjects();
        console.log("After fetching projects:", projects);
      } else {
        toast.error(data.message || data.error || "Failed to submit review");
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="mt-4 p-4 border rounded shadow-sm bg-black"
      >
        <label className="block mb-2 font-semibold">⭐ Rating:</label>
        <div className="flex mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className={`cursor-pointer text-2xl ${
                star <= (hover || rating) ? "text-yellow-500" : "text-white-500"
              }`}
            >
              ★
            </span>
          ))}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Your review"
          required
          className="w-full p-2 border rounded mb-3"
        />

        <button
          type="submit"
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 cursor-pointer"
        >
          Submit Review
        </button>
      </form>
    );
  };

  const fetchProjects = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const url = isBuyer
      ? `https://bidding-backend-77kc.onrender.com/api/projects/buyer/${user.userId}`
      : `https://bidding-backend-77kc.onrender.com/api/projects/open`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProjects(data);

      const projectsData = data.projects || data || [];
      setProjects(projectsData);

      if (isBuyer) {
        for (const project of projectsData) {
          const res = await fetch(
            `https://bidding-backend-77kc.onrender.com/api/bids/project/${project.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const bidData = await res.json();
          setBidsByProject((prev) => ({
            ...prev,
            [project.id]: bidData || [],
          }));
        }
      }

      if (isSeller) {
        const res = await fetch(
          `https://bidding-backend-77kc.onrender.com/api/bids/seller/${user.userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const bids = await res.json();
        setSellerBids(bids || []);
      }
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, [user]);

  const handleAward = async (projectId: number, sellerId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setAwardingProjectId(projectId);
    try {
      const res = await fetch(
        `https://bidding-backend-77kc.onrender.com/api/projects/${projectId}/award`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sellerId }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to award project");
      } else {
        toast.success("🎉 Project awarded successfully");
        await fetchProjects();
      }
    } catch (err) {
      toast.error("Awarding failed");
    } finally {
      setAwardingProjectId(null);
    }
  };

  if (!user) return <p>Redirecting...</p>;

  return (
    <div className="p-6">
      <Toaster position="top-center" />
      <h1 className="text-2xl mb-2">Welcome, {user.name}!</h1>
      <p>Your role: {user.role}</p>

      {isBuyer && (
        <button
          onClick={() => router.push("/buyer")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded mr-4 cursor-pointer"
        >
          Create New Project
        </button>
      )}

      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded cursor-pointer"
      >
        Logout
      </button>

      <div className="mt-8">
        <h2 className="text-xl mb-4">
          {isBuyer ? "Your Projects" : "Open Projects to Bid On"}
        </h2>

        {projects.length === 0 ? (
          <p>No projects yet.</p>
        ) : (
          projects.map((project) => {
            const hasAlreadyBid = sellerBids.some(
              (bid) => bid.projectId === project.id
            );

            const deliverableUrl = project.deliverableFile; // Assumes backend includes it

            return (
              <div
                key={project.id}
                className="border rounded-xl p-4 mb-4 bg-black-100 shadow-md"
              >
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="mb-1">{project.description}</p>
                <p>
                  <strong>Budget:</strong> ₹{project.budgetMin} - ₹
                  {project.budgetMax}
                </p>
                <p>
                  <strong>Deadline:</strong>{" "}
                  {new Date(project.deadline).toLocaleDateString()}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="font-semibold text-blue-600">
                    {project.status}
                  </span>
                </p>

                {/* 🔽 Show download link for submitted deliverable - only to BUYER */}
                {project.status === "DELIVERED" &&
                user.role === "BUYER" &&
                project.deliverableUrl ? (
                  <div className="mt-2">
                    <p className="text-green-600 font-semibold">
                      📦 Deliverable submitted:
                    </p>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        if (!token) {
                          toast.error("You are not logged in.");
                          return;
                        }
                        console.log("Token being sent:", token);

                        try {
                          const res = await fetch(
                            `https://bidding-backend-77kc.onrender.com/api/projects/${project.id}/download`,
                            {
                              method: "GET",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );

                          if (!res.ok) {
                            throw new Error("Failed to download file");
                          }

                          const blob = await res.blob();
                          const contentDisposition = res.headers.get(
                            "Content-Disposition"
                          );
                          let filename = "deliverable";

                          // Try to extract filename from content-disposition header
                          if (
                            contentDisposition &&
                            contentDisposition.includes("filename=")
                          ) {
                            filename = contentDisposition
                              .split("filename=")[1]
                              .replace(/["']/g, "")
                              .trim();
                          } else {
                            // Fallback to using URL path
                            filename = project.deliverableUrl.split("/").pop();
                          }

                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download error:", err);
                          toast.error("Download failed");
                        }
                      }}
                      className="text-blue-500 underline cursor-pointer"
                    >
                      📄 View / Download File
                    </button>
                  </div>
                ) : project.status === "DELIVERED" && user.role === "BUYER" ? (
                  <p className="text-yellow-600 mt-2">
                    Deliverable submitted but file URL is missing.
                  </p>
                ) : null}

                {/* ✅ Seller acknowledgment */}
                {project.status === "DELIVERED" && user.role === "SELLER" && (
                  <p className="text-green-500 mt-2">Deliverable submitted.</p>
                )}

                {isBuyer && bidsByProject[project.id]?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-md font-semibold mb-2">Bids:</h4>
                    {bidsByProject[project.id].map((bid) => {
                      const isAssignedSeller =
                        project.assignedSellerId === bid.sellerId;

                      return (
                        <div
                          key={bid.id}
                          className="border p-3 rounded mb-2 bg-gray"
                        >
                          <p>
                            <strong>Seller:</strong> {bid.seller?.name}
                          </p>
                          <p>
                            <strong>Bid Amount:</strong> ₹{bid.bidAmount}
                          </p>
                          <p>
                            <strong>Estimated Time:</strong> {bid.estimatedTime}{" "}
                            days
                          </p>
                          <p>
                            <strong>Message:</strong> {bid.message}
                          </p>

                          {project.status === "PENDING" &&
                          !project.assignedSellerId ? (
                            <button
                              onClick={() =>
                                handleAward(project.id, bid.sellerId)
                              }
                              className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 cursor-pointer"
                              disabled={awardingProjectId === project.id}
                            >
                              {awardingProjectId === project.id
                                ? "Awarding..."
                                : "Award Project"}
                            </button>
                          ) : project.status === "IN_PROGRESS" &&
                            isAssignedSeller ? (
                            <button
                              className="mt-2 bg-blue-600 text-white px-3 py-1 rounded cursor-default cursor-pointer"
                              disabled
                            >
                              ✅Awarded
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 🔽 Seller 3 deliverable */}
                {isSeller &&
                  project.status === "IN_PROGRESS" &&
                  project.assignedSellerId === user.userId && (
                    <form
                      className="mt-4"
                      onSubmit={async (e) => {
                        e.preventDefault();

                        const form = e.currentTarget as HTMLFormElement;
                        const fileInput = form.elements.namedItem(
                          "file"
                        ) as HTMLInputElement;

                        if (!fileInput?.files?.[0]) {
                          toast.error("No file selected");
                          return;
                        }

                        const formData = new FormData();
                        formData.append("file", fileInput.files[0]);

                        const token = localStorage.getItem("token");
                        const res = await fetch(
                          `https://bidding-backend-77kc.onrender.com/api/projects/${project.id}/deliver`,
                          {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData,
                          }
                        );

                        const data = await res.json();
                        if (res.ok) {
                          toast.success("Deliverable uploaded!");
                          fetchProjects();
                        } else {
                          toast.error(data.error || "Upload failed");
                        }
                      }}
                    >
                      <input type="file" name="file" required />
                      <button
                        type="submit"
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        Upload Deliverable
                      </button>
                    </form>
                  )}

                {/* 🔽 Buyer marks as completed */}
                {isBuyer && project.status === "DELIVERED" && (
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("token");
                      const res = await fetch(
                        `https://bidding-backend-77kc.onrender.com/api/projects/${project.id}/complete`,
                        {
                          method: "PUT",
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      if (res.ok) {
                        toast.success("✅ Project marked as completed");
                        fetchProjects();
                      } else {
                        const errorText = await res.text(); // ✅ Only read once
                        console.error("Error response:", errorText);
                        toast.error("Failed to complete project: " + errorText);
                      }
                    }}
                    className="mt-2 bg-blue-700 text-white px-3 py-1 rounded cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}

                {/* 🔽 Buyer leaves review */}
                {project.status === "COMPLETED" &&
                  project.sellerId &&
                  isBuyer && (
                    <>
                      {!project.review ? (
                        // No existing review — show form
                        <ReviewForm
                          project={project}
                          fetchProjects={fetchProjects}
                        />
                      ) : (
                        <div className="mt-2 p-3 border rounded bg-gray-100">
                          <p className="text-green-600 font-semibold">
                            You have already submitted a review.
                          </p>
                          <p className="mt-1">
                            ⭐ Rating: {project.review.rating}
                          </p>
                          <p>💬 {project.review.review}</p>
                        </div>
                      )}
                    </>
                  )}

                {isSeller && project.status === "PENDING" && (
                  <>
                    {hasAlreadyBid ? (
                      <p className="mt-2 text-sm text-yellow-500">
                        ⚠️ You have already placed a bid on this project.
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setShowBidFormForProjectId(
                              showBidFormForProjectId === project.id
                                ? null
                                : project.id
                            )
                          }
                          className="mt-2 bg-green-500 text-white px-3 py-1 rounded"
                        >
                          {showBidFormForProjectId === project.id
                            ? "Cancel Bid"
                            : "Place a Bid"}
                        </button>

                        {showBidFormForProjectId === project.id && (
                          <BidForm
                            projectId={project.id}
                            onBidPlaced={() => {
                              fetchProjects();
                              setShowBidFormForProjectId(null);
                              toast.success(" Bid placed successfully!");
                            }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
