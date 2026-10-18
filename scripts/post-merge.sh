#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# The legacy external database must not be reconciled against shared models.
pnpm install --frozen-lockfile
