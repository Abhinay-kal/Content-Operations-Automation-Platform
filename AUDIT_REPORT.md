# Phase 1: Repository Audit Report

## 1. Directory Structure & Orphaned Files
The root directory is currently highly cluttered with temporary files, browser profiles, and legacy test scripts.

**Browser Data Sprawl:**
There are multiple, redundant directories storing Chromium profile data:
* `browser-profile/`
* `chrome-data/`
* `chrome-profile/`
* `fresh-data/`
* `temp-chrome-data/`

**Temporary Debugging Artifacts:**
Many root-level files appear to be temporary dumps, screenshots, or logs from local testing that should not be tracked in version control (or should be moved to a `tmp/` or `logs/` directory):
* `claude_debug.log`, `claude_dump.html`, `claude_response.html`, `claude_response.txt`
* `latest_chat.png`, `local_output.log`, `output.log`, `runtime.log`
* `temp_labels.json`, `temp_wp_post.json`, `temp_wp_posts.json`

**Legacy & Test Scripts:**
The root directory contains a massive amount of experimental and test scripts that violate the separation of concerns and clutter the repository:
* `test2.js`, `test3.js`, `test4.js`, `test5.js`
* `test_claude.js`, `test_close.js`, `test_idle.js`, `test_nocdc.js`, `test_nocdc2.js`
* `test_stealth.js`, `test_stealth_mouse.js`, `test_update.js`
* `tmp_script.js`, `tmp_tree_script.js`, `trace_claude.py`
* `site.json.save`, `seo-opt-agent.zip`

## 2. Architecture & Structural Improvements
Currently, most application logic resides inside `src/`. However, to meet the target structural architecture, we need to enforce module boundaries:
* **Missing Directories:** `api/`, `repositories/`, `workers/`, `utils/`, `middleware/`, `config/` need to be established (some exist, but logic needs to be migrated).
* **Mixed Responsibilities:** `src/services/` contains managers and workers that should be properly segregated into `workers/` and `services/`.
* **Data Storage:** SQLite files (`jobs.sqlite`, `n8n.sqlite`, `test_audit.sqlite`) are sitting at the root. They should be moved to a dedicated `data/` or `db/` directory, and added to `.gitignore`.

## 3. Dependency Check
* `package.json` relies on `express`, `playwright`, `playwright-extra`, `puppeteer-extra-plugin-stealth`, and `better-sqlite3`.
* A full unused dependency check is currently running via `depcheck`.

## 4. Security & Configuration
* `.env` is present at the root, which is correct, but we need to ensure it's in `.gitignore` along with the `.sqlite` databases and `chrome-data/` folders to prevent data leaks.

---
**Recommendation:**
Proceed to **Phase 2 (Cleanup)** to aggressively delete the orphaned `test*.js` scripts, remove temporary `.log`/`.html`/`.json` artifacts, and clean up redundant browser profile directories.
