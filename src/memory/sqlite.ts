import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite Database
const db = new Database(path.join(dbDir, 'memory.db'));

// Initialize tables and FTS5 virtual table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content='messages',
    content_rowid='id'
  );

  -- Triggers to keep FTS updated
  CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
  END;
  CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
  END;
  CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
  END;
`);

export function addMessage(role: 'user' | 'assistant' | 'system' | 'tool', content: string) {
  const stmt = db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)');
  stmt.run(role, content);
}

export function getRecentMessages(limit: number = 20): { role: string, content: string }[] {
  const stmt = db.prepare('SELECT role, content FROM messages ORDER BY id DESC LIMIT ?');
  const rows = stmt.all(limit) as { role: string, content: string }[];
  return rows.reverse(); // Return in chronological order
}

export function searchMessages(query: string, limit: number = 5): { role: string, content: string, timestamp: string }[] {
  const stmt = db.prepare(`
    SELECT m.role, m.content, m.timestamp
    FROM messages_fts f
    JOIN messages m ON f.rowid = m.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);
  return stmt.all(query, limit) as { role: string, content: string, timestamp: string }[];
}
