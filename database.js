require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

function saveInteraction(phone, message, response, category) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .insert([{ phone, message, response, category, timestamp: new Date().toISOString() }]);
      if (error) reject(error);
      else resolve(data?.[0]?.id || 1);
    } catch (err) {
      reject(err);
    }
  });
}

function saveLearned_Response(keyword, response, category) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('learned_responses')
        .upsert([{ keyword, response, category, created_at: new Date().toISOString() }], { onConflict: 'keyword' });
      if (error) reject(error);
      else resolve(data?.[0]?.id || 1);
    } catch (err) {
      reject(err);
    }
  });
}

function getLearnedResponse(keyword) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('learned_responses')
        .select('response, category')
        .eq('keyword', keyword)
        .single();
      if (error && error.code !== 'PGRST116') reject(error);
      else resolve(data?.response);
    } catch (err) {
      reject(err);
    }
  });
}

function searchResponses(keyword) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('learned_responses')
        .select('keyword, response, category')
        .ilike('keyword', `%${keyword}%`);
      if (error) reject(error);
      else resolve(data || []);
    } catch (err) {
      reject(err);
    }
  });
}

function saveUnresolvedQuery(query, fromPhone, category) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('unresolved_queries')
        .insert([{ query, from_phone: fromPhone, category, created_at: new Date().toISOString(), resolved: false }]);
      if (error) reject(error);
      else resolve(data?.[0]?.id || 1);
    } catch (err) {
      reject(err);
    }
  });
}

function getUnresolvedQueries() {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('unresolved_queries')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      if (error) reject(error);
      else resolve(data || []);
    } catch (err) {
      reject(err);
    }
  });
}

function resolveQuery(queryId, adminResponse) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('unresolved_queries')
        .update({ resolved: true, admin_response: adminResponse })
        .eq('id', queryId);
      if (error) reject(error);
      else resolve(data?.[0]?.id || 1);
    } catch (err) {
      reject(err);
    }
  });
}

function getAllResponses() {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase
        .from('learned_responses')
        .select('keyword, response, category')
        .order('created_at', { ascending: false });
      if (error) reject(error);
      else resolve(data || []);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  saveLearned_Response: saveLearned_Response,
  getLearnedResponse,
  searchResponses,
  saveUnresolvedQuery,
  getUnresolvedQueries,
  resolveQuery,
  getAllResponses,
  saveInteraction
};
