.PHONY: help dev-ui dev-orchestrator build-sandbox test-harness up down clean

SHELL := /bin/bash

help: ## Show available make targets
	@echo "BeamForge Monorepo Control Commands"
	@echo "==================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-ui: ## Start Next.js Obsidian IDE development server
	cd apps/web-ide && npm run dev

dev-orchestrator: ## Start Go sandbox orchestrator & WebSocket gateway
	cd services/orchestrator && go run cmd/server/main.go

build-sandbox: ## Build the Tier-2 dual-node Erlang/OTP 29 sandbox Docker image
	docker build -t beamforge-sandbox:latest -f runtimes/sandbox-base/Dockerfile runtimes/sandbox-base

test-harness: ## Run OTP grading harness EUnit and PropEr test suites
	@which rebar3 >/dev/null 2>&1 && (cd runtimes/erl-harness && rebar3 eunit) || (mkdir -p runtimes/erl-harness/ebin && erlc -I runtimes/erl-harness/apps -o runtimes/erl-harness/ebin runtimes/erl-harness/apps/*/src/*.erl runtimes/erl-harness/test/*.erl && erl -pa runtimes/erl-harness/ebin -noshell -eval "case eunit:test(bf_harness_eunit, [verbose]) of ok -> init:stop(0); _ -> init:stop(1) end.")

up: ## Spin up local PostgreSQL 16, Redis 7, and Orchestrator containers
	docker compose -f deploy/docker-compose.dev.yml up -d

down: ## Stop local Docker development stack
	docker compose -f deploy/docker-compose.dev.yml down

clean: ## Clean node_modules, build artifacts, and rebar3 _build dirs
	rm -rf apps/web-ide/.next apps/web-ide/node_modules
	rm -rf runtimes/erl-harness/_build
