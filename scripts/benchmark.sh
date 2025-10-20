#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="http://localhost:5000"
REDIS_CONTAINER="nestjs-auth-clean-arch_dev-redis-1"
EMAIL="admin@nestapp.com"
PASSWORD="123456"

CACHE_STATE=$(grep -E "^CACHE_ENABLED=" .env | cut -d= -f2)
echo "=== Benchmark (CACHE_ENABLED=$CACHE_STATE) ==="

echo "[1/4] Login..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed" >&2
  exit 1
fi

echo "[2/4] FLUSHDB..."
docker exec "$REDIS_CONTAINER" redis-cli FLUSHDB > /dev/null

echo "[3/4] Warm up cache (1 req)..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/users/me" > /dev/null

echo "[4/4] autocannon (15s, 10 connections)..."
mkdir -p scripts/results
OUTPUT="scripts/results/bench-${CACHE_STATE}-$(date +%Y%m%d-%H%M%S).txt"
npx autocannon \
  -c 10 \
  -d 15 \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/users/me" \
  2>&1 | tee "$OUTPUT"

echo ""
echo "Result saved to: $OUTPUT"
