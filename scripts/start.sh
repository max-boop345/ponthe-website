cd "$(dirname "$0")/.." 

#!/usr/bin/env bash
docker compose -f docker-compose-prod.yaml up -d
