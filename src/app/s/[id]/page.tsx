"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface SharedEnv {
  name: string;
  url: string;
  group: string;
}

export default function SharedConfigPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [environments, setEnvironments] = useState<SharedEnv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Shared config not found");
        return res.json();
      })
      .then((data) => {
        setEnvironments(data.environments || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load shared config");
        setLoading(false);
      });
  }, [id]);

  const handleApply = (mode: "merge" | "replace") => {
    // Read current localStorage data
    const existing = localStorage.getItem("env-dashboard-data");
    let current: SharedEnv[] = [];
    if (existing) {
      try {
        current = JSON.parse(existing);
      } catch {
        current = [];
      }
    }

    const prepared = environments.map((e) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: e.name,
      url: e.url,
      group: e.group || "Default",
      status: "pending" as const,
      lastChecked: null,
    }));

    if (mode === "replace") {
      localStorage.setItem("env-dashboard-data", JSON.stringify(prepared));
    } else {
      const merged = [...current, ...prepared];
      localStorage.setItem("env-dashboard-data", JSON.stringify(merged));
    }

    setApplied(true);
    setTimeout(() => router.push("/"), 1500);
  };

  const groupedEnvs = environments.reduce<Record<string, SharedEnv[]>>(
    (acc, e) => {
      const g = e.group || "Default";
      if (!acc[g]) acc[g] = [];
      acc[g].push(e);
      return acc;
    },
    {}
  );

  return (
    <main className="container">
      <div className="share-load-page">
        <div className="share-load-card">
          <div className="share-load-header">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <h1>Shared Dashboard</h1>
            <p>Someone shared their Environment Pulse configuration with you</p>
          </div>

          {loading && (
            <div className="share-load-status">
              <div className="share-load-spinner" />
              <p>Loading shared configuration...</p>
            </div>
          )}

          {error && (
            <div className="share-load-status share-load-error">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p>{error}</p>
              <button className="btn btn-sm" onClick={() => router.push("/")}>
                Go to Dashboard
              </button>
            </div>
          )}

          {!loading && !error && !applied && (
            <>
              <div className="share-load-preview">
                <h3>
                  {environments.length} monitor
                  {environments.length !== 1 ? "s" : ""} in{" "}
                  {Object.keys(groupedEnvs).length} group
                  {Object.keys(groupedEnvs).length !== 1 ? "s" : ""}
                </h3>
                <div className="share-preview-groups">
                  {Object.entries(groupedEnvs).map(([group, envs]) => (
                    <div key={group} className="share-preview-group">
                      <div className="share-preview-group-name">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        {group}{" "}
                        <span className="share-preview-count">
                          ({envs.length})
                        </span>
                      </div>
                      <ul className="share-preview-list">
                        {envs.map((e, i) => (
                          <li key={i} className="share-preview-item">
                            <span className="share-preview-name">
                              {e.name}
                            </span>
                            <span className="share-preview-url">{e.url}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="share-load-actions">
                <button
                  className="btn btn-add"
                  onClick={() => handleApply("merge")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Merge with My Dashboard
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handleApply("replace")}
                >
                  Replace My Dashboard
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => router.push("/")}
                  style={{ opacity: 0.6 }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {applied && (
            <div className="share-load-status share-load-success">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p>Configuration applied! Redirecting to dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
