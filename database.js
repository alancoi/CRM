const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || '/tmp/bot_memory.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Error opening database:', err);
  else console.log('✓ Base de datos conectada:', DB_PATH);
});

// Crear tabla de respuestas aprendidas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS learned_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT UNIQUE NOT NULL,
      response TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confidence INTEGER DEFAULT 100
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS unresolved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      from_phone TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved INTEGER DEFAULT 0,
      admin_response TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      message TEXT,
      response TEXT,
      category TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Funciones para trabajar con la BD

function saveLearnedResponse(keyword, response, category = 'general') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO learned_responses (keyword, response, category, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [keyword.toLowerCase(), response, category],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getLearnedResponse(keyword) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT response FROM learned_responses WHERE keyword = ? LIMIT 1`,
      [keyword.toLowerCase()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.response : null);
      }
    );
  });
}

function searchResponses(searchTerm) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT keyword, response, category FROM learned_responses
       WHERE keyword LIKE ? OR response LIKE ? LIMIT 10`,
      [`%${searchTerm}%`, `%${searchTerm}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function saveUnresolvedQuery(query, fromPhone, category) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO unresolved_queries (query, from_phone, category) VALUES (?, ?, ?)`,
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
    db.all(
      `SELECT * FROM unresolved_queries WHERE resolved = 0 ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function resolveQuery(queryId, adminResponse) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE unresolved_queries SET resolved = 1, admin_response = ? WHERE id = ?`,
      [adminResponse, queryId],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
}

function saveInteraction(phone, message, response, category) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_interactions (phone, message, response, category) VALUES (?, ?, ?, ?)`,
      [phone, message, response, category],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getAllResponses() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT keyword, response, category FROM learned_responses ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

module.exports = {
  db,
  saveLearnedResponse,
  getLearnedResponse,
  searchResponses,
  saveUnresolvedQuery,
  getUnresolvedQueries,
  resolveQuery,
  saveInteraction,
  getAllResponses
};
