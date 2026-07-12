const { saveLearned_Response } = require('../database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, response, category } = req.body;

    if (!keyword || !response) {
      return res.status(400).json({ error: 'Keyword and response required' });
    }

    console.log('Saving learned response:', { keyword, response, category });
    
    const id = await saveLearned_Response(keyword, response, category || 'general');
    
    console.log('Learned response saved with ID:', id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Bot trained successfully',
      keyword,
      response
    });
  } catch (error) {
    console.error('Training error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
