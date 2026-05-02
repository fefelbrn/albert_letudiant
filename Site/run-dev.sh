#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/V1"

if [[ ! -f "$BACKEND_DIR/package.json" ]]; then
  echo "Erreur: backend/package.json introuvable."
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Erreur: V1/package.json introuvable."
  exit 1
fi

echo "Demarrage backend (http://localhost:4000)..."
(
  cd "$BACKEND_DIR"
  npm run dev
) &
BACK_PID=$!

echo "Demarrage frontend (http://localhost:5173)..."
(
  cd "$FRONTEND_DIR"
  npm run dev
) &
FRONT_PID=$!

cleanup() {
  echo
  echo "Arret des serveurs..."
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
  wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Serveurs lances. Ctrl + C pour tout arreter."
wait "$BACK_PID" "$FRONT_PID"
