# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript application that automatically updates Cloudflare DNS records with the current public IP address. It's designed as a Dynamic DNS (DDNS) service for servers or devices with dynamic IP addresses.

## Commands

### Development
```bash
# Install dependencies
yarn install

# Run in development mode with hot reloading
yarn dev

# Build the TypeScript project
yarn build

# Run the production build
yarn start
```

### Docker
```bash
# Build Docker image
docker build -t ddns-updater .

# Run with Docker Compose (uses .env file)
docker-compose up -d

# Rebuild and run
docker-compose up -d --build
```

### Linting and Type Checking
Currently, no linting or type checking commands are configured. TypeScript compilation (`yarn build`) will catch type errors.

### Testing
No test framework is currently configured in this project.

## Code Architecture

### Project Structure
```
src/
├── index.ts              # Main application entry point - handles polling and orchestrates updates
├── services/
│   └── cloudflare.ts     # Cloudflare API service - encapsulates all API interactions with caching
├── types/
│   └── index.ts          # TypeScript interfaces for Cloudflare API responses
└── utils/
    ├── constants.ts      # Configuration constants and default values
    └── ip.ts            # IP detection and DNS name validation utilities
```

### Key Architectural Patterns

1. **Service Layer**: All Cloudflare API interactions are encapsulated in `src/services/cloudflare.ts` which implements:
   - ID caching to reduce API calls
   - Rate limiting (1000 requests per 5-minute window)
   - Retry logic with exponential backoff

2. **Main Application Flow** (`src/index.ts`):
   - Supports multiple DNS records via comma-separated `CF_RECORD_NAMES`
   - Automatically detects zone names from record names
   - Updates records in parallel for efficiency
   - Continues running on errors for resilience

3. **Configuration**: Environment variables with dotenv support. Can use either names or IDs for zones/records (IDs are faster).

### Important Implementation Details

- **Multiple Records**: The application supports updating multiple DNS records simultaneously by providing comma-separated values in `CF_RECORD_NAMES`.
- **Performance**: When using names instead of IDs, the application will log warnings with the discovered IDs for better performance in future runs.
- **Error Handling**: The application continues running even if individual updates fail, ensuring maximum uptime.
- **IP Detection**: Uses `http://checkip.dyndns.org/` for external IP detection with regex parsing.

## Development Guidelines

- **TypeScript**: Strict mode is enabled. All code must be fully typed.
- **Module System**: ES modules with Node.js resolution.
- **Node Version**: Requires Node.js ≥18.0.0.
- **Dependencies**: Use yarn for package management (yarn.lock is committed).
- **Docker**: Multi-stage build optimizes for production image size.

## License

This project is licensed under AGPL-3.0. Any modifications, especially when deployed as a service, must be shared under the same license.