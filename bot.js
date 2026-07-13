const {
  getLearnedResponse,
  searchResponses,
  saveUnresolvedQuery,
  saveInteraction,
  saveLearnedResponse
} = require('./database');

const CATEGORIES = {
  recetas_saludables: {
    name: '🥗 Más de 1000 Recetas Saludables',
    emoji: '🥗',
    url: 'https://remediosdelaabuela.myshopify.com/pages/recetas',
    keywords: ['receta', 'saludable', 'dieta', 'salud', 'comida', '1']
  },
  menopausia: {
    name: '📱 App para Mujeres con Menopausia',
    emoji: '📱',
    url: process.env.URL_MENOPAUSIA || 'https://menopausia.ejemplo.com',
    keywords: ['menopausia', 'mujer', 'hormonal', 'síntomas', 'app', '2']
  },
  remedios: {
    name: '🌿 Remedios Ancestrales',
    emoji: '🌿',
    url: process.env.URL_REMEDIOS || 'https://remedios.ejemplo.com',
    keywords: ['remedio', 'ancestral', 'abuela', 'natural', 'tradicional', '3']
  }
};

const SALUDOS = ['hola', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'ey', 'hey', 'qué tal', 'cómo estás'];

// VARIACIONES DE "YA COMPRÉ"
const COMPRA_CONFIRMADA_KEYWORDS = [
  'ya compré', 'ya compre', 'listo', 'ya he comprado', 'ya pagué', 'ya pague',
  'ya compré', 'compré', 'compre', 'pagué', 'pague', 'listo ya compre',
  'listo, ya compré', 'ya realicé la compra', 'realicé la compra', 'realice la compra',
  'ya realice la compra', 'efectué la compra', 'efectue la compra', 'hice la compra',
  'compré ya', 'compre ya', 'lista la compra', 'lista mi compra', 'lista, compré',
  'lista, compre', 'ya está hecho', 'ya esta hecho', 'completé la compra',
  'complete la compra', 'comprado', 'comprada', 'ya comprada', 'ya comprado',
  'pago realizado', 'pago hecho', 'ya pague', 'compra confirmada', 'confirmado'
];

// VARIACIONES OPCIÓN 1
const OPCION_1_KEYWORDS = [
  'quiero el 1', 'dame el 1', 'la quiero el 1', 'necesito el 1',
  'estoy interesado en el 1', 'interesado en recetas', 'quiero recetas',
  'dame recetas', 'recetas saludables', 'quiero las recetas', 'dame las recetas',
  'me interesa el 1', 'voy con el 1', '1 por favor', 'opción 1',
  'la primera', 'la primera opción', 'recetas', 'más recetas', 'quiero más recetas',
  'recetas por favor', 'me interesa recetas', 'recetas saludables por favor',
  'me gustan las recetas', 'dame la primera', 'la de recetas', 'número uno',
  'numero uno', 'uno', 'el 1', 'primer opción'
];

// VARIACIONES OPCIÓN 2
const OPCION_2_KEYWORDS = [
  'quiero el 2', 'dame el 2', 'la quiero el 2', 'necesito el 2',
  'estoy interesado en el 2', 'interesado en menopausia', 'quiero menopausia',
  'dame menopausia', 'app menopausia', 'quiero la app', 'dame la app',
  'me interesa el 2', 'voy con el 2', '2 por favor', 'opción 2',
  'la segunda', 'la segunda opción', 'menopausia', 'app', 'aplicación',
  'app para mujeres', 'me interesa menopausia', 'menopausia por favor',
  'me gustaría la app', 'dame la segunda', 'la de menopausia', 'número dos',
  'numero dos', 'dos', 'el 2', 'segunda opción', 'aplicación para mujeres'
];

// VARIACIONES OPCIÓN 3
const OPCION_3_KEYWORDS = [
  'quiero el 3', 'dame el 3', 'la quiero el 3', 'necesito el 3',
  'estoy interesado en el 3', 'interesado en remedios', 'quiero remedios',
  'dame remedios', 'remedios ancestrales', 'quiero los remedios', 'dame los remedios',
  'me interesa el 3', 'voy con el 3', '3 por favor', 'opción 3',
  'la tercera', 'la tercera opción', 'remedios', 'remedios naturales', 'remedios ancestrales',
  'me interesa remedios', 'remedios por favor', 'me gustaría los remedios',
  'dame la tercera', 'la de remedios', 'número tres', 'numero tres', 'tres',
  'el 3', 'tercera opción', 'remedios naturales por favor', 'quiero remedios ancestrales'
];

const FACEBOOK_LINK = 'https://www.facebook.com/profile.php?id=61591793630796&sk=reviews';

