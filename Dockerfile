# Multi-stage Dockerfile for BeamForge Go Orchestrator + BEAM VM (Erlang/OTP)
# Stage 1: Build the Go Orchestrator binary
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Copy go module files
COPY services/orchestrator/go.mod services/orchestrator/go.sum* ./
RUN go mod download

# Copy orchestrator source code
COPY services/orchestrator/ ./

# Build statically linked linux executable
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /build/orchestrator ./cmd/server

# Stage 2: Runtime image with native Erlang/OTP on Alpine
FROM alpine:3.19

# Install Erlang, Erlang compiler, and runtime utilities
RUN apk add --no-cache \
    erlang \
    erlang-dev \
    erlang-tools \
    ca-certificates \
    tzdata \
    bash

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/orchestrator /app/bin/orchestrator

# Copy runtimes harness directory
COPY runtimes/erl-harness /app/runtimes/erl-harness

# Compile Erlang harness modules into ebin
RUN cd /app/runtimes/erl-harness && \
    mkdir -p ebin && \
    erlc -o ebin apps/bf_grader/src/*.erl apps/bf_tracer/src/*.erl test/*.erl 2>/dev/null || true

# Set environment variables for Render / EthioDeploy 512MB RAM safety
ENV PORT=8080
ENV PROJECT_ROOT=/app
ENV MAX_CONCURRENT_WORKERS=2
ENV ERL_FLAGS="+S 1:1 +B -noinput"

EXPOSE 8080

CMD ["/app/bin/orchestrator"]

