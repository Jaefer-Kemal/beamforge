#!/usr/bin/env bash
set -euo pipefail

echo "==> [BeamForge] Initializing dual-node sandbox environment..."

# Generate shared Erlang cookie
COOKIE_PATH="/run/bf/.erlang.cookie"
if [ ! -f "$COOKIE_PATH" ]; then
    echo "bf_internal_sandbox_cookie" > "$COOKIE_PATH"
    chmod 400 "$COOKIE_PATH"
    cp "$COOKIE_PATH" /home/erlang/.erlang.cookie
    cp "$COOKIE_PATH" /home/grader/.erlang.cookie
    chown erlang:erlang /home/erlang/.erlang.cookie
    chown grader:grader /home/grader/.erlang.cookie
    chmod 400 /home/erlang/.erlang.cookie /home/grader/.erlang.cookie
fi

# Start EPMD daemon in background
epmd -daemon

echo "==> [BeamForge] Starting hidden grader node (grader@127.0.0.1)..."
su-exec grader erl -args_file /etc/beamforge/vm.args.grader -noshell -detached

echo "==> [BeamForge] Sandbox ready for learner session."
exec su-exec erlang "$@"
