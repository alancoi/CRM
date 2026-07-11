require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

module.exports = async (req, res) => {
  try {
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const chatsMap = {};
    (interactions || []).forEach(interaction => {
      if (!chatsMap[interaction.phone]) {
        chatsMap[interaction.phone] = {
          id: Object.keys(chatsMap).length,
          name: interaction.phone,
          phone: interaction.phone,
          lastMessage: interaction.message || interaction.response || '',
          messages: []
        };
      }
      chatsMap[interaction.phone].messages.push({
        type: interaction.message ? 'sent' : 'received',
        text: interaction.message || interaction.response
      });
    });

    const chats = Object.values(chatsMap);

    res.status(200).json({
      chats,
      stats: {
        totalClients: chats.length,
        totalMessages: interactions?.length || 0,
        unresolvedCount: 0
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
