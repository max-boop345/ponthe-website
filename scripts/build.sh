#!/usr/bin/env bash
cd "$(dirname "$0")/.."

docker compose -f docker-compose-prod.yaml build
