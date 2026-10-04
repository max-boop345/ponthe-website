#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== 🔹 Rebuild du frontend React dans webinstaller ==="
docker compose -f docker-compose-prod.yaml run --rm webinstaller

echo "=== 🔹 Redémarrage du back pour prendre en compte les nouveaux bundles ==="
docker compose -f docker-compose-prod.yaml up -d back

echo "✅ Frontend mis à jour et back redémarré avec les nouveaux bundles."
