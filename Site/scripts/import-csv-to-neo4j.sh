#!/usr/bin/env bash
# Importe les CSV du dossier moc_data/Résultats vers la base Neo4j
# configuree dans backend/.env (local Docker ou Aura).
#
# Prerequis:
#   - Fichiers presents: moc_data/Résultats/database_etudiants_300k.csv et ambassadeurs_data_heavy.csv
#   - Backend demarre: cd backend && npm run dev
#
# Usage:
#   ./scripts/import-csv-to-neo4j.sh
#   PORT=4000 ./scripts/import-csv-to-neo4j.sh
#
# Variables optionnelles (surcharge des limites par defaut):
#   STUDENT_LIMIT=50000 AMBASSADOR_LIMIT=10000 BATCH_SIZE=2000 ./scripts/import-csv-to-neo4j.sh

set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-4000}"
STUDENT_LIMIT="${STUDENT_LIMIT:-50000}"
AMBASSADOR_LIMIT="${AMBASSADOR_LIMIT:-10000}"
BATCH_SIZE="${BATCH_SIZE:-10000}"

echo "-> POST http://localhost:${PORT}/api/linkage/import"
echo "   studentLimit=${STUDENT_LIMIT} ambassadorLimit=${AMBASSADOR_LIMIT} batchSize=${BATCH_SIZE}"
curl -sS -X POST "http://localhost:${PORT}/api/linkage/import" \
  -H "Content-Type: application/json" \
  -d "{\"studentLimit\":${STUDENT_LIMIT},\"ambassadorLimit\":${AMBASSADOR_LIMIT},\"batchSize\":${BATCH_SIZE}}" \
  | python3 -m json.tool
