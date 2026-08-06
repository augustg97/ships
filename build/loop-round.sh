#!/bin/bash
# ── ONE AUTOMATED IMPROVEMENT ROUND ──────────────────────────────────────────────────────
# Driven by launchd every 10 minutes. See build/com.august.ships-loop.plist.
#
# ⚠ WHY THIS EXISTS RATHER THAN A SCHEDULED PROMPT. Both in-session mechanisms were tried and
# neither fires here: ScheduleWakeup was set for 18:05 and never ran, and a CronCreate job at
# */10 missed eighteen consecutive firings over three hours. Both are session-only and only fire
# while the REPL is idle. A CLOUD schedule cannot help either — this work needs the local repo,
# the local server on :8149 and the Playwright frame harness, none of which exist there. So the
# durable path is a local agent, which is this.
#
# ⚠ AND A ROUND TAKES LONGER THAN THE INTERVAL, OFTEN. A full frame-ratchet pass alone is several
# minutes. Without a lock, launchd would start a second round on top of the first and they would
# fight over the working tree. The lock is a directory because mkdir is atomic; a stale one older
# than 90 minutes is cleared, because a killed round must not stop the loop forever.

set -uo pipefail
cd "$HOME/Ships" || exit 1

LOCK="$HOME/Ships/build/.loop.lock"
LOG="$HOME/Ships/build/loop.log"
PROMPT="$HOME/Ships/build/loop-prompt.md"

exec >>"$LOG" 2>&1
echo "───────────────────────────────────────────────────────────────────────────"
echo "$(date '+%Y-%m-%d %H:%M:%S')  round starting"

if [ -d "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +90 2>/dev/null)" ]; then
    echo "  stale lock older than 90 min — clearing"
    rm -rf "$LOCK"
  else
    echo "  previous round still running — skipping this firing"
    exit 0
  fi
fi
mkdir "$LOCK" 2>/dev/null || { echo "  lost the lock race — skipping"; exit 0; }
trap 'rm -rf "$LOCK"' EXIT

# the local server the frame harness renders against
if ! lsof -ti:8149 >/dev/null 2>&1; then
  echo "  starting the :8149 server"
  nohup "$(command -v python3)" -c "
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os; os.chdir('$HOME/Ships/web')
ThreadingHTTPServer(('127.0.0.1',8149), SimpleHTTPRequestHandler).serve_forever()
" >/dev/null 2>&1 &
  sleep 2
fi

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# ⚠ AND CHECK THE CREDENTIALS BEFORE DOING ANYTHING ELSE. The first attempt at this agent died
# on "OAuth session expired and could not be refreshed": the CLI's token lives with the desktop
# app session and a background process cannot refresh it. A loop that fails silently every ten
# minutes is worse than no loop, so the failure says what to do about it.
if ! claude -p 'reply with the single word: ok' --max-turns 1 >/dev/null 2>&1; then
  echo "  NOT AUTHENTICATED — run 'claude' once in a terminal and sign in, then this loop starts"
  echo "  by itself at the next firing. Nothing else is needed."
  exit 0
fi

# ⚠ macOS HAS NO `timeout`. No coreutils, no gtimeout — the first version of this line simply
# did not run, which the smoke test caught. A watchdog in the background does the same job with
# nothing installed: it waits, then kills the round if it is still going.
claude -p "$(cat "$PROMPT")" --permission-mode bypassPermissions --max-turns 300 &
ROUND=$!
# ⚠ 50 MINUTES KILLED TWO FULL ROUNDS mid-verification and a third finished on the wire —
# a vessel rebuild plus two ratchet passes is ~55-70 min of real work. 80 min fits under the
# 90-minute stale-lock clear, which is the only ceiling that matters here.
( sleep 4800; kill -0 "$ROUND" 2>/dev/null && { echo "  round overran 80 min — killing"; kill "$ROUND"; } ) &
WATCH=$!
wait "$ROUND" || echo "  round exited non-zero — the next firing picks up from HANDOFF.md"
kill "$WATCH" 2>/dev/null

echo "$(date '+%Y-%m-%d %H:%M:%S')  round finished; HEAD is $(git -C "$HOME/Ships" log --oneline -1)"
