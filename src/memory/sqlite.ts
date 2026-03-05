import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite Database
const dbPath = path.join(dbDir, 'memory.db');
let db: any;

function initDb() {
  db = new Database(dbPath);

  // Enable WAL mode for parallel reads and non-blocking writes
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

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

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_timestamp_type ON metrics(timestamp, type);
  `);

  // Safely add new columns for tool calls if they don't exist
  try { db.exec('ALTER TABLE messages ADD COLUMN tool_calls TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE messages ADD COLUMN tool_call_id TEXT;'); } catch (e) {}
}

try {
  initDb();
} catch (error: any) {
  if (error.code === 'SQLITE_CORRUPT' || error.message.includes('malformed')) {
    console.warn('Database is corrupted. Deleting and recreating...');
    if (db) {
      try { db.close(); } catch (e) {}
    }
    fs.unlinkSync(dbPath);
    initDb();
  } else {
    throw error;
  }
}

export function addMessage(
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string | null,
  tool_calls?: string,
  tool_call_id?: string
) {
  const stmt = db.prepare('INSERT INTO messages (role, content, tool_calls, tool_call_id) VALUES (?, ?, ?, ?)');
  stmt.run(role, content || '', tool_calls || null, tool_call_id || null);
}

export function getRecentMessages(limit: number = 20): any[] {
  const stmt = db.prepare('SELECT role, content, tool_calls, tool_call_id FROM messages ORDER BY id DESC LIMIT ?');
  const rows = stmt.all(limit) as any[];
  return rows.reverse().map(row => {
    const msg: any = { role: row.role, content: row.content };
    if (row.tool_calls) msg.tool_calls = JSON.parse(row.tool_calls);
    if (row.tool_call_id) msg.tool_call_id = row.tool_call_id;
    return msg;
  });
}

export function getMessageRows(limit: number = 50): any[] {
  const stmt = db.prepare('SELECT id, role, content, timestamp FROM messages ORDER BY id DESC LIMIT ?');
  const rows = stmt.all(limit) as any[];
  return rows.reverse();
}

export function searchMessages(query: string, limit: number = 5): any[] {
  const stmt = db.prepare(`
    SELECT m.role, m.content, m.timestamp
    FROM messages_fts f
    JOIN messages m ON f.rowid = m.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);
  return stmt.all(query, limit);
}

export function logRequest(type: string = 'openrouter') {
  try {
    const stmt = db.prepare('INSERT INTO metrics (type) VALUES (?)');
    stmt.run(type);
  } catch (e) {
    console.error('Failed to log request metric:', e);
  }
}

export function getDailyRequestCount(): number {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM metrics 
      WHERE date(timestamp) = date('now', 'localtime')
    `);
    const result = stmt.get() as { count: number };
    return result ? result.count : 0;
  } catch (e) {
    console.error('Failed to get daily request count:', e);
    return 0;
  }
}

export function clearMessages() {
  db.exec('DELETE FROM messages');
  // Rebuild FTS index after clearing
  db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
}

export function getMessageCount(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
  return row?.count || 0;
}
