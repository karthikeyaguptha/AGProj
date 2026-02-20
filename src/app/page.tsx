"use client";

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";

type EnvStatus = "up" | "down" | "pending";

interface Environment {
  id: string;
  name: string;
  url: string;
  group: string;
  status: EnvStatus;
  lastChecked: Date | null;
}

type ToastType = "success" | "error" | "info";
interface Toast { id: string; message: string; type: ToastType; createdAt: number; duration: number; }

interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  from: string;
  to: string;
}

const REFRESH_OPTIONS = [
  { label: "5s", value: 5000 }, { label: "10s", value: 10000 }, { label: "30s", value: 30000 },
  { label: "45s", value: 45000 }, { label: "60s", value: 60000 }, { label: "3m", value: 180000 }, { label: "5m", value: 300000 },
];

const MAX_NAME = 50;
const MAX_URL = 2000;
const TOAST_DUR = 4000;

const DEFAULT_ENVS: Environment[] = [
  { id: "1", name: "Dev", url: "https://dev.example.com", group: "Development", status: "pending", lastChecked: null },
  { id: "2", name: "QA", url: "https://qa.example.com", group: "Testing", status: "pending", lastChecked: null },
  { id: "3", name: "Staging", url: "https://staging.example.com", group: "Pre-Production", status: "pending", lastChecked: null },
  { id: "4", name: "UAT", url: "https://uat.example.com", group: "Pre-Production", status: "pending", lastChecked: null },
];

