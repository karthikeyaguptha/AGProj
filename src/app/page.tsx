"use client";

import { useState, useEffect, useCallback } from "react";

type EnvStatus = "up" | "down" | "pending";

interface Environment {
  id: string;
  name: string;
  url: string;
  status: EnvStatus;
  lastChecked: Date | null;
}

const DEFAULT_ENVS: Environment[] = [
  { id: "1", name: "Dev", url: "https://dev.example.com", status: "pending", lastChecked: null },
  { id: "2", name: "QA", url: "https://qa.example.com", status: "pending", lastChecked: null },
  { id: "3", name: "Staging", url: "https://staging.example.com", status: "pending", lastChecked: null },
  { id: "4", name: "UAT", url: "https://uat.example.com", status: "pending", lastChecked: null },
];

export default function Dashboard() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});

  // Initialize from localStorage or defaults
  useEffect(() => {
    const saved = localStorage.getItem("env-dashboard-data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive dates
        const revived = parsed.map((env: any) => ({
          ...env,
          lastChecked: env.lastChecked ? new Date(env.lastChecked) : null
        }));
        setEnvironments(revived);
      } catch (e) {
        setEnvironments(DEFAULT_ENVS);
      }
    } else {
      setEnvironments(DEFAULT_ENVS);
    }
  }, []);

  // Save to localStorage when environments change
  useEffect(() => {
    if (environments.length > 0) {
      localStorage.setItem("env-dashboard-data", JSON.stringify(environments));
    }
  }, [environments]);

  const checkStatus = useCallback(async (id: string, url: string) => {
    setIsRefreshing(prev => ({ ...prev, [id]: true }));

    try {
      const response = await fetch(`/api/status?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      setEnvironments(prev => prev.map(env => {
        if (env.id === id) {
          return {
            ...env,
            status: data.isUp ? "up" : "down",
            lastChecked: new Date()
          };
        }
        return env;
      }));
    } catch (error) {
      setEnvironments(prev => prev.map(env => {
        if (env.id === id) {
          return {
            ...env,
            status: "down",
            lastChecked: new Date()
          };
        }
        return env;
      }));
    } finally {
      setIsRefreshing(prev => ({ ...prev, [id]: false }));
    }
  }, []);

  // Initial check & Polling
  useEffect(() => {
    if (environments.length === 0) return;

    // Check all that are pending initially
    environments.forEach(env => {
      if (env.status === "pending" || !env.lastChecked) {
        checkStatus(env.id, env.url);
      }
    });

    // Poll every 30 seconds for all environments
    const intervalId = setInterval(() => {
      setEnvironments(currentEnvs => {
        currentEnvs.forEach(env => {
          checkStatus(env.id, env.url);
        });
        return currentEnvs;
      });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [environments.length, checkStatus]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    // Basic URL validation
    let validUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    const newEnv: Environment = {
      id: Date.now().toString(),
      name: newName.trim(),
      url: validUrl,
      status: "pending",
      lastChecked: null
    };

    setEnvironments(prev => [...prev, newEnv]);
    setNewName("");
    setNewUrl("");

    // Check right away
    checkStatus(newEnv.id, newEnv.url);
  };

  const removeEnvironment = (id: string) => {
    setEnvironments(prev => prev.filter(env => env.id !== id));
  };

  return (
    <main className="container">
      <header className="header">
        <h1>Environment Pulse</h1>
        <p>Real-time uptime monitoring for your deployment environments</p>
      </header>

      <div className="form-container">
        <form onSubmit={handleAddSubmit} className="form-group">
          <div className="input-field">
            <label htmlFor="env-name">Environment Name</label>
            <input
              id="env-name"
              type="text"
              placeholder="e.g., Production 2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="input-field">
            <label htmlFor="env-url">Health Check URL</label>
            <input
              id="env-url"
              type="text"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">Add Monitor</button>
        </form>
      </div>

      <ul className="dashboard-grid">
        {environments.length === 0 ? (
          <li className="empty-state">
            <p>No environments monitored. Add one above to get started.</p>
          </li>
        ) : (
          environments.map((env) => (
            <li key={env.id} className={`env-card status-${env.status}`}>
              <div className="card-header">
                <div className="env-name">
                  <div className="status-dot"></div>
                  {env.name}
                </div>
                <button
                  onClick={() => removeEnvironment(env.id)}
                  className="delete-btn"
                  title="Remove environment"
                  aria-label="Remove environment"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <a href={env.url} target="_blank" rel="noopener noreferrer" className="env-url">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                {env.url}
              </a>

              <div className="card-footer">
                <span className="card-status-text">
                  {env.status === "pending" ? "Checking..." : env.status}
                </span>

                <button
                  onClick={() => checkStatus(env.id, env.url)}
                  className="refresh-btn"
                  disabled={isRefreshing[env.id]}
                >
                  <svg
                    className={isRefreshing[env.id] ? "spin" : ""}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  {env.lastChecked
                    ? env.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : "Refresh"}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
