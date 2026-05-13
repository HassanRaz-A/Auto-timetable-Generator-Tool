#!/usr/bin/env bash
set -e
cd /home/claude/ttms/backend
# Kill anything on the port
fuser -k 8765/tcp 2>/dev/null || true
sleep 1
# Start server in background
uvicorn app.main:app --host 127.0.0.1 --port 8765 > /tmp/uv.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT

# Wait for server to be ready
for i in {1..20}; do
  if curl -s http://127.0.0.1:8765/api/health > /dev/null 2>&1; then
    echo "✓ Server up after ${i}s"
    break
  fi
  sleep 1
done

# Login
echo
echo "=== 1. Login as admin ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:8765/api/auth/login \
  --data-urlencode "username=admin@ttms.edu" \
  --data-urlencode "password=admin123")
echo "$LOGIN" | python -c "import sys,json;d=json.load(sys.stdin);print('role=',d['role'],'name=',d['full_name'])"
TOKEN=$(echo "$LOGIN" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# List entities
echo
echo "=== 2. Master data counts ==="
for endpoint in departments teachers subjects classrooms sections allotments; do
  COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8765/api/$endpoint | python -c "import sys,json;print(len(json.load(sys.stdin)))")
  printf "  %-12s : %s\n" "$endpoint" "$COUNT"
done

# Generate timetable
echo
echo "=== 3. Generate timetable ==="
GEN=$(curl -s -X POST http://127.0.0.1:8765/api/timetable/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$GEN" | python -c "
import sys, json
r = json.load(sys.stdin)
print('  Status      :', r['status'])
print('  Message     :', r['message'])
print('  Solver time :', round(r['solver_time_seconds'], 3), 's')
print('  Entries     :', len(r['entries']))
print('  Diagnostics :', r.get('diagnostics'))
"

# View one teacher's schedule
echo
echo "=== 4. Schedule for one teacher (ayesha.khan@ttms.edu) ==="
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:8765/api/timetable?teacher_id=1" | python -c "
import sys, json
DAYS=['Mon','Tue','Wed','Thu','Fri']
for e in json.load(sys.stdin):
    print(f\"  {DAYS[e['day']]} slot {e['start_slot']}({e['length']}) | {e['subject_code']} | sec {e['section_name']} | {e['room_no']}\")
"

# View by section
echo
echo "=== 5. Schedule for section BS-CS-3A ==="
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:8765/api/timetable?section_id=1" | python -c "
import sys, json
DAYS=['Mon','Tue','Wed','Thu','Fri']
for e in json.load(sys.stdin):
    print(f\"  {DAYS[e['day']]} slot {e['start_slot']}({e['length']}) | {e['subject_code']} | {e['teacher_name'][:25]} | {e['room_no']}\")
"

echo
echo "=== Done ==="
