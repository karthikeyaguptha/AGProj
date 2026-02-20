# Environment Pulse

A real-time uptime monitoring dashboard for deployment environments (Dev, QA, Staging, UAT, etc.) built with Next.js and Vanilla CSS. Features a server-side proxy to avoid CORS errors, a sleek dark-mode UI with micro-animations, and smart grouping.

## Features

- **URL Grouping** — Organize environments into collapsible folder-like groups. Each group shows status badges (Up / Down / Pending).
- **Group Dropdown** — Select an existing group from a dropdown or type a new group name.
- **Group Delete & Duplicate** — Delete an entire group or duplicate it (with all monitors) using icons on the group header.
- **In-Group Add Monitor** — Each group has a "+" tile at the end to quickly add a monitor directly into that group.
- **Auto-Refresh** — Toggle automatic polling with intervals: 5s, 10s, 30s, 45s, 60s, 3min, 5min. Manual "Refresh All Now" always available.
- **Gradient Status Cards** — Beautiful green/red gradient backgrounds give instant visual status feedback.
- **Real-time Status** — Pulsing dots with separated timestamp and refresh button per card.
- **Add / Remove Monitors** — Name is optional (auto-derived from URL hostname). Character limits: 50 for names, 2000 for URLs.
- **Inline Editing** — Always-visible pencil icon to edit name and URL directly on each card.
- **Toast Notifications** — Slide-in toasts in the bottom-right with icon, message, close button, and auto-dismiss progress bar for all important actions.
- **Persistent Settings** — Environments, groups, and auto-refresh preferences saved in `localStorage`.

## How to Run the Application

Follow these simple steps to run the dashboard locally:

### 1. Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### 2. Start the Development Server
To run the app in development mode, execute:
```bash
npm run dev
```

### 3. Open the Application
Once the server is running, open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

Your dashboard is now up and running!

## Building for Production

If you want to run the optimized production version of the dashboard, you **must complete both steps in order**:

### 1. Build the Application
This step generates the `.next` build folder. Do not skip this step!
```bash
npm run build
```

### 2. Start the Production Server
Once the build finishes successfully, start the server:
```bash
npm start
```

---

## Troubleshooting

### Error: `"next" command not found`
**Cause:** Node modules are missing.  
**Solution:** You forgot to install dependencies. Run `npm install` first, then run your build or dev command again.

### Error: `Could not find a production build in the '.next' directory.`
**Cause:** You are trying to run `npm start` before building the app.  
**Solution:** You must run `npm run build` to generate the `.next` folder before you can run `npm start`.
