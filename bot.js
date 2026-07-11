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
    keywords: ['receta', 'saludable', 'dieta', 'salud', 'comida']
  },
  menopausia: {
    name: '📱 App para Mujeres con Menopausia',
    emoji: '📱',
    url: process.env.URL_MENOPAUSIA,
    keywords: ['menopausia', 'mujer', 'hormonal', 'síntomas', 'app']
  },
  remedios: {
    name: '🌿 Remedios Ancestrales',
    emoji: '🌿',
    url: process.env.URL_REMEDIOS,
    keywords: ['remedio', 'ancestral', 'abuela', 'natural', 'tradicional']
  }
};

const SALUDOS = ['hola', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'ey', 'hey', 'qué tal', 'cómo estás'];

function getMainMenu() {
  return {
    text: `Hola, gracias por interesarte por nuestros packs. ¿Cuál de estos te interesa?\n\n🥗 Más de 1000 Recetas Saludables\n📱 App para Mujeres con Menopausia\n🌿 200 Remedios Ancestrales Naturales`,
    quickReply: [
      {
        text: '🥗 Más de 1000 Recetas Saludables'
      },
      {
        text: '📱 App para Mujeres con Menopausia'
      },
      {
        text: '🌿 200 Remedios Ancestrales Naturales'
      }
    ]
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

  // Verificar si es uno de los botones principales
  let selectedCategory = null;
  for (const [key, category] of Object.entries(CATEGORIES)) {
    if (trimmed.includes(category.name) || trimmed.includes(category.emoji)) {
      selectedCategory = key;
      break;
    }
  }

  // Si es un botón principal, devolver el menú de la categoría
  if (selectedCategory) {
    return generateCategoryResponse(selectedCategory);
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

function generateCategoryResponse(categoryKey) {
  const category = CATEGORIES[categoryKey];

  return {
    text: `${category.emoji} ${category.name}\n\n¿En qué puedo ayudarte? Puedo responder preguntas sobre recetas, ingredientes, preparación y más.\n\nO si prefieres, haz clic aquí para ir directamente a nuestra tienda:\n\n👉 ${category.url}`,
    includeLinks: true,
    category: categoryKey,
    showBackButton: true
  };
}

function formatResponseWithLinks(response, category = null) {
  let text = response.text;

  // Agregar links automáticamente
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
  // Guardar la respuesta aprendida
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
  generateCategoryResponse,
  formatResponseWithLinks,
  handleAdminTeaching,
  CATEGORIES,
  getCategoryFromText
};
