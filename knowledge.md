# Engineering Knowledge Base

This document serves as a living record of the engineering concepts, patterns, and technologies learned and applied in this repository. 

## 🧠 Core Engineering Concepts Applied

### 1. Browser Automation & Evasion
* **Concept**: Automating web interactions while avoiding bot detection.
* **Applied Through**: `puppeteer-extra-plugin-stealth` and Playwright contexts.
* **Learning Value**: Understanding how modern web applications detect automated traffic (e.g., navigator properties, WebGL fingerprinting, headless Chrome indicators) and how to mitigate them.

### 2. Persistent Job Queues
* **Concept**: Storing tasks reliably so they survive server restarts or crashes.
* **Applied Through**: SQLite (`better-sqlite3`) functioning as a local persistence layer for jobs.
* **Learning Value**: Trade-offs between memory queues (fast, volatile) vs. persistent database queues (slower, reliable).

### 3. Concurrency & Worker Architecture
* **Concept**: Managing multiple asynchronous tasks concurrently without blocking the main thread.
* **Applied Through**: Node.js event loop, asynchronous job runners.
* **Learning Value**: Handling race conditions, managing connection pools, and ensuring the application remains responsive under load.

### 4. Resilient Error Recovery
* **Concept**: Designing systems that expect failure and recover gracefully.
* **Applied Through**: Express error boundaries, retry logic for failed Playwright actions, and transaction rollbacks.
* **Learning Value**: Building robust scrapers that can handle unexpected DOM changes, network timeouts, or Claude UI rate limits.

### 5. API Design & Routing
* **Concept**: Structuring modular, maintainable web services.
* **Applied Through**: Express routing structure (`src/routes`, `src/api`).
* **Learning Value**: Separation of concerns (Controllers vs. Services vs. Repositories).

---

## 🛠️ Technology & Tools Mastery

* **Node.js (Event-driven I/O)**
* **Express.js (Middleware pipelines)**
* **Playwright & Puppeteer (Headless browsing)**
* **SQLite (File-based relational databases)**
* **Jest (Unit/Integration testing)**

---

## 📚 Interview Topics Tracked
*This section will grow as we tackle new features.*

1. **"How would you design a scalable web scraper that avoids bot detection?"**
2. **"Explain the difference between a persistent queue and an in-memory queue."**
3. **"How does the Node.js event loop handle long-running background tasks?"**

---
*Note: As we implement new features, algorithms (e.g. recursion, tree-traversal), or patterns, we will log them here to build a comprehensive map of your engineering growth.*
