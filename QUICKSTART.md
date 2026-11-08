# ⚡ AutomationMarketplace - Quick Start

## ONE SCRIPT TO RULE THEM ALL

Everything you need is in: `scripts\dev.bat`

---

## 🚀 Start Development

```bash
scripts\dev.bat start
```

This will:
1. ✅ Check Docker, Node.js, pnpm
2. 🐳 Start Postgres, Redis, Kafka, Temporal
3. 🔌 Start API Server (port 3000)
4. 🌐 Start React Frontend (port 5173)
5. ⚙️ Start Go Orchestrator (if exists)

**Wait 30 seconds** → Open http://localhost:5173

---

## 🧪 Test What's Working

```bash
scripts\dev.bat test
```

This runs automated tests showing which features work/broken.

---

## 🛑 Stop Everything

```bash
scripts\dev.bat stop
```

Stops all services and Docker containers.

---

## 🔄 Restart Everything

```bash
scripts\dev.bat restart
```

Stop → Wait → Start fresh.

---

## 📦 Build for Production

```bash
scripts\dev.bat build
```

Creates production bundles in:
- `frontend/dist/`
- `api/dist/`

---

## 🧹 Deep Clean (When Things Break)

```bash
scripts\dev.bat clean
```

This will:
- Stop all services
- Delete node_modules
- Delete build artifacts  
- Remove Docker volumes
- Reinstall everything
- Start fresh

⚠️ **Takes 5-10 minutes** - only use when something is really broken.

---

## 🎯 Daily Workflow

```bash
# Morning - Start work
cd c:\Users\sailo\AutomationMarketplace
scripts\dev.bat start

# Wait 30 seconds
# Open http://localhost:5173 in browser

# Make changes to code...
# Hot reload works automatically!

# Test after changes
scripts\dev.bat test

# End of day - Stop
scripts\dev.bat stop
```

---

## 🐛 Troubleshooting

### Services won't start
```bash
scripts\dev.bat stop
scripts\dev.bat clean
```

### Port already in use
```powershell
# Find what's using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
taskkill /PID <process-id> /F
```

### Docker not running
1. Open Docker Desktop
2. Wait for it to be ready
3. Run `scripts\dev.bat start` again

---

## 📂 What's Running?

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React app (main UI) |
| API | http://localhost:3000 | REST API |
| Temporal UI | http://localhost:8081 | Workflow monitoring |
| PostgreSQL | localhost:5433 | Database |
| Redis | localhost:6379 | Cache |

---

## 💡 Pro Tips

1. **Keep one terminal open** with `dev.bat start` - it shows logs
2. **Press Ctrl+C** in that terminal to stop everything
3. **Use `dev.bat test`** after making changes to verify nothing broke
4. **Frontend hot reload** - changes appear instantly, no restart needed
5. **API changes** - needs manual restart (close API window, run `dev.bat start`)

---

That's it! One script, everything works. 🎉
