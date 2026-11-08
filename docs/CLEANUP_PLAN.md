# Unnecessary Parts to Delete from AutomationMarketplace

## 🗑️ DUPLICATE UI (2 Frontend Projects!)

### 1. `/frontend/` - Your Custom React UI ✅ KEEP
```
frontend/
├── src/              ✅ Custom React workflow editor
├── package.json      ✅ React, Vite, ReactFlow, Tailwind
└── README_N8N_UI.md  ✅ Documentation
```
**Status:** Working, running on port 5173, custom-built

---

### 2. `/packages/frontend/editor-ui/` - n8n's Vue UI ❌ DELETE
```
packages/frontend/editor-ui/
├── src/              ❌ n8n's Vue 3 editor (600+ files)
├── package.json      ❌ Vue dependencies
└── ...               ❌ Entire n8n UI codebase
```
**Status:** Duplicate! You already have your own React UI

---

## 📦 ALL PACKAGES TO DELETE

```
packages/
├── @n8n/                    ❌ DELETE ALL (40+ n8n packages)
│   ├── ai-builder/          ❌ n8n AI features
│   ├── api-types/           ❌ n8n TypeScript types
│   ├── backend-common/      ❌ n8n logging/config
│   ├── chat/                ❌ n8n chat widget
│   ├── composables/         ❌ n8n Vue composables
│   ├── config/              ❌ n8n configuration
│   ├── constants/           ❌ n8n constants
│   ├── db/                  ❌ n8n TypeORM entities
│   ├── decorators/          ❌ n8n decorators
│   ├── design-system/       ❌ n8n Vue components
│   ├── di/                  ❌ n8n DI container
│   ├── errors/              ❌ n8n error classes
│   ├── i18n/                ❌ n8n translations
│   ├── nodes-langchain/     ❌ n8n AI nodes
│   ├── oauth2/              ❌ n8n OAuth library
│   ├── permissions/         ❌ n8n RBAC
│   ├── rest-api-client/     ❌ n8n API client
│   ├── stores/              ❌ n8n Pinia stores
│   ├── storybook/           ❌ n8n component docs
│   ├── testing/             ❌ n8n test utilities
│   └── typeorm/             ❌ n8n TypeORM fork
│
├── cli/                     ❌ DELETE (n8n main server)
├── core/                    ❌ DELETE (n8n execution engine)
├── workflow/                ❌ DELETE (n8n workflow types)
├── nodes-base/              ❌ DELETE (400+ n8n nodes)
├── node-dev/                ❌ DELETE (n8n node dev tools)
├── extensions/              ❌ DELETE (n8n extension system)
└── frontend/
    └── editor-ui/           ❌ DELETE (n8n Vue UI - duplicate!)
```

**Total to delete:** ~22,000 files, ~500MB!

---

## 🔧 INFRASTRUCTURE TO REVIEW

### Keep If Using, Delete If Not

| Directory | Keep? | Reason |
|-----------|-------|--------|
| `infrastructure/helm/` | ❌ DELETE | Only if deploying to Kubernetes |
| `infrastructure/kong/` | ❌ DELETE | Only if using Kong Gateway |
| `infrastructure/kubernetes/` | ❌ DELETE | Only if deploying to K8s |
| `infrastructure/temporal/` | ✅ KEEP | Using Temporal! |
| `observability/grafana/` | ❌ DELETE | Only if monitoring needed now |
| `observability/prometheus/` | ❌ DELETE | Only if monitoring needed now |
| `observability/jaeger/` | ❌ DELETE | Only if tracing needed now |
| `messaging/` | ❌ DELETE | Only if using Kafka |
| `temporal_cli/` | ⚠️ OPTIONAL | Can download CLI when needed |
| `bin/` | ⚠️ CHECK | See what's inside |
| `extensions/` | ❌ DELETE | n8n plugin system |
| `tests/` | ⚠️ LATER | E2E tests for later |
| `public/` | ✅ KEEP | Static assets |
| `scripts/` | ✅ KEEP | Build scripts |

