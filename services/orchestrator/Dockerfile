FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/orchestrator ./cmd/server

FROM alpine:3.19
RUN apk add --no-cache ca-certificates docker-cli
WORKDIR /app
COPY --from=builder /app/orchestrator /app/orchestrator

EXPOSE 8080
ENTRYPOINT ["/app/orchestrator"]
