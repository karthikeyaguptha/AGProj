# Environment Pulse

A real-time uptime monitoring dashboard for deployment environments (Dev, QA, Staging, UAT, etc.) built with Next.js and Vanilla CSS. Features a server-side proxy to avoid CORS errors, a sleek dark-mode UI with micro-animations, and smart grouping.

## Features

- **URL Grouping** — Organize environments into collapsible folder-like groups (e.g., Development, Testing, Pre-Production). Each group shows status badges summarizing how many are Up / Down.
- **Auto-Refresh** — Global toggle to enable/disable automatic status polling. Choose from intervals: 5s, 10s, 30s, 45s, 60s, 3min, or 5min. A "Refresh All Now" button is always available for manual checks.
- **Real-time Status** — Each environment card shows a pulsing green dot (UP) or red dot (DOWN) with the last-checked timestamp.
- **Add / Remove Monitors** — Quickly add new environments with a Group, Name, and URL. Remove any with a single click.
- **Persistent Settings** — All environments, groups, and auto-refresh preferences are saved in `localStorage` across sessions.

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
