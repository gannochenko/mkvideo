.PHONY: install build link unlink lint lint-fix format format-check clean test test-ui demo demo-all demo-prod demo-all-prod help

# Install dependencies
install:
	npm install

# Build the project
build:
	npm run build

# Link the package globally (makes 'staticvid' command available)
link:
	npm link

# Unlink the package globally (removes 'staticvid' command)
unlink:
	npm unlink -g

# Run linter
lint:
	npm run lint

# Run linter with auto-fix
lint-fix:
	npm run lint:fix

# Format code
format:
	npm run format

# Check code formatting
format-check:
	npm run format:check

# Run tests
test:
	npm run test:run

# Run tests with UI
test-ui:
	npm run test:ui

# Generate demo video (youtube output) with fast preset for development
demo:
	node dist/cli.js generate -p ../../examples/demo -o youtube -d

# Generate demo video with production quality (medium preset)
demo-prod:
	node dist/cli.js generate -p ../../examples/demo -o youtube

# Generate all demo outputs with fast preset
demo-all:
	node dist/cli.js generate -p ../../examples/demo -d

# Generate all demo outputs with production quality
demo-all-prod:
	node dist/cli.js generate -p ../../examples/demo

# Clean build artifacts and dependencies
clean:
	rm -rf node_modules dist *.tsbuildinfo
	rm -f package-lock.json

# Clean cache in demo project
clean-cache:
	rm -rf ../../examples/demo/.cache

# Full build
all: install build

# Show help
help:
	@echo "Available targets:"
	@echo "  make install         - Install dependencies"
	@echo "  make build           - Build the project"
	@echo "  make link            - Install CLI globally (enables 'staticvid' command)"
	@echo "  make unlink          - Remove global CLI installation"
	@echo "  make lint            - Run linter"
	@echo "  make lint-fix        - Run linter with auto-fix"
	@echo "  make format          - Format code"
	@echo "  make format-check    - Check code formatting"
	@echo "  make test            - Run tests"
	@echo "  make test-ui         - Run tests with UI"
	@echo "  make demo            - Generate demo video (fast, for development)"
	@echo "  make demo-prod       - Generate demo video (production quality)"
	@echo "  make demo-all        - Generate all demo outputs (fast)"
	@echo "  make demo-all-prod   - Generate all demo outputs (production)"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make clean-cache     - Clean demo project cache"
	@echo "  make all             - Install and build"
	@echo ""
	@echo "Quick Start:"
	@echo "  make all && make link    - Build and install globally"
	@echo "  staticvid generate -p . -o youtube -d"
	@echo ""
	@echo "CLI Usage:"
	@echo "  staticvid generate -p <project-path> -o <output>"
	@echo "  staticvid generate -p <project-path> -o <output> -d  # fast preset"
	@echo "  staticvid --help"
