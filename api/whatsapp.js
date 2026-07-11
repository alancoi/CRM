require('dotenv').config();
const twilio = require('twilio');
const querystring = require('querystring');

const {
  getMainMenu,
  processMessage,
  formatResponseWithLinks,
  handleAdminTeaching
} = require('../bot');

const {
  resolveQuery,
  getUnresolvedQueries,
  saveInteraction
} = require('../database');

const twilio_client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const adminPhone = process.env.ADMIN_PHONE;

module.exports = async (req, res) => {
  console.log(`📝 Método: ${req.method}, Path: ${req.url}`);

  if (req.method === 'GET') {
    if (req.url === '/api/whatsapp/health') {
      return res.status(200).json({ ok: true });
    }
    if (req.url === '/api/whatsapp/status') {
      return res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }
    return res.status(200).send('Webhook configured');
  }

  if (req.method === 'POST' && req.url === '/api/whatsapp') {
    return handleWhatsAppMessage(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
};

async function handleWhatsAppMessage(req, res) {
  let body = '';

  await new Promise((resolve, reject) => {
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  const incoming = querystring.parse(body);
  const userPhone = incoming.From;
  const userMessage = incoming.Body;

  console.log(`📱 Mensaje de ${userPhone}: ${userMessage}`);

  try {
    if (!userPhone || !userMessage) {
      console.error('❌ Falta From o Body');
      return res.status(400).json({ error: 'Missing From or Body' });
    }

    console.log('📌 Procesando mensaje...');
    const response = await processMessage(userMessage, userPhone);
    console.log('✅ Mensaje procesado:', JSON.stringify(response));

    console.log('📝 Formateando respuesta...');
    let messageText = formatResponseWithLinks(response, response.category);
    console.log('📝 Texto formateado:', messageText.substring(0, 100) + '...');

    console.log('💾 Guardando en Supabase...');
    try {
      await saveInteraction(userPhone, userMessage, messageText, response.category);
      console.log('✅ Interacción guardada en Supabase');
    } catch (dbError) {
      console.error('⚠️ Error guardando en Supabase:', dbError.message);
    }

    console.log('📤 Enviando mensaje a WhatsApp...');
    const sent = await twilio_client.messages.create({
      from: twilioPhoneNumber,
      to: userPhone,
      body: messageText
    });
    console.log('✅ Mensaje enviado:', sent.sid);

    if (response.shouldNotifyAdmin) {
      console.log('📢 Notificando al admin...');
      const adminNotification = `
🚨 NUEVA PREGUNTA SIN RESPUESTA

👤 De: ${userPhone}
❓ Pregunta: "${response.query}"
📂 Categoría: ${response.category || 'No especificada'}

Responde a este mensaje con el formato:
ENSEÑA: <palabra clave> | <respuesta>
      `.trim();

      await twilio_client.messages.create({
        from: twilioPhoneNumber,
        to: adminPhone,
        body: adminNotification
      });
      console.log('✅ Admin notificado');
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
