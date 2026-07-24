# Project Knowledge Base

## Project Overview
**Name**: `claude-worker-foundation` (Content-Operations-Automation)
**Description**: A reliable, scalable Playwright + Express worker designed for automating the Claude Web UI. This project provides a robust foundation for executing serialized prompts, managing browser sessions, and handling persistent jobs with sophisticated error recovery.

## Technology Stack
- **Language**: JavaScript (Node.js)
- **Web Framework**: Express
- **Browser Automation**: Playwright, Puppeteer (with `puppeteer-extra-plugin-stealth` for evasion)
- **Database**: SQLite (via `better-sqlite3`)
- **Testing**: Jest, `@playwright/test`
- **Environment**: dotenv

## Architecture Overview
The application is a Node.js worker/server that exposes an API (Express) to receive automation jobs, stores them persistently (SQLite), and processes them using a stealthy browser automation engine (Playwright/Puppeteer) to interact with the Claude Web UI. 

## Folder Structure (src/)
- **api/**: API controllers/endpoints
- **bootstrap/**: Application initialization and startup routines
- **browser/**: Browser automation logic and context management
- **config/**: Configuration and environment variables
- **db/**: Database connection and schema definitions
- **errors/**: Custom error handling and classes
- **middleware/**: Express middleware (auth, logging, etc.)
- **models/**: Data models
- **monitor/**: System monitoring and health checks
- **repositories/**: Database access layer for models
- **routes/**: API route definitions
- **services/**: Core business logic
- **session/**: Claude session management
- **utils/**: Utility functions and helpers
- **workers/**: Background job processing logic

## Important Commands
- `npm start`: Starts the main server (`node src/index.js`)
- `npm run legacy-start`: Starts the legacy server (`node server.js`)
- `npm test`: Runs the Jest test suite

## Interview Topics Covered (In Progress)
- Node.js architecture and event loop
- Browser automation evasion techniques (stealth plugins)
- SQLite persistent queues vs Redis/Memory
- Handling browser sessions and cookies securely
- Building reliable scraper/worker architecture

*This file will be updated continuously as we implement new features and architectural changes.*
