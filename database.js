require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || '/tmp/bot_memory.db';

const db = new sqlite3.Database(DB_PATH);

db.run(`CREATE TABLE IF NOT EXISTS learned_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT UNIQUE,
  response TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS unresolved_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved INTEGER DEFAULT 0,
  admin_response TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS user_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  message TEXT,
  response TEXT,
  category TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

function saveInteraction(phone, message, response, category) {
  return new Promise((resolve, reject) => {
    const tempDb = new sqlite3.Database(DB_PATH);
    tempDb.run('INSERT INTO user_interactions (phone, message, response, category) VALUES (?, ?, ?, ?)',
      [phone, message, response, category],
      function(err) {
        tempDb.close();
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function saveLearned_Response(keyword, response, category) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO learned_responses (keyword, response, category) VALUES (?, ?, ?)',
      [keyword, response, category],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getLearned_Response(keyword) {
  return new Promise((resolve, reject) => {
    db.get('SELECT response, category FROM learned_responses WHERE keyword = ?', [keyword], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function searchResponses(keyword) {
  return new Promise((resolve, reject) => {
    db.all('SELECT keyword, response, category FROM learned_responses WHERE keyword LIKE ?', [`%${keyword}%`], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function saveUnresolvedQuery(query, fromPhone, category) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO unresolved_queries (query, from_phone, category) VALUES (?, ?, ?)',
      [query, fromPhone, category],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getUnresolvedQueries() {
  return new Promise((resolve, reject) => {
    db.all('SELECT keyword, response, category FROM learned_responses ORDER BY created_at DESC',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function resolveQuery(queryId, adminResponse) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE unresolved_queries SET resolved = 1, admin_response = ? WHERE id = ?',
      [adminResponse, queryId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getAllResponses() {
  return new Promise((resolve, reject) => {
    db.all('SELECT keyword, response, category FROM learned_responses ORDER BY created_at DESC',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

module.exports = { db, saveLearned_Response, getLearned_Response, searchResponses, saveUnresolvedQuery, getUnresolvedQueries, resolveQuery, getAllResponses, saveInteraction };
