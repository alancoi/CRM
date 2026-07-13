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

function getCategoryFromText(text) {
  const lowerText = text.toLowerCase();

  for (const [key, category] of Object.entries(CATEGORIES)) {
    if (lowerText.includes(key.replace('_', ' ')) ||
        category.keywords.some(keyword => lowerText.includes(keyword))) {
      return key;
    }
  }
  return null;
}

function isGreeting(text) {
  const lowerText = text.toLowerCase().trim();
  return SALUDOS.some(saludo => lowerText === saludo || lowerText.includes(saludo));
}

function isValidOption(text) {
  const trimmed = text.toLowerCase().trim();
  return trimmed === '1' || trimmed === '2' || trimmed === '3';
}

async function processMessage(userMessage, fromPhone) {
  const trimmed = userMessage.trim();

  // Si es un saludo, mostrar menú principal
  if (isGreeting(trimmed)) {
    return getMainMenu();
  }

  // Verificar si es uno de los botones principales (por nombre o número)
  let selectedCategory = null;
  const lowerTrimmed = trimmed.toLowerCase();
  
  if (lowerTrimmed.includes('receta') || lowerTrimmed === '1' || lowerTrimmed.includes('número 1') || lowerTrimmed.includes('el 1')) {
    selectedCategory = 'recetas_saludables';
  } else if (lowerTrimmed.includes('menopausia') || lowerTrimmed.includes('app') || lowerTrimmed === '2' || lowerTrimmed.includes('número 2') || lowerTrimmed.includes('el 2')) {
    selectedCategory = 'menopausia';
  } else if (lowerTrimmed.includes('remedio') || lowerTrimmed === '3' || lowerTrimmed.includes('número 3') || lowerTrimmed.includes('el 3')) {
    selectedCategory = 'remedios';
  }

  // Si es una opción válida del menú, devolver la información del producto
  if (selectedCategory) {
    return generateProductResponse(selectedCategory);
  }

  // Si escribió algo que no es un número ni una opción válida
  if (!isValidOption(trimmed) && !getCategoryFromText(userMessage)) {
    // Verificar si dice "ya compré"
    if (lowerTrimmed.includes('ya compré')) {
      return {
        text: `¡Perfecto! 🎉 Ya te enviamos el regalito, está en el drive, fijate con tu acceso 📥

Te pido un favorcito 🙏 Si podés comentar en nuestro Facebook con una reseña positiva, diciendo que te llegó todo bien, nos ayuda un montón para que otras personas confíen en nuestro trabajo 💚

Acá está el link para comentar:
🔗 ${FACEBOOK_LINK}

Muchas gracias, que tengas un hermoso día 😊`,
        category: 'compra_confirmada'
      };
    }

    // Si no entiende, pedir que responda con un número
    return getErrorResponse();
  }

  // Intentar encontrar respuesta en la base de datos
  const learnedResponse = await getLearnedResponse(trimmed);
  if (learnedResponse) {
    return {
      text: learnedResponse,
      category: getCategoryFromText(userMessage)
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

  // Si no encontró respuesta, devolver error
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
  getCategoryFromText
};