function getMainMenu() {
  return {
    text: `¡Hola! 👋 Gracias por interesarte en nuestros packs 🎉 Aquí te paso la info. **Solo responde con los números de lo que te interesa (1, 2 o 3).** ⬇️

1️⃣ 🥗 Más de 1000 Recetas Saludables
2️⃣ 📱 App para Mujeres con Menopausia  
3️⃣ 🌿 Remedios Ancestrales

Toda la información y compra está en la web 🌐 ¡Disfruta los superdescuentos con bonus de regalo! 🎁✨

💳 El pago es único con acceso inmediato al mail y de por vida
📥 Podés descargar el contenido para verlo cuando quieras y sin Internet
📱 O utilizarlo cuando quieras en el caso de la aplicación, y sin Internet`,
    category: 'menu'
  };
}

function getErrorResponse() {
  return {
    text: `Por favor, responde con un número 🙏 (1, 2 o 3) para ayudarte mejor:

1️⃣ 🥗 Más de 1000 Recetas Saludables
2️⃣ 📱 App para Mujeres con Menopausia  
3️⃣ 🌿 Remedios Ancestrales`,
    category: 'error'
  };
}

function normalizarTexto(texto) {
  return texto.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

function coincideConPalabras(texto, palabras) {
  const textoNormalizado = normalizarTexto(texto);
  return palabras.some(palabra => {
    const palabraNormalizada = normalizarTexto(palabra);
    return textoNormalizado.includes(palabraNormalizada);
  });
}

function isGreeting(text) {
  const lowerText = text.toLowerCase().trim();
  return SALUDOS.some(saludo => lowerText === saludo || lowerText.includes(saludo));
}

async function processMessage(userMessage, fromPhone) {
  const trimmed = userMessage.trim();

  // Si es un saludo
  if (isGreeting(trimmed)) {
    return getMainMenu();
  }

  // Verificar si es "ya compré" (con muchas variaciones)
  if (coincideConPalabras(trimmed, COMPRA_CONFIRMADA_KEYWORDS)) {
    return {
      text: `¡Perfecto! 🎉 Ya te enviamos el regalito, está en el drive, fijate con tu acceso 📥

Te pido un favorcito 🙏 Si podés comentar en nuestro Facebook con una reseña positiva, diciendo que te llegó todo bien, nos ayuda un montón para que otras personas confíen en nuestro trabajo 💚

Acá está el link para comentar:
🔗 ${FACEBOOK_LINK}

Muchas gracias, que tengas un hermoso día 😊`,
      category: 'compra_confirmada'
    };
  }

  // Verificar opción 1 (Recetas)
  if (coincideConPalabras(trimmed, OPCION_1_KEYWORDS)) {
    return generateProductResponse('recetas_saludables');
  }

  // Verificar opción 2 (Menopausia)
  if (coincideConPalabras(trimmed, OPCION_2_KEYWORDS)) {
    return generateProductResponse('menopausia');
  }

  // Verificar opción 3 (Remedios)
  if (coincideConPalabras(trimmed, OPCION_3_KEYWORDS)) {
    return generateProductResponse('remedios');
  }

  // Intentar encontrar respuesta en la base de datos
  const learnedResponse = await getLearnedResponse(trimmed);
  if (learnedResponse) {
    return {
      text: learnedResponse,
      category: 'learned'
    };
  }

  // Buscar respuestas similares
  const similarResponses = await searchResponses(trimmed);
  if (similarResponses.length > 0) {
    return {
      text: similarResponses[0].response,
      category: similarResponses[0].category
    };
  }

  // Si no entiende
  return getErrorResponse();
}

function generateProductResponse(categoryKey) {
  const category = CATEGORIES[categoryKey];

  return {
    text: `${category.emoji} ${category.name}

Una vez que realices tu compra, escribime por acá diciendo **"ya compré" y tu mail** 📧 así te puedo enviar un regalito aparte de tu compra 🎁✨

👉 ${category.url}`,
    category: categoryKey
  };
}

function formatResponseWithLinks(response, category = null) {
  return response.text || response;
}

async function handleAdminTeaching(queryId, teachingResponse) {
  const keywords = teachingResponse.keywords || [];
  const mainKeyword = keywords[0] || `query_${queryId}`;

  await saveLearnedResponse(
    mainKeyword,
    teachingResponse.response,
    teachingResponse.category || 'general'
  );

  return {
    success: true,
    message: `✓ Aprendí: "${mainKeyword}" → "${teachingResponse.response}"`
  };
}

module.exports = {
  getMainMenu,
  processMessage,
  generateProductResponse,
  formatResponseWithLinks,
  handleAdminTeaching,
  CATEGORIES,
  COMPRA_CONFIRMADA_KEYWORDS,
  OPCION_1_KEYWORDS,
  OPCION_2_KEYWORDS,
  OPCION_3_KEYWORDS
};
