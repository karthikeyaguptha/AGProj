# Environment Pulse

A real-time uptime monitoring dashboard for deployment environments (Dev, QA, Staging, UAT, etc.) built with Next.js and Vanilla CSS. Features a server-side proxy to avoid CORS errors, a sleek dark-mode UI with micro-animations, and smart grouping.

## Features

- **Compact Section Bars** — Space-optimized inline headers (AUTO REFRESH, ADD MONITOR, EMAIL ALERTS) with controls on the same line.
- **URL Grouping** — Collapsible groups with status badges. Delete, duplicate, or add monitors directly within each group.
- **Drag-and-Drop Reorder** — Rearrange monitor tiles within a group by dragging and dropping.
- **Email Alerts** — Configurable SMTP email notifications triggered automatically when an environment goes from UP → DOWN.
- **Auto-Refresh** — Toggle polling with intervals from 5s to 5min.
- **Gradient Status Cards** — Green/red gradient backgrounds for instant visual status feedback.
- **In-Group Add Monitor** — "+" tile at the end of each group for quick additions.
- **Inline Editing** — Always-visible pencil icon to edit name and URL directly on each card.
- **Toast Notifications** — Slide-in toasts with auto-dismiss progress bar for all important actions.
- **Persistent Settings** — All data saved in `localStorage`.

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