const DEFAULT_EMAIL: EmailConfig = { enabled: false, smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", from: "", to: "" };

// ── Toast Component ──
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (<div className="toast-container">{toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}</div>);
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const r = Math.max(0, 100 - ((Date.now() - start) / toast.duration) * 100);
      setProgress(r);
      if (r <= 0) { clearInterval(timer); onDismiss(toast.id); }
    }, 50);
    return () => clearInterval(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {toast.type === "success" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          {toast.type === "error" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
          {toast.type === "info" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
        </span>
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={() => onDismiss(toast.id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
      </div>
      <div className="toast-progress-track"><div className="toast-progress-bar" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

// ── Main Dashboard ──
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [inGroupAddTarget, setInGroupAddTarget] = useState<string | null>(null);
  const [inGroupName, setInGroupName] = useState("");
  const [inGroupUrl, setInGroupUrl] = useState("");
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const prevStatusRef = useRef<Record<string, EnvStatus>>({});

  // Toast
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    setToasts((p) => [...p, { id: Date.now().toString() + Math.random().toString(36).slice(2), message, type, createdAt: Date.now(), duration: TOAST_DUR }]);
  }, []);
  const dismissToast = useCallback((id: string) => { setToasts((p) => p.filter((t) => t.id !== id)); }, []);

  // Init
  useEffect(() => {
    const saved = localStorage.getItem("env-dashboard-data");
    if (saved) { try { setEnvironments(JSON.parse(saved).map((e: any) => ({ ...e, group: e.group || "Default", lastChecked: e.lastChecked ? new Date(e.lastChecked) : null }))); } catch { setEnvironments(DEFAULT_ENVS); } }
    else setEnvironments(DEFAULT_ENVS);
    const sr = localStorage.getItem("env-dashboard-autorefresh");
    if (sr) { try { const { enabled, interval } = JSON.parse(sr); setAutoRefreshEnabled(!!enabled); if (interval) setRefreshInterval(interval); } catch { } }
    const se = localStorage.getItem("env-dashboard-email");
    if (se) { try { setEmailConfig(JSON.parse(se)); } catch { } }
    setInitialized(true);
  }, []);

  useEffect(() => { if (initialized) { if (environments.length > 0) localStorage.setItem("env-dashboard-data", JSON.stringify(environments)); else localStorage.removeItem("env-dashboard-data"); } }, [environments, initialized]);
  useEffect(() => { if (initialized) localStorage.setItem("env-dashboard-autorefresh", JSON.stringify({ enabled: autoRefreshEnabled, interval: refreshInterval })); }, [autoRefreshEnabled, refreshInterval, initialized]);
  useEffect(() => { if (initialized) localStorage.setItem("env-dashboard-email", JSON.stringify(emailConfig)); }, [emailConfig, initialized]);
  useEffect(() => { if (editingId && editNameRef.current) editNameRef.current.focus(); }, [editingId]);

  // Email alert
  const sendAlert = useCallback(async (env: Environment) => {
    if (!emailConfig.enabled || !emailConfig.smtpHost || !emailConfig.to) return;
    try {
      await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emailConfig, envName: env.name, envUrl: env.url, group: env.group }),
      });
      addToast(`Alert sent for "${env.name}"`, "info");
    } catch { addToast(`Failed to send alert for "${env.name}"`, "error"); }
  }, [emailConfig, addToast]);

  const checkStatus = useCallback(async (id: string, url: string) => {
    setIsRefreshing((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/status?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const newStatus: EnvStatus = data.isUp ? "up" : "down";
      setEnvironments((prev) => {
        const env = prev.find((e) => e.id === id);
        const oldStatus = prevStatusRef.current[id];
        // Trigger email on UP → DOWN transition
        if (env && oldStatus === "up" && newStatus === "down") sendAlert(env);
        prevStatusRef.current[id] = newStatus;
        return prev.map((e) => e.id === id ? { ...e, status: newStatus, lastChecked: new Date() } : e);
      });
    } catch {
      setEnvironments((prev) => {
        const env = prev.find((e) => e.id === id);
        const oldStatus = prevStatusRef.current[id];
        if (env && oldStatus === "up") sendAlert(env);
        prevStatusRef.current[id] = "down";
        return prev.map((e) => e.id === id ? { ...e, status: "down", lastChecked: new Date() } : e);
      });
    } finally { setIsRefreshing((p) => ({ ...p, [id]: false })); }
  }, [sendAlert]);

  const refreshAll = useCallback(() => { setEnvironments((c) => { c.forEach((e) => checkStatus(e.id, e.url)); return c; }); }, [checkStatus]);

  useEffect(() => { if (!initialized || environments.length === 0) return; environments.forEach((e) => { if (e.status === "pending" || !e.lastChecked) { prevStatusRef.current[e.id] = e.status; checkStatus(e.id, e.url); } }); }, [initialized]); // eslint-disable-line

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (autoRefreshEnabled && environments.length > 0) intervalRef.current = setInterval(refreshAll, refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefreshEnabled, refreshInterval, environments.length, refreshAll]);

  const deriveName = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    let u = newUrl.trim(); if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const n = newName.trim() || deriveName(u);
    const env: Environment = { id: Date.now().toString(), name: n, url: u, group: newGroup.trim() || "Default", status: "pending", lastChecked: null };
    setEnvironments((p) => [...p, env]); setNewName(""); setNewUrl("");
    prevStatusRef.current[env.id] = "pending"; checkStatus(env.id, env.url);
    addToast(`"${n}" added to ${env.group}`, "success");
  };

  const handleInGroupAdd = (groupName: string) => {
    if (!inGroupUrl.trim()) return;
    let u = inGroupUrl.trim(); if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const n = inGroupName.trim() || deriveName(u);
    const env: Environment = { id: Date.now().toString(), name: n, url: u, group: groupName, status: "pending", lastChecked: null };
    setEnvironments((p) => [...p, env]); setInGroupName(""); setInGroupUrl(""); setInGroupAddTarget(null);
    prevStatusRef.current[env.id] = "pending"; checkStatus(env.id, env.url);
    addToast(`"${n}" added to ${groupName}`, "success");
  };

  const removeEnvironment = (id: string) => { const e = environments.find((x) => x.id === id); setEnvironments((p) => p.filter((x) => x.id !== id)); if (editingId === id) setEditingId(null); if (e) addToast(`"${e.name}" removed`, "error"); };

  const removeGroup = (g: string) => { const c = environments.filter((e) => e.group === g).length; setEnvironments((p) => p.filter((e) => e.group !== g)); addToast(`Group "${g}" deleted (${c} monitors)`, "error"); };

  const duplicateGroup = (g: string) => {
    const src = environments.filter((e) => e.group === g);
    if (!src.length) return;
    const ng = `${g} (Copy)`;
    const dup = src.map((e) => ({ ...e, id: Date.now().toString() + Math.random().toString(36).slice(2), group: ng, status: "pending" as EnvStatus, lastChecked: null }));
    setEnvironments((p) => [...p, ...dup]);
    dup.forEach((e) => { prevStatusRef.current[e.id] = "pending"; checkStatus(e.id, e.url); });
    addToast(`"${g}" duplicated as "${ng}"`, "success");
  };

  const toggleGroup = (g: string) => setCollapsedGroups((p) => ({ ...p, [g]: !p[g] }));

  const startEditing = (e: Environment) => { setEditingId(e.id); setEditName(e.name); setEditUrl(e.url); };
  const cancelEditing = () => { setEditingId(null); setEditName(""); setEditUrl(""); };
  const saveEditing = (id: string) => {
    if (!editUrl.trim()) return;
    let u = editUrl.trim(); if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const n = editName.trim() || deriveName(u);
    setEnvironments((p) => p.map((e) => e.id === id ? { ...e, name: n, url: u, status: "pending", lastChecked: null } : e));
    setEditingId(null); setEditName(""); setEditUrl("");
    prevStatusRef.current[id] = "pending"; checkStatus(id, u); addToast(`"${n}" updated`, "info");
  };
  const handleEditKey = (e: React.KeyboardEvent, id: string) => { if (e.key === "Enter") { e.preventDefault(); saveEditing(id); } if (e.key === "Escape") cancelEditing(); };

  // Drag-and-drop reorder within group
  const handleDragStart = (e: DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    setEnvironments((prev) => {
      const dragEnv = prev.find((x) => x.id === dragId);
      const targetEnv = prev.find((x) => x.id === targetId);
      if (!dragEnv || !targetEnv || dragEnv.group !== targetEnv.group) return prev;
      const next = [...prev];
      const dragIdx = next.findIndex((x) => x.id === dragId);
      const targetIdx = next.findIndex((x) => x.id === targetId);
      next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, dragEnv);
      return next;
    });
    setDragId(null);
    addToast("Monitor reordered", "info");
  };

  const grouped = environments.reduce<Record<string, Environment[]>>((a, e) => { const g = e.group || "Default"; if (!a[g]) a[g] = []; a[g].push(e); return a; }, {});
  const groupNames = Object.keys(grouped).sort();
  const allGroupNames = Array.from(new Set(environments.map((e) => e.group).filter(Boolean))).sort();
  const getStats = (envs: Environment[]) => ({ up: envs.filter((e) => e.status === "up").length, down: envs.filter((e) => e.status === "down").length, pending: envs.filter((e) => e.status === "pending").length, total: envs.length });

  return (
    <main className="container">
      <header className="header">
        <h1>Environment Pulse</h1>
        <p>Real-time uptime monitoring for your deployment environments</p>
      </header>

      {/* ─── Auto-Refresh Bar (compact inline) ─── */}
      <div className="section-bar">
        <span className="section-label">Auto Refresh</span>
        <div className="section-bar-content">
          <label className="toggle-switch" htmlFor="ar-toggle">
            <input id="ar-toggle" type="checkbox" checked={autoRefreshEnabled} onChange={() => setAutoRefreshEnabled(!autoRefreshEnabled)} />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-status">{autoRefreshEnabled ? "ON" : "OFF"}</span>
          {autoRefreshEnabled && (
            <div className="interval-options">
              {REFRESH_OPTIONS.map((o) => (
                <button key={o.value} className={`interval-btn ${refreshInterval === o.value ? "active" : ""}`} onClick={() => setRefreshInterval(o.value)}>{o.label}</button>
              ))}
            </div>
          )}
          <button className="btn btn-sm" onClick={refreshAll}>Refresh All</button>
        </div>
      </div>

      {/* ─── Add Monitor Form (compact inline heading) ─── */}
      <div className="section-bar section-bar-form">
        <span className="section-label">Add Monitor</span>
        <form onSubmit={handleAddSubmit} className="form-inline">
          <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="select-sm">
            <option value="">Group</option>
            {allGroupNames.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input type="text" placeholder="Or new group" value={newGroup} onChange={(e) => setNewGroup(e.target.value.slice(0, MAX_NAME))} maxLength={MAX_NAME} className="input-sm" />
          <input type="text" placeholder="Env. Name" value={newName} onChange={(e) => setNewName(e.target.value.slice(0, MAX_NAME))} maxLength={MAX_NAME} className="input-sm" />
          <div className="input-required-wrap">
            <input type="text" placeholder="URL *" value={newUrl} onChange={(e) => setNewUrl(e.target.value.slice(0, MAX_URL))} maxLength={MAX_URL} required className="input-sm input-url" />
          </div>
          <button type="submit" className="btn btn-sm">Add</button>
        </form>
      </div>

      {/* ─── Email Alerts Section (compact) ─── */}
      <div className="section-bar">
        <span className="section-label">Email Alerts</span>
        <div className="section-bar-content">
          <label className="toggle-switch" htmlFor="email-toggle">
            <input id="email-toggle" type="checkbox" checked={emailConfig.enabled} onChange={() => setEmailConfig((p) => ({ ...p, enabled: !p.enabled }))} />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-status">{emailConfig.enabled ? "ON" : "OFF"}</span>
          <button className="btn btn-sm btn-outline" onClick={() => setShowEmailConfig(!showEmailConfig)}>
            {showEmailConfig ? "Hide Config" : "Configure"}
          </button>
        </div>
      </div>

      {showEmailConfig && (
        <div className="email-config-panel">
          <div className="email-config-grid">
            <div className="ecf">
              <label>SMTP Host <span className="req">*</span></label>
              <input type="text" placeholder="smtp.gmail.com" value={emailConfig.smtpHost} onChange={(e) => setEmailConfig((p) => ({ ...p, smtpHost: e.target.value }))} />
            </div>
            <div className="ecf">
              <label>Port <span className="req">*</span></label>
              <input type="text" placeholder="587" value={emailConfig.smtpPort} onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPort: e.target.value }))} />
            </div>
            <div className="ecf">
              <label>Username <span className="req">*</span></label>
              <input type="text" placeholder="your@email.com" value={emailConfig.smtpUser} onChange={(e) => setEmailConfig((p) => ({ ...p, smtpUser: e.target.value }))} />
            </div>
            <div className="ecf">
              <label>Password <span className="req">*</span></label>
              <input type="password" placeholder="••••••••" value={emailConfig.smtpPass} onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPass: e.target.value }))} />
            </div>
            <div className="ecf">
              <label>From Email</label>
              <input type="text" placeholder="alerts@yourdomain.com" value={emailConfig.from} onChange={(e) => setEmailConfig((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="ecf">
              <label>To Email(s) <span className="req">*</span></label>
              <input type="text" placeholder="team@company.com" value={emailConfig.to} onChange={(e) => setEmailConfig((p) => ({ ...p, to: e.target.value }))} />
            </div>
          </div>
          <p className="email-hint">Emails are sent when any environment transitions from UP → DOWN. For Gmail, use an App Password.</p>
        </div>
      )}

      {/* ─── Grouped Dashboard ─── */}
      {groupNames.length === 0 ? (
        <div className="empty-state"><p>No environments monitored yet.</p></div>
      ) : (
        groupNames.map((gn) => {
          const envs = grouped[gn];
          const s = getStats(envs);
          const collapsed = collapsedGroups[gn];
          return (
            <section key={gn} className="group-section">
              <div className="group-header-wrapper">
                <button className="group-header" onClick={() => toggleGroup(gn)} aria-expanded={!collapsed}>
                  <div className="group-header-left">
                    <svg className={`chevron ${collapsed ? "collapsed" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    <svg className="folder-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    <span className="group-name">{gn}</span>
                    <span className="group-count">({s.total})</span>
                  </div>
                  <div className="group-badges">
                    {s.up > 0 && <span className="badge badge-up">{s.up} Up</span>}
                    {s.down > 0 && <span className="badge badge-down">{s.down} Down</span>}
                    {s.pending > 0 && <span className="badge badge-pending">{s.pending} ⏳</span>}
                  </div>
                </button>
                <button className="group-action-btn" onClick={() => duplicateGroup(gn)} title="Duplicate group"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></button>
                <button className="group-delete-btn" onClick={() => removeGroup(gn)} title="Delete group"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
              </div>
              {!collapsed && (
                <ul className="dashboard-grid">
                  {envs.map((env) => {
                    const isEditing = editingId === env.id;
                    return (
                      <li key={env.id} className={`env-card status-${env.status} ${dragId === env.id ? "dragging" : ""}`}
                        draggable={!isEditing} onDragStart={(e) => handleDragStart(e, env.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, env.id)} onDragEnd={() => setDragId(null)}>
                        <div className="card-header">
                          {isEditing ? (
                            <input ref={editNameRef} type="text" className="edit-input edit-name-input" value={editName} onChange={(e) => setEditName(e.target.value.slice(0, MAX_NAME))} maxLength={MAX_NAME} onKeyDown={(e) => handleEditKey(e, env.id)} placeholder="Name" />
                          ) : (
                            <div className="env-name">
                              <div className="status-dot"></div>
                              {env.name}
                              <button className="edit-icon-btn" onClick={() => startEditing(env)} title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                            </div>
                          )}
                          <button onClick={() => removeEnvironment(env.id)} className="delete-btn" title="Remove"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                        {isEditing ? (
                          <div className="edit-url-row">
                            <input type="text" className="edit-input edit-url-input" value={editUrl} onChange={(e) => setEditUrl(e.target.value.slice(0, MAX_URL))} maxLength={MAX_URL} onKeyDown={(e) => handleEditKey(e, env.id)} placeholder="URL" />
                            <div className="edit-actions">
                              <button className="edit-save-btn" onClick={() => saveEditing(env.id)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></button>
                              <button className="edit-cancel-btn" onClick={cancelEditing}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                            </div>
                          </div>
                        ) : (
                          <a href={env.url} target="_blank" rel="noopener noreferrer" className="env-url">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            {env.url}
                          </a>
                        )}
                        <div className="card-footer">
                          <span className="card-status-text">{env.status === "pending" ? "Checking..." : env.status}</span>
                          <div className="card-footer-right">
                            <span className="last-checked-time">{env.lastChecked ? env.lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span>
                            <button onClick={() => checkStatus(env.id, env.url)} className="refresh-btn" disabled={isRefreshing[env.id]} title="Refresh">
                              <svg className={isRefreshing[env.id] ? "spin" : ""} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {/* Add Monitor Tile */}
                  <li className="env-card add-monitor-tile">
                    {inGroupAddTarget === gn ? (
                      <div className="in-group-form">
                        <input type="text" className="edit-input" placeholder="Name (optional)" value={inGroupName} onChange={(e) => setInGroupName(e.target.value.slice(0, MAX_NAME))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInGroupAdd(gn); } if (e.key === "Escape") setInGroupAddTarget(null); }} />
                        <input type="text" className="edit-input" placeholder="URL *" value={inGroupUrl} onChange={(e) => setInGroupUrl(e.target.value.slice(0, MAX_URL))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInGroupAdd(gn); } if (e.key === "Escape") setInGroupAddTarget(null); }} />
                        <div className="in-group-form-actions">
                          <button className="btn btn-sm" onClick={() => handleInGroupAdd(gn)}>Add</button>
                          <button className="edit-cancel-btn" onClick={() => setInGroupAddTarget(null)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-tile-btn" onClick={() => { setInGroupAddTarget(gn); setInGroupName(""); setInGroupUrl(""); }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        <span>Add Monitor</span>
                      </button>
                    )}
                  </li>
                </ul>
              )}
            </section>
          );
        })
      )}

      {/* ─── Privacy Policy Modal ─── */}
      {showPrivacy && (
        <div className="modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Privacy Policy</h2>
              <button className="modal-close" onClick={() => setShowPrivacy(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <h3>Information We Collect</h3>
              <p>Environment Pulse runs entirely in your browser. All environment URLs, group configurations, and auto-refresh preferences are stored locally in your browser&apos;s <code>localStorage</code>. No data is transmitted to external servers beyond the health-check requests to your configured URLs.</p>

              <h3>Email Alerts</h3>
              <p>If you configure email alerts, SMTP credentials are stored in <code>localStorage</code> on your device. Emails are sent through the configured SMTP server when an environment status changes from UP to DOWN. We do not store, log, or share your SMTP credentials on any server.</p>

              <h3>Health Check Requests</h3>
              <p>Status checks are performed via a server-side API route to avoid CORS restrictions. These requests are made directly to the URLs you provide and are not logged or stored beyond the current session.</p>

              <h3>Cookies &amp; Tracking</h3>
              <p>This application does not use cookies, analytics, or any third-party tracking services.</p>

              <h3>Data Retention</h3>
              <p>All data persists in your browser&apos;s local storage until you manually clear it. Uninstalling or clearing browser data will remove all configurations.</p>

              <h3>Open Source</h3>
              <p>This project is open source under the MIT License. You may inspect, modify, and distribute the source code freely.</p>

              <h3>Contact</h3>
              <p>For questions or concerns regarding this privacy policy, please open an issue on the <a href="https://github.com/karthikeyaguptha/AGProj" target="_blank" rel="noopener noreferrer">GitHub repository</a>.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            <span>Environment Pulse</span>
          </div>
          <div className="footer-version">v1.0</div>
        </div>
        <div className="footer-links">
          <a href="https://github.com/karthikeyaguptha/AGProj" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            GitHub
          </a>
          <span className="footer-dot">·</span>
          <button className="footer-link footer-btn" onClick={() => setShowPrivacy(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            Privacy Policy
          </button>
          <span className="footer-dot">·</span>
          <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            MIT License
          </a>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} Environment Pulse. All rights reserved.
          <span className="footer-heart"> Made with ♥ for Scientific Games India Pvt., Ltd</span>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
