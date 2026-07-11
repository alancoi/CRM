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

// Handler principal para Vercel
module.exports = async (req, res) => {
  console.log(`📝 Método: ${req.method}, Path: ${req.url}`);

  // Si es GET a /health o /status
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

  // Si es POST a /api/whatsapp
  if (req.method === 'POST' && req.url === '/api/whatsapp') {
    return handleWhatsAppMessage(req, res);
  }

  // Cualquier otra ruta
  return res.status(404).json({ error: 'Not found' });
};

async function handleWhatsAppMessage(req, res) {
  let body = '';

  // Leer el body de la solicitud
  await new Promise((resolve, reject) => {
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  // Parsear el body (Twilio envía form-urlencoded)
  const incoming = new URLSearchParams(body);
  const userPhone = incoming.get('From');
  const userMessage = incoming.get('Body');

  console.log(`📱 Mensaje de ${userPhone}: ${userMessage}`);
  console.log(`🔑 Twilio Number: ${twilioPhoneNumber}, Admin: ${adminPhone}`);

  try {
    if (!userPhone || !userMessage) {
      console.error('❌ Falta From o Body');
      return res.status(400).json({ error: 'Missing From or Body' });
    }

    // Procesar mensaje
    console.log('📌 Procesando mensaje...');
    const response = await processMessage(userMessage, userPhone);
    console.log('✅ Mensaje procesado:', JSON.stringify(response));

    // Formatear respuesta
    console.log('📝 Formateando respuesta...');
    let messageText = formatResponseWithLinks(response, response.category);
    console.log('📝 Texto formateado:', messageText.substring(0, 100) + '...');

    // Guardar interacción en Supabase ANTES de enviar
    console.log('💾 Guardando en Supabase...');
    try {
      await saveInteraction(userPhone, userMessage, messageText, response.category);
      console.log('✅ Interacción guardada en Supabase');
    } catch (dbError) {
      console.error('⚠️ Error guardando en Supabase:', dbError.message);
    }

    // Enviar respuesta principal
    console.log('📤 Enviando mensaje a WhatsApp...');
    const sent = await twilio_client.messages.create({
      from: twilioPhoneNumber,
      to: userPhone,
      body: messageText
    });
    console.log('✅ Mensaje enviado:', sent.sid);

    // Si es una consulta no resuelta, notificar al admin
    if (response.shouldNotifyAdmin) {
      console.log('📢 Notificando al admin...');
      const adminNotification = `
🚨 NUEVA PREGUNTA SIN RESPUESTA

👤 De: ${userPhone}
❓ Pregunta: "${response.query}"
📂 Categoría: ${response.category || 'No especificada'}

Responde a este mensaje con el formato:
ENSEÑA: <palabra clave> | <respuesta>

Ejemplo:
ENSEÑA: receta de té | El té de jengibre es excelente para la inflamación...
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
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}
