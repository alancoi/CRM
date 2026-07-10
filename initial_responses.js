/**
 * Respuestas iniciales para cargar en la base de datos
 * Ejecutar: node load_initial_responses.js
 */

const initialResponses = [
  // Recetas Saludables
  {
    keyword: 'ensalada',
    response: 'Una ensalada saludable debe incluir: verduras variadas de colores, proteína (pollo, huevo, legumbres), grasas saludables (aguacate, frutos secos), y una buena vinagreta.',
    category: 'recetas_saludables'
  },
  {
    keyword: 'desayuno saludable',
    response: 'Un desayuno saludable debe tener proteína, carbohidratos complejos y grasas saludables. Ejemplos: avena con frutos secos, huevos con tostadas integrales, yogur griego con berries.',
    category: 'recetas_saludables'
  },
  {
    keyword: 'snack saludable',
    response: 'Opciones de snacks saludables: almendras, manzana con mantequilla de maní, yogur griego, zanahorias con hummus, frutos secos sin sal, frutas frescas.',
    category: 'recetas_saludables'
  },
  {
    keyword: 'comer sin inflamación',
    response: 'Alimentos anti-inflamatorios: pescado azul, arándanos, espinaca, brócoli, jengibre, cúrcuma, aceite de oliva. Evitar: alimentos ultraprocesados, azúcares refinados, grasas trans.',
    category: 'recetas_saludables'
  },

  // Menopausia
  {
    keyword: 'menopausia síntomas',
    response: 'Los síntomas comunes incluyen: sofocos, cambios de humor, insomnio, sequedad vaginal, cambios de peso. La alimentación antiinflamatoria y rica en calcio ayuda mucho.',
    category: 'menopausia'
  },
  {
    keyword: 'calcio menopausia',
    response: 'En menopausia es crucial el calcio. Fuentes: leche, yogur, quesos, sardinas con espinas, brócoli, almendras, semillas de sésamo. Considerar suplemento después de consultar médico.',
    category: 'menopausia'
  },
  {
    keyword: 'sofocos menopausia',
    response: 'Para los sofocos: alimentos fríos, tés relajantes (salvia, manzanilla), evitar picante y cafeína. Ropa de algodón, mantener fresco el ambiente.',
    category: 'menopausia'
  },
  {
    keyword: 'insominio menopausia',
    response: 'Para el insomnio: evitar cafeína después de las 2pm, tés relajantes (valeriana, pasiflora), magnesio (almendras, espinaca), meditación, ejercicio regular.',
    category: 'menopausia'
  },

  // Remedios Ancestrales
  {
    keyword: 'té de jengibre',
    response: 'El té de jengibre es excelente para: inflamación, digestión, náuseas y calor. Preparar: rallar 1 cucharada de jengibre fresco, verter agua caliente, dejar reposar 10 min, colar.',
    category: 'remedios'
  },
  {
    keyword: 'cúrcuma beneficios',
    response: 'La cúrcuma es un poderoso anti-inflamatorio. Combinar con pimienta negra para mejor absorción. Usar en: arroces, curries, leche dorada, jugos. Dosis: 1/2 a 1 cucharadita diaria.',
    category: 'remedios'
  },
  {
    keyword: 'té de cúrcuma',
    response: 'Leche dorada: mezclar cúrcuma, pimienta negra, canela, jengibre. Servir con leche caliente (puede ser vegetal). Beneficios: anti-inflamatorio, mejora digestión, relaja.',
    category: 'remedios'
  },
  {
    keyword: 'manzanilla beneficios',
    response: 'La manzanilla relaja, mejora digestión, ayuda a dormir y reduce inflamación. Preparar: 1 bolsita o flores secas en agua caliente, dejar 5 min. Tomar 2-3 tazas diarias.',
    category: 'remedios'
  },
  {
    keyword: 'aloe vera',
    response: 'El aloe vera es cicatrizante, anti-inflamatorio e hidratante. Uso interno: gel puro (poco), en jugos (con moderación). Externo: aplicar directamente en piel. Consultar médico antes.',
    category: 'remedios'
  },

  // General/Multi-categoría
  {
    keyword: 'agua',
    response: 'Beber suficiente agua es fundamental: hidrata, ayuda a la digestión, regula temperatura. Recomendación: 2-3 litros diarios. Más en clima caliente o con ejercicio.',
    category: 'general'
  },
  {
    keyword: 'ejercicio',
    response: 'El ejercicio regular (30 min diarios) ayuda con inflamación, peso, energía y humor. Opciones: caminar, yoga, nadar, bailar. Lo importante es consistencia.',
    category: 'general'
  }
];

module.exports = initialResponses;
