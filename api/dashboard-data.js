require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || '/tmp/bot_memory.db';

module.exports = async (req, res) => {
  const db = new sqlite3.Database(DB_PATH);

  try {
    db.all(
      `SELECT phone, message, response, timestamp FROM user_interactions ORDER BY timestamp DESC`,
      (err, rows) => {
        if (err) {
          console.error('Error:', err);
          return res.status(500).json({ error: err.message });
        }

        const chatsMap = new Map();

        if (rows && rows.length > 0) {
          rows.forEach(row => {
            const phone = row.phone || 'Usuario Desconocido';

            if (!chatsMap.has(phone)) {
              const initials = phone.substring(0, 2).toUpperCase();
              chatsMap.set(phone, {
                id: chatsMap.size + 1,
                name: `Usuario ${phone.substring(phone.length - 4)}`,
                phone: phone,
                avatar: initials,
                lastMessage: row.message || row.response || '',
                time: new Date(row.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                messages: []
              });
            }

            const chat = chatsMap.get(phone);
            if (row.message) {
              chat.messages.push({ type: 'sent', text: row.message });
            }
            if (row.response) {
              chat.messages.push({ type: 'received', text: row.response });
            }
          });
        }

        const chats = Array.from(chatsMap.values());

        res.status(200).json({
          chats: chats,
          stats: {
            totalMessages: rows ? rows.length : 0,
            unresolvedCount: 0,
            totalClients: chats.length
          }
        });

        db.close();
      }
    );
  } catch (error) {
    console.error('Error en dashboard-data:', error);
    res.status(500).json({ error: error.message });
    db.close();
  }
};
