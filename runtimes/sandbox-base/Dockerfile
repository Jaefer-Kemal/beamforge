# Multi-stage Tier-2 Dual-Node Erlang/OTP Sandbox
FROM erlang:27-alpine AS builder

WORKDIR /build
COPY ../erl-harness ./erl-harness
WORKDIR /build/erl-harness
# Pre-compile harness apps into BEAM bytecode
RUN mkdir -p ebin && erlc -I apps -o ebin apps/*/src/*.erl test/*.erl

FROM erlang:27-alpine

RUN apk add --no-cache \
    bash \
    git \
    make \
    curl \
    su-exec

# Create non-root users: learner (UID 1000) and grader (UID 2000)
RUN adduser -D -u 1000 -h /home/erlang erlang \
    && adduser -D -u 2000 -h /home/grader grader

# Create workspace and harness directories
RUN mkdir -p /workspace /opt/bf_suite /run/bf /opt/erl-harness/ebin \
    && chown -R erlang:erlang /workspace \
    && chown -R grader:grader /opt/bf_suite /opt/erl-harness \
    && chmod 700 /run/bf

# Copy pre-compiled harness to grader node space
COPY --from=builder /build/erl-harness/ebin/ /opt/erl-harness/ebin/
COPY vm.args.user /etc/beamforge/vm.args.user
COPY vm.args.grader /etc/beamforge/vm.args.grader
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /workspace
EXPOSE 8080 4369

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["erl", "-args_file", "/etc/beamforge/vm.args.user"]
