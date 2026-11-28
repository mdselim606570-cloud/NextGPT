.PHONY: help install bootstrap dev build start lint test test-ci mask app-dev app-build prompts proxy-dev clean

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: bootstrap ## Install dependencies and bootstrap the project

.PHONY: bootstrap
bootstrap: ## Bootstrap NextGPT for local development (deps, env, git hooks)
	bash scripts/bootstrap/bootstrap

.PHONY: dev
dev: ## Start the Next.js dev server (with mask watcher)
	pnpm dev

.PHONY: build
build: ## Build the Next.js app for production
	pnpm build

.PHONY: start
start: ## Start the Next.js production server
	pnpm start

.PHONY: lint
lint: ## Run ESLint
	pnpm lint

.PHONY: test
test: ## Run Jest tests in watch mode
	pnpm test

.PHONY: test-ci
test-ci: ## Run Jest tests in CI mode
	pnpm test:ci

.PHONY: mask
mask: ## Build i18n masks
	pnpm mask

.PHONY: app-dev
app-dev: ## Start Tauri dev mode (desktop app)
	pnpm app:dev

.PHONY: app-build
app-build: ## Build the Tauri desktop app (deb + AppImage)
	pnpm app:build

.PHONY: prompts
prompts: ## Fetch prompt translations
	pnpm prompts

.PHONY: proxy-dev
proxy-dev: ## Start dev behind proxy (init-proxy + proxychains)
	pnpm proxy-dev

.PHONY: clean
clean: ## Remove build artifacts and node_modules
	rm -rf .next out node_modules src-tauri/target
