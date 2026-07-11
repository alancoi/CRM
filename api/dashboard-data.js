require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('Dashboard-data: SUPABASE_URL =', SUPABASE_URL ? 'SET' : 'MISSING');
console.log('Dashboard-data: SUPABASE_ANON_KEY =', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');

module.exports = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('Fetching user_interactions from Supabase...');
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Got interactions:', interactions?.length || 0);

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
    console.log('Returning chats:', chats.length);

    res.status(200).json({
      chats,
      stats: {
        totalClients: chats.length,
        totalMessages: interactions?.length || 0,
        unresolvedCount: 0
      }
    });
  } catch (error) {
    console.error('Dashboard-data error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};
