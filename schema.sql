CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 token_hash TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 polish TEXT NOT NULL,
 bag_size INTEGER NOT NULL CHECK(bag_size IN (10,25)),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 4),
 destination TEXT NOT NULL,
 location TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Awaiting confirmation',
 payment TEXT NOT NULL DEFAULT 'Pending',
 total_paise INTEGER,
 courier TEXT NOT NULL DEFAULT '',
 tracking_number TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