---

## 🚀 WORKERS TO KEEP

```
workers/
├── nodejs-worker/    ✅ KEEP (HTTP, API tasks)
├── python-worker/    ✅ KEEP (ML, data science)
├── go-worker/        ⚠️ CHECK (not implemented?)
└── rust-worker/      ❌ DELETE (missing Cargo.lock)
```

---

## 📊 CLEANUP IMPACT

### Current Size
```
packages/           ~500MB  (n8n source code)
node_modules/       ~1.5GB  (dependencies)
frontend/           ~50MB   (your custom UI)
api/                ~10MB   (your API)
workers/            ~100MB  (your workers)
orchestrator-go/    ~20MB   (your Go code)
```

### After Cleanup
```
api/                ~10MB   (your API) ✅
frontend/           ~50MB   (your custom UI) ✅
workers/            ~100MB  (your workers) ✅
orchestrator-go/    ~20MB   (your Go code) ✅
db/                 ~5MB    (migrations) ✅

Total: ~185MB (from ~2.2GB = 92% reduction!)
```

---

## 🎯 RECOMMENDED CLEANUP PLAN

### Phase 1: Delete Duplicates (Immediate)
```bash
# Delete duplicate n8n UI
rm -rf packages/frontend/editor-ui/

# Delete all copied n8n packages
rm -rf packages/@n8n/
rm -rf packages/cli/
rm -rf packages/core/
rm -rf packages/workflow/
rm -rf packages/nodes-base/
rm -rf packages/node-dev/
rm -rf packages/extensions/

# Delete rust worker (missing files)
rm -rf workers/rust-worker/
```

### Phase 2: Clean Infrastructure (If Not Using)
```bash
# Only if NOT using these
rm -rf infrastructure/helm/
rm -rf infrastructure/kong/
rm -rf infrastructure/kubernetes/
rm -rf observability/
rm -rf messaging/
rm -rf extensions/
```

### Phase 3: Cleanup Config Files
```bash
# Remove n8n-related configs
rm -rf api/module-alias.js
rm -rf api/.env.n8n
rm -rf api/server.js  # Old duplicate
```

---

## ✅ FINAL CLEAN STRUCTURE

```
AutomationMarketplace/
├── api/                      ✅ Your Express API + Temporal adapter
│   ├── src/
│   │   ├── server.ts         ✅ Main server
│   │   ├── db.ts             ✅ PostgreSQL pool
│   │   ├── Cipher.js         ✅ Encryption
│   │   └── adapters/
│   │       └── temporal-workflow-runner.ts  ✅ Temporal integration
│   └── package.json          ✅ Simple dependencies
│
├── frontend/                 ✅ Your React UI
│   ├── src/
│   └── package.json
│
├── orchestrator-go/          ✅ Go Temporal orchestrator
│   ├── main.go
│   └── workflows/
│
├── workers/                  ✅ Multi-language workers
│   ├── nodejs-worker/        ✅ HTTP, Slack, Gmail
│   └── python-worker/        ✅ ML, OpenAI
│
├── db/                       ✅ Database migrations
│   ├── migrations/
│   └── schemas/
│
├── docker-compose.yml        ✅ Infrastructure (Postgres, Redis, Temporal)
└── docs/                     ✅ Documentation
    └── architecture/
        ├── N8N_ADAPTATION_PLAN.md
        └── N8N_TEMPORAL_ADAPTER.md
```

---

## 🚀 NEXT STEPS

1. **Confirm deletion** - Review list above
2. **Backup** - `git commit -m "Before cleanup"`
3. **Delete packages/** - Remove all n8n copies
4. **Delete duplicate UI** - Keep only `/frontend/`
5. **Test** - Run `pnpm dev` to ensure everything works
6. **Clean node_modules** - `rm -rf node_modules && pnpm install`
7. **Update docs** - Remove n8n references

**Result:** Clean codebase, 92% smaller, easier to maintain!
