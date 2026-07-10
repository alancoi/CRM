require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const {
  getMainMenu,
  processMessage,
  formatResponseWithLinks,
  handleAdminTeaching
} = require('./bot');

const {
  resolveQuery,
  getUnresolvedQueries
} = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const twilio_client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const adminPhone = process.env.ADMIN_PHONE;

// Rutas

// Ruta principal para recibir mensajes de WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
  const incoming = req.body;
  const userPhone = incoming.From;
  const userMessage = incoming.Body;

  console.log(`📱 Mensaje de ${userPhone}: ${userMessage}`);

  try {
    // Procesar mensaje
    const response = await processMessage(userMessage, userPhone);

    // Formatear respuesta
    let messageText = formatResponseWithLinks(response, response.category);

    // Enviar respuesta principal
    await twilio_client.messages.create({
      from: twilioPhoneNumber,
      to: userPhone,
      body: messageText
    });

    // Si es una consulta no resuelta, notificar al admin
    if (response.shouldNotifyAdmin) {
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
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    res.status(500).send('Error');
  }
});

// Ruta para que el admin responda a consultas
app.post('/webhook/admin-teach', async (req, res) => {
  const incoming = req.body;
  const adminPhone_check = incoming.From;
  const message = incoming.Body;

  if (adminPhone_check !== adminPhone) {
    console.log('❌ Intento de acceso no autorizado desde:', adminPhone_check);
    return res.status(403).send('Unauthorized');
  }

  // Buscar comando ENSEÑA
  if (message.startsWith('ENSEÑA:')) {
    try {
      const parts = message.substring(7).split('|').map(p => p.trim());
      const keyword = parts[0];
      const response = parts.slice(1).join('|');

      if (!keyword || !response) {
        await twilio_client.messages.create({
          from: twilioPhoneNumber,
          to: adminPhone,
          body: '❌ Formato incorrecto. Usa: ENSEÑA: palabra | respuesta'
        });
        return res.status(400).send('Bad format');
      }

      // Guardar la respuesta aprendida
      await handleAdminTeaching(null, {
        keywords: [keyword],
        response: response,
        category: 'admin_taught'
      });

      await twilio_client.messages.create({
        from: twilioPhoneNumber,
        to: adminPhone,
        body: `✅ Aprendí: "${keyword}" → "${response}"`
      });

    } catch (error) {
      console.error('Error enseñando:', error);
      await twilio_client.messages.create({
        from: twilioPhoneNumber,
        to: adminPhone,
        body: '❌ Error al procesar. Intenta de nuevo.'
      });
    }
  } else if (message.toLowerCase() === 'pendientes') {
    // Mostrar consultas pendientes
    const pending = await getUnresolvedQueries();
    if (pending.length === 0) {
      await twilio_client.messages.create({
        from: twilioPhoneNumber,
        to: adminPhone,
        body: '✓ No hay consultas pendientes'
      });
    } else {
      let msg = `📋 CONSULTAS PENDIENTES (${pending.length}):\n\n`;
      pending.slice(0, 5).forEach((q, i) => {
        msg += `${i + 1}. De ${q.from_phone}\n"${q.query}"\n\n`;
      });
      await twilio_client.messages.create({
        from: twilioPhoneNumber,
        to: adminPhone,
        body: msg
      });
    }
  }

  res.status(200).send('OK');
});

// Ruta para recibir mensajes webhook de Twilio
app.get('/webhook/whatsapp', (req, res) => {
  res.status(200).send('Webhook configured');
});

// Ruta de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🤖 Bot WhatsApp "Recetas de la Abuela" ║
║      Servidor iniciado exitosamente    ║
╚════════════════════════════════════════╝

📱 Escuchando en puerto: ${port}
📲 Webhook: POST /webhook/whatsapp
👨‍💼 Admin: POST /webhook/admin-teach

Variables requeridas:
  ✓ TWILIO_ACCOUNT_SID
  ✓ TWILIO_AUTH_TOKEN
  ✓ TWILIO_WHATSAPP_NUMBER
  ✓ ADMIN_PHONE

Pronto estará disponible en:
http://localhost:${port}
  `);
});

// Manejo de errores
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
