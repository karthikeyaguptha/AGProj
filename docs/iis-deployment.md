# Deploying Environment Pulse on IIS

This guide covers deploying the Next.js-based Environment Pulse dashboard on Windows IIS.

## Prerequisites

- Windows Server with IIS enabled
- Node.js ≥ 18.x installed
- [iisnode](https://github.com/azure/iisnode) installed, **or** IIS configured as a reverse proxy

---

## Option A: Reverse Proxy (Recommended)

Run Next.js as a standalone process and proxy traffic through IIS.

### 1. Build the App

```bash
cd C:\inetpub\wwwroot\environment-pulse
npm install
npm run build
```

### 2. Create a Startup Script

Create `start.bat` in the project root:

```bat
@echo off
cd /d "%~dp0"
set PORT=3000
npm start
```

### 3. Install as a Windows Service

Use [NSSM](https://nssm.cc/) to run as a background service:

```powershell
nssm install EnvironmentPulse "C:\inetpub\wwwroot\environment-pulse\start.bat"
nssm set EnvironmentPulse AppDirectory "C:\inetpub\wwwroot\environment-pulse"
nssm start EnvironmentPulse
```

### 4. Configure IIS Reverse Proxy

Install **URL Rewrite** and **Application Request Routing (ARR)** via IIS.

Add `web.config` to the IIS site root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNextJS" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### 5. Shared Links Storage

Ensure the `data/shares/` directory has write permissions for the IIS app pool identity:

```powershell
$path = "C:\inetpub\wwwroot\environment-pulse\data\shares"
New-Item -ItemType Directory -Path $path -Force
$acl = Get-Acl $path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\DefaultAppPool", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl $path $acl
```

---

## Option B: iisnode

Run Next.js directly through iisnode (more complex, less recommended for Next.js).

### 1. Install iisnode

Download from [GitHub releases](https://github.com/azure/iisnode/releases).

### 2. Create `server.js`

```javascript
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(port);
});
```

### 3. Add `web.config`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="NextJS">
          <match url="/*" />
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
    <iisnode node_env="production" />
  </system.webServer>
</configuration>
```

---

## Environment Variables

If needed, create a `.env.local` file:

```env
# No environment variables required for basic usage
# Shared configs are stored in data/shares/ by default
```

---

## Verifying

1. Open `http://your-server/` — dashboard should load
2. Add monitors, click **Share** → **Generate Short Link**
3. Open the short link in another browser to verify sharing works
4. Check `data/shares/` directory for stored config JSON files
