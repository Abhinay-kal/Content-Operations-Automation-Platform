CREATE TABLE sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    wp_url TEXT,
                    wp_username TEXT,
                    wp_application_password TEXT,
                    active INTEGER DEFAULT 1,
                    created_at DATETIME NOT NULL
                );
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE site_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    version INTEGER DEFAULT 1,
                    audit_prompt TEXT,
                    rewrite_prompt TEXT,
                    country TEXT,
                    language TEXT,
                    target_location TEXT,
                    updated_at DATETIME NOT NULL,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE content_projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    wp_post_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    UNIQUE(site_id, wp_post_id),
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE content_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    project_id INTEGER NOT NULL,
                    version_number INTEGER NOT NULL,
                    content_type TEXT NOT NULL,
                    content TEXT,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE CASCADE
                );
CREATE TABLE audits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    project_id INTEGER NOT NULL,
                    result TEXT,
                    score INTEGER,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE CASCADE
                );
CREATE TABLE rewrites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    project_id INTEGER NOT NULL,
                    audit_id INTEGER,
                    optimized_content TEXT,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE SET NULL
                );
CREATE TABLE job_chats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    chat_type TEXT,
                    claude_chat_id TEXT,
                    chat_url TEXT,
                    status TEXT NOT NULL,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
                );
CREATE TABLE execution_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    project_id INTEGER,
                    execution_type TEXT NOT NULL,
                    prompt_used TEXT,
                    response_received TEXT,
                    runtime_ms INTEGER,
                    status TEXT NOT NULL,
                    error_category TEXT,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE SET NULL
                );
CREATE INDEX idx_execution_logs_job_id ON execution_logs(job_id);
CREATE INDEX idx_execution_logs_project_id ON execution_logs(project_id);
CREATE TABLE project_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    message TEXT,
                    metadata TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE CASCADE
                );
CREATE INDEX idx_project_events_project_id ON project_events(project_id);
CREATE TABLE authors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    wp_author_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    UNIQUE(site_id, wp_author_id),
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    wp_category_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    UNIQUE(site_id, wp_category_id),
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    wp_tag_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    UNIQUE(site_id, wp_tag_id),
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    wp_post_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    status TEXT NOT NULL,
                    modified DATETIME NOT NULL,
                    content TEXT,
                    excerpt TEXT,
                    author_id INTEGER,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    UNIQUE(site_id, wp_post_id),
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE SET NULL
                );
CREATE INDEX idx_posts_site_id ON posts(site_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE TABLE sync_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    started_at DATETIME NOT NULL,
                    finished_at DATETIME,
                    status TEXT NOT NULL,
                    items_processed INTEGER DEFAULT 0,
                    items_created INTEGER DEFAULT 0,
                    items_updated INTEGER DEFAULT 0,
                    errors TEXT,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
                );
CREATE TABLE published_drafts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    project_id INTEGER NOT NULL,
                    rewrite_id INTEGER NOT NULL,
                    wp_post_id INTEGER NOT NULL,
                    wp_draft_id INTEGER NOT NULL,
                    publish_mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                    FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(rewrite_id) REFERENCES rewrites(id) ON DELETE CASCADE
                );
CREATE INDEX idx_published_drafts_project_id ON published_drafts(project_id);
CREATE TABLE jobs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        site_id INTEGER NOT NULL,
                        project_id INTEGER,
                        type TEXT NOT NULL DEFAULT 'REWRITE',
                        status TEXT NOT NULL,
                        priority TEXT NOT NULL DEFAULT 'NORMAL',
                        prompt TEXT,
                        audit_prompt_snapshot TEXT,
                        rewrite_prompt_snapshot TEXT,
                        metadata TEXT,
                        error TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
                        FOREIGN KEY(project_id) REFERENCES content_projects(id) ON DELETE SET NULL
                    );
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_site_id ON jobs(site_id);
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE TABLE worker_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    state TEXT NOT NULL,
                    reason TEXT,
                    last_seen DATETIME NOT NULL,
                    recovery_attempts INTEGER DEFAULT 0,
                    updated_at DATETIME NOT NULL
                );
CREATE TABLE incidents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT,
                    created_at DATETIME NOT NULL,
                    resolved_at DATETIME
                );
CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);

CREATE TABLE plugin_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    plugin_uuid TEXT NOT NULL,
    installation_uuid TEXT NOT NULL,
    registration_token TEXT NOT NULL,
    plugin_version TEXT,
    protocol_version TEXT,
    backend_version TEXT,
    capabilities TEXT,
    connection_status TEXT,
    registration_status TEXT,
    presence_status TEXT,
    last_seen DATETIME,
    last_heartbeat DATETIME,
    last_ip TEXT,
    last_user_agent TEXT,
    metadata TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE event_ingestion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT,
    received_at DATETIME NOT NULL,
    processed INTEGER DEFAULT 0,
    processed_at DATETIME,
    error TEXT
);
