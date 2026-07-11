const {
  getLearnedResponse,
  searchResponses,
  saveUnresolvedQuery,
  saveInteraction,
  saveLearnedResponse
} = require('./database');

const CATEGORIES = {
  recetas_saludables: {
    name: '🥗 Recetas Saludables',
    emoji: '🥗',
    url: process.env.URL_RECETAS_SALUDABLES,
    keywords: ['receta', 'saludable', 'dieta', 'salud', 'comida', '1']
  },
  menopausia: {
    name: '📱 App para Mujeres con Menopausia',
    emoji: '📱',
    url: process.env.URL_MENOPAUSIA,
    keywords: ['menopausia', 'mujer', 'hormonal', 'síntomas', 'app', '2']
  },
  remedios: {
    name: '🌿 Remedios Ancestrales',
    emoji: '🌿',
    url: process.env.URL_REMEDIOS,
    keywords: ['remedio', 'ancestral', 'abuela', 'natural', 'tradicional', '3']
  }
};

const SALUDOS = ['hola', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'ey', 'hey', 'qué tal', 'cómo estás'];

function getMainMenu() {
  return {
    text: `Hola, gracias por interesarte por nuestros packs. ¿Cuál de estos te interesa?

Escribí el número (1, 2 o 3):

1️⃣ 🥗 Más de 1000 Recetas Saludables
2️⃣ 📱 App para Mujeres con Menopausia
3️⃣ 🌿 Remedios Ancestrales

💡 Importante: Las compras se hacen solo por la web y te llegan automáticamente a tu mail. El pago es único con acceso de por vida al material y sus actualizaciones.`
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

async function processMessage(userMessage, fromPhone) {
  const trimmed = userMessage.trim();

  // Si es un saludo, mostrar menú principal
  if (isGreeting(trimmed)) {
    return getMainMenu();
  }

  // Verificar si es uno de los botones principales (por nombre o número)
  let selectedCategory = null;
  const lowerTrimmed = trimmed.toLowerCase();
  
  if (lowerTrimmed.includes('receta') || lowerTrimmed === '1') {
    selectedCategory = 'recetas_saludables';
  } else if (lowerTrimmed.includes('menopausia') || lowerTrimmed.includes('app') || lowerTrimmed === '2') {
    selectedCategory = 'menopausia';
  } else if (lowerTrimmed.includes('remedio') || lowerTrimmed === '3') {
    selectedCategory = 'remedios';
  }

  // Si es una opción del menú, devolver la web directa
  if (selectedCategory) {
    return generateDirectPurchaseResponse(selectedCategory);
  }

  // Intentar encontrar respuesta en la base de datos
  const learnedResponse = await getLearnedResponse(trimmed);
  if (learnedResponse) {
    const category = getCategoryFromText(userMessage);
    await saveInteraction(fromPhone, userMessage, learnedResponse, category);
    return {
      text: learnedResponse,
      includeLinks: true,
      category: category
    };
  }

  // Buscar respuestas similares
  const similarResponses = await searchResponses(trimmed);
  if (similarResponses.length > 0) {
    const response = similarResponses[0];
    await saveInteraction(fromPhone, userMessage, response.response, response.category);
    return {
      text: response.response,
      includeLinks: true,
      category: response.category
    };
  }

  // Si no encontró respuesta, guardar como consulta no resuelta
  const category = getCategoryFromText(userMessage);
  await saveUnresolvedQuery(userMessage, fromPhone, category);

  return {
    text: `Esa pregunta no la tengo en mi base de datos todavía, pero en cuanto la agreguen, te paso todo. Mientras tanto, mirá nuestras opciones:`,
    unknownQuery: true,
    shouldNotifyAdmin: true,
    queryPhone: fromPhone,
    query: userMessage,
    category: category,
    includeLinks: true
  };
}

function generateDirectPurchaseResponse(categoryKey) {
  const category = CATEGORIES[categoryKey];

  return {
    text: `${category.emoji} ${category.name}\n\n¡Perfecto! Accedé a tu compra por aquí:\n\n👉 ${category.url}\n\nℹ️ Tu acceso se envía automáticamente a tu mail. Pago único, acceso de por vida + todas las actualizaciones.`,
    includeLinks: false,
    category: categoryKey
  };
}

function formatResponseWithLinks(response, category = null) {
  let text = response.text;

  // Agregar links automáticamente solo si se especifica
  if (response.includeLinks) {
    text += `\n\n---\n📱 Ir a la tienda:\n`;
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (!category || category === key) {
        text += `\n${cat.emoji} ${cat.name}\n${cat.url}`;
      }
    }
  }

  return text;
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
  generateDirectPurchaseResponse,
  formatResponseWithLinks,
  handleAdminTeaching,
  CATEGORIES,
  getCategoryFromText
};
