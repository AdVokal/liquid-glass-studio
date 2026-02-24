#!/bin/bash
PIDFILE="/tmp/dashboard-studio.pids"
if [ -f "$PIDFILE" ]; then
  kill $(cat "$PIDFILE") 2>/dev/null && rm "$PIDFILE"
else
  lsof -ti:5173,3000,5174 | xargs kill 2>/dev/null
fi
echo "Stopped."
