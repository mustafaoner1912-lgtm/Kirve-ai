#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22) { console.error('Node.js 22 veya ustu gerekli.'); process.exit(1); }"
npm install --no-audit --no-fund
if [[ ! -f .env ]]; then node scripts/setup.mjs; else echo '.env mevcut; korunuyor.'; fi
npm run start:production
