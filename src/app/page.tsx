"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type EnvStatus = "up" | "down" | "pending";

interface Environment {
  id: string;
  name: string;
  url: string;
  group: string;
  status: EnvStatus;
  lastChecked: Date | null;
}

const REFRESH_OPTIONS = [
  { label: "5 Sec", value: 5000 },
  { label: "10 Sec", value: 10000 },
  { label: "30 Sec", value: 30000 },
  { label: "45 Sec", value: 45000 },
  { label: "60 Sec", value: 60000 },
  { label: "3 Min", value: 180000 },
  { label: "5 Min", value: 300000 },
];

const DEFAULT_ENVS: Environment[] = [
  { id: "1", name: "Dev", url: "https://dev.example.com", group: "Development", status: "pending", lastChecked: null },
  { id: "2", name: "QA", url: "https://qa.example.com", group: "Testing", status: "pending", lastChecked: null },
  { id: "3", name: "Staging", url: "https://staging.example.com", group: "Pre-Production", status: "pending", lastChecked: null },
  { id: "4", name: "UAT", url: "https://uat.example.com", group: "Pre-Production", status: "pending", lastChecked: null },
];

export default function Dashboard() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  // Initialize from localStorage or defaults
  useEffect(() => {
    const saved = localStorage.getItem("env-dashboard-data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const revived = parsed.map((env: any) => ({
          ...env,
          group: env.group || "Default",
          lastChecked: env.lastChecked ? new Date(env.lastChecked) : null,
        }));
        setEnvironments(revived);
      } catch {
        setEnvironments(DEFAULT_ENVS);
      }
    } else {
      setEnvironments(DEFAULT_ENVS);
    }

    const savedRefresh = localStorage.getItem("env-dashboard-autorefresh");
    if (savedRefresh) {
      try {
        const { enabled, interval } = JSON.parse(savedRefresh);
        setAutoRefreshEnabled(!!enabled);
        if (interval) setRefreshInterval(interval);
      } catch { /* ignore */ }
    }

    setInitialized(true);
  }, []);

  // Save environments to localStorage
  useEffect(() => {
    if (initialized && environments.length > 0) {
      localStorage.setItem("env-dashboard-data", JSON.stringify(environments));
    }
    if (initialized && environments.length === 0) {
      localStorage.removeItem("env-dashboard-data");
    }
  }, [environments, initialized]);

  // Save auto-refresh settings
  useEffect(() => {
    if (initialized) {
      localStorage.setItem(
        "env-dashboard-autorefresh",
        JSON.stringify({ enabled: autoRefreshEnabled, interval: refreshInterval })
      );
    }
  }, [autoRefreshEnabled, refreshInterval, initialized]);

  // Focus edit name input when editing starts
  useEffect(() => {
    if (editingId && editNameRef.current) {
      editNameRef.current.focus();
    }
  }, [editingId]);

  const checkStatus = useCallback(async (id: string, url: string) => {
    setIsRefreshing((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`/api/status?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      setEnvironments((prev) =>
        prev.map((env) =>
          env.id === id ? { ...env, status: data.isUp ? "up" : "down", lastChecked: new Date() } : env
        )
      );
    } catch {
      setEnvironments((prev) =>
        prev.map((env) =>
          env.id === id ? { ...env, status: "down", lastChecked: new Date() } : env
        )
      );
    } finally {
      setIsRefreshing((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  const refreshAll = useCallback(() => {
    setEnvironments((current) => {
      current.forEach((env) => checkStatus(env.id, env.url));
      return current;
    });
  }, [checkStatus]);

  // Initial check
  useEffect(() => {
    if (!initialized || environments.length === 0) return;
    environments.forEach((env) => {
      if (env.status === "pending" || !env.lastChecked) {
        checkStatus(env.id, env.url);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Auto-refresh polling
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefreshEnabled && environments.length > 0) {
      intervalRef.current = setInterval(() => {
        refreshAll();
      }, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshEnabled, refreshInterval, environments.length, refreshAll]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    let validUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    const newEnv: Environment = {
      id: Date.now().toString(),
      name: newName.trim(),
      url: validUrl,
      group: newGroup.trim() || "Default",
      status: "pending",
      lastChecked: null,
    };

    setEnvironments((prev) => [...prev, newEnv]);
    setNewName("");
    setNewUrl("");
    checkStatus(newEnv.id, newEnv.url);
  };

  const removeEnvironment = (id: string) => {
    setEnvironments((prev) => prev.filter((env) => env.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const removeGroup = (groupName: string) => {
    setEnvironments((prev) => prev.filter((env) => env.group !== groupName));
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Inline editing
  const startEditing = (env: Environment) => {
    setEditingId(env.id);
    setEditName(env.name);
    setEditUrl(env.url);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditUrl("");
  };

  const saveEditing = (id: string) => {
    if (!editName.trim() || !editUrl.trim()) return;

    let validUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === id
          ? { ...env, name: editName.trim(), url: validUrl, status: "pending", lastChecked: null }
          : env
      )
    );
    setEditingId(null);
    setEditName("");
    setEditUrl("");
    // Re-check after edit
    checkStatus(id, editUrl.trim());
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing(id);
    }
    if (e.key === "Escape") cancelEditing();
  };

  // Group environments
  const grouped = environments.reduce<Record<string, Environment[]>>((acc, env) => {
    const g = env.group || "Default";
    if (!acc[g]) acc[g] = [];
    acc[g].push(env);
    return acc;
  }, {});

  const groupNames = Object.keys(grouped).sort();

  // Build unique group list for dropdown (including from current envs)
  const allGroupNames = Array.from(
    new Set(environments.map((e) => e.group).filter(Boolean))
  ).sort();

  const getGroupStats = (envs: Environment[]) => {
    const up = envs.filter((e) => e.status === "up").length;
    const down = envs.filter((e) => e.status === "down").length;
    const pending = envs.filter((e) => e.status === "pending").length;
    return { up, down, pending, total: envs.length };
  };

  return (
    <main className="container">
      <header className="header">
        <h1>Environment Pulse</h1>
        <p>Real-time uptime monitoring for your deployment environments</p>
      </header>

      {/* Auto-Refresh Control Bar */}
      <div className="auto-refresh-bar">
        <div className="auto-refresh-left">
          <label className="toggle-switch" htmlFor="auto-refresh-toggle">
            <input
              id="auto-refresh-toggle"
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="auto-refresh-label">
            Auto Refresh {autoRefreshEnabled ? "ON" : "OFF"}
          </span>
        </div>
        {autoRefreshEnabled && (
          <div className="auto-refresh-right">
            <span className="interval-label">Interval:</span>
            <div className="interval-options">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`interval-btn ${refreshInterval === opt.value ? "active" : ""}`}
                  onClick={() => setRefreshInterval(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-sm" onClick={refreshAll}>
          Refresh All Now
        </button>
      </div>

      {/* Add Environment Form */}
      <div className="form-container">
        <form onSubmit={handleAddSubmit} className="form-group">
          <div className="input-field">
            <label htmlFor="env-group">Group</label>
            <select
              id="env-group"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="select-field"
            >
              <option value="">-- Select or type below --</option>
              {allGroupNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter new group"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="group-text-input"
            />
          </div>
          <div className="input-field">
            <label htmlFor="env-name">
              Environment Name <span className="required-asterisk">*</span>
            </label>
            <input
              id="env-name"
              type="text"
              placeholder="Enter Env. Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="input-field">
            <label htmlFor="env-url">
              Health Check URL <span className="required-asterisk">*</span>
            </label>
            <input
              id="env-url"
              type="text"
              placeholder="Enter URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">
            Add Monitor
          </button>
        </form>
      </div>

      {/* Grouped Dashboard */}
      {groupNames.length === 0 ? (
        <div className="empty-state">
          <p>No environments monitored. Add one above to get started.</p>
        </div>
      ) : (
        groupNames.map((groupName) => {
          const envs = grouped[groupName];
          const stats = getGroupStats(envs);
          const isCollapsed = collapsedGroups[groupName];

          return (
            <section key={groupName} className="group-section">
              <div className="group-header-wrapper">
                <button
                  className="group-header"
                  onClick={() => toggleGroup(groupName)}
                  aria-expanded={!isCollapsed}
                >
                  <div className="group-header-left">
                    <svg
                      className={`chevron ${isCollapsed ? "collapsed" : ""}`}
                      width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <svg
                      className="folder-icon"
                      width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="group-name">{groupName}</span>
                    <span className="group-count">({stats.total})</span>
                  </div>
                  <div className="group-badges">
                    {stats.up > 0 && <span className="badge badge-up">{stats.up} Up</span>}
                    {stats.down > 0 && <span className="badge badge-down">{stats.down} Down</span>}
                    {stats.pending > 0 && <span className="badge badge-pending">{stats.pending} Pending</span>}
                  </div>
                </button>
                <button
                  className="group-delete-btn"
                  onClick={() => removeGroup(groupName)}
                  title={`Delete entire "${groupName}" group`}
                  aria-label={`Delete group ${groupName}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>

              {!isCollapsed && (
                <ul className="dashboard-grid">
                  {envs.map((env) => {
                    const isEditing = editingId === env.id;
                    return (
                      <li key={env.id} className={`env-card status-${env.status}`}>
                        <div className="card-header">
                          {isEditing ? (
                            <input
                              ref={editNameRef}
                              type="text"
                              className="edit-input edit-name-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, env.id)}
                              placeholder="Env. Name"
                            />
                          ) : (
                            <div className="env-name" onDoubleClick={() => startEditing(env)} title="Double-click to edit">
                              <div className="status-dot"></div>
                              {env.name}
                              <button
                                className="edit-icon-btn"
                                onClick={() => startEditing(env)}
                                title="Edit environment"
                                aria-label="Edit environment"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                          )}
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

                        {isEditing ? (
                          <div className="edit-url-row">
                            <input
                              type="text"
                              className="edit-input edit-url-input"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, env.id)}
                              placeholder="URL"
                            />
                            <div className="edit-actions">
                              <button className="edit-save-btn" onClick={() => saveEditing(env.id)} title="Save">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                              <button className="edit-cancel-btn" onClick={cancelEditing} title="Cancel">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <a href={env.url} target="_blank" rel="noopener noreferrer" className="env-url">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            {env.url}
                          </a>
                        )}

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
                              ? env.lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                              : "Refresh"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
