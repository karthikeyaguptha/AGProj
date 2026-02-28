<div align="center">

# ⚡ Environment Pulse

**Real-time uptime monitoring for your deployment environments**

![Version](https://img.shields.io/badge/version-2.5-6366f1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)

A sleek, dark-themed dashboard to monitor the health of your deployment environments — Dev, QA, Staging, UAT, Production — all at a glance.

</div>

---

## ✨ Features

| Category | Feature | Description |
|----------|---------|-------------|
| **Monitoring** | Real-time Status | Pings each URL — UP (green) / DOWN (red) with pulsing dots |
| | Auto-Refresh | Configurable polling: `5s` · `10s` · `30s` · `45s` · `60s` · `3m` · `5m` |
| | Manual Refresh | Per-card or "Refresh All" one-click refresh |
| **Groups** | Collapsible Groups | Organize monitors into folder-like groups with live status badges |
| | Group Actions | Rename (pencil icon), Duplicate, Delete, In-group Add (+) |
| | Drag & Drop | Reorder monitors within a group |
| **Editing** | Inline Edit | Click pencil icon on any card to edit name/URL directly |
| | Auto Name | Name auto-derived from URL hostname if left blank |
| **Bulk Import** | Paste Links | Paste URLs separated by `,` `;` `\|` or newline — max 25 per batch |
| | CSV Upload | Upload `.csv` with 1–3 columns: `url`, `name,url`, or `name,url,group` |
| | Header Detection | CSV header rows auto-detected and skipped |
| **Email Alerts** | SMTP Config | Full SMTP setup (Host, Port, User, Pass, From, To) |
| | Auto-Trigger | Email sent on UP → DOWN transition |
| **UI** | Adaptive Grid | ≤8 monitors: 4-col grid · ≥9 monitors: horizontal scroll |
| | Toast System | Slide-in notifications with progress bar auto-dismiss |
| | Privacy Policy | Built-in modal accessible from footer |
| **Persistence** | localStorage | All monitors, groups, settings, and email config persist locally |

---

## 🚀 Getting Started

```bash
# Clone & install
git clone https://github.com/karthikeyaguptha/AGProj.git
cd AGProj && npm install

# Development
npm run dev          # → http://localhost:3000

# Production
npm run build && npm start
```

**Prerequisites:** Node.js ≥ 18.x, npm ≥ 9.x

---

## ⚙️ Configuration

### Adding Monitors

1. Use the **Add Monitor** form — select/type a group, enter URL (name is optional), click **Add**
2. Or use **Import Links** (top-right) to paste bulk URLs or upload a CSV file

### Email Alerts

Toggle **Email Alerts** ON → Click **Configure** → Fill SMTP details:

| Field | Example | Required |
|-------|---------|----------|
| SMTP Host | `smtp.gmail.com` | ✅ |
| Port | `587` | ✅ |
| Username | `your@email.com` | ✅ |
| Password | `app-password-here` | ✅ |
| From Email | `alerts@yourdomain.com` | ❌ |
| To Email(s) | `team@company.com` | ✅ |

> **Gmail Users:** Use an [App Password](https://myaccount.google.com/apppasswords) — regular passwords won't work.

---

## 🏗️ Project Structure

```
AGProj/
├── src/app/
│   ├── api/
│   │   ├── status/route.ts    # Health check proxy
│   │   └── alert/route.ts     # Email alert (Nodemailer)
│   ├── page.tsx               # Dashboard component
│   ├── globals.css            # Design system
│   ├── layout.tsx             # Root layout + metadata
│   └── icon.svg               # Favicon
├── docs/screenshots/          # Documentation screenshots
├── LICENSE
└── README.md
```

---

## 🔒 Privacy

Runs **entirely in your browser**. No data sent to external servers beyond health-check requests. All configs stored in `localStorage`.

---

## 📋 Changelog

### v2.5
- **Bulk Import** — Paste links (comma/semicolon/pipe/newline) or upload CSV (1–3 columns with header detection), max 25 per batch
- **3-Row Add Monitor** — Group + New Group Name → Env Name → URL, Add button right-aligned
- **Group Rename** — Pencil icon on hover, inline edit with Enter/Escape
- **Adaptive Grid** — ≤8: fixed 4×2 grid · ≥9: horizontal scroll
- **Single-row controls** — Auto Refresh + Email Alerts flattened

### v2.1
- In-group Add moved to header "+" button
- Per-card duplicate button
- Auto-refresh layout fix

### v2.0
- 2-row Add Monitor form, 50/50 split controls, compact card grid
- Full README with screenshots, heartbeat favicon, company branding

### v1.0
- Initial release: status monitoring, groups, drag-and-drop, email alerts, toast notifications, dark glassmorphism theme, Next.js 16 + TypeScript

---

## 📝 License

MIT License — see [LICENSE](LICENSE).

---

<div align="center">

Made with ♥ for [**Scientific Games India Pvt., Ltd**](https://www.scientificgames.com/company/)

</div>
