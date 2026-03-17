/**
 * Spanish Language Curriculum
 * Structured learning path from basic to advanced
 */

import { Unit, createUnit, createLesson, createPrompt, registerCurriculum } from '../curriculum';

// ============================================
// UNIT 1: Basics - Greetings & Introductions
// ============================================

const unit1Basics: Unit = createUnit(
  'es-basics-1',
  'Basics 1',
  [
    // Lesson 1: Hello & Goodbye
    createLesson('es-basics-1-greetings', 'es-basics-1', 'Greetings', [
      createPrompt('p1', 'Say "Hello" in Spanish', {
        targetPhrase: 'Hola',
        expectedResponses: ['hola', 'ola'],
        hints: ['It sounds like "OH-lah"'],
        aiContext: 'The student is learning basic greetings. "Hola" is the most common greeting in Spanish.',
      }),
      createPrompt('p2', 'Say "Good morning" in Spanish', {
        targetPhrase: 'Buenos días',
        expectedResponses: ['buenos días', 'buenos dias', 'buen dia'],
        hints: ['It literally means "good days"'],
        aiContext: 'Buenos días is used from morning until around noon.',
      }),
      createPrompt('p3', 'Say "Good afternoon" in Spanish', {
        targetPhrase: 'Buenas tardes',
        expectedResponses: ['buenas tardes'],
        hints: ['Used after noon until evening'],
        aiContext: 'Buenas tardes is used from noon until sunset.',
      }),
      createPrompt('p4', 'Say "Goodbye" in Spanish', {
        targetPhrase: 'Adiós',
        expectedResponses: ['adiós', 'adios'],
        hints: ['It sounds like "ah-dee-OHS"'],
        aiContext: 'Adiós is the standard way to say goodbye.',
      }),
      createPrompt('p5', 'Say "See you later" in Spanish', {
        targetPhrase: 'Hasta luego',
        expectedResponses: ['hasta luego'],
        hints: ['Literally means "until later"'],
        aiContext: 'Hasta luego is a casual way to say goodbye.',
      }),
    ], {
      description: 'Learn to greet people and say goodbye',
      xpReward: 15,
      estimatedMinutes: 5,
    }),

    // Lesson 2: Introductions
    createLesson('es-basics-1-intro', 'es-basics-1', 'Introductions', [
      createPrompt('p1', 'Say "My name is..." (use your name)', {
        targetPhrase: 'Me llamo...',
        expectedResponses: ['me llamo'],
        hints: ['Literally means "I call myself"'],
        aiContext: 'Me llamo is the most common way to introduce yourself.',
      }),
      createPrompt('p2', 'Ask "What is your name?" in Spanish', {
        targetPhrase: '¿Cómo te llamas?',
        expectedResponses: ['cómo te llamas', 'como te llamas'],
        hints: ['Literally "How do you call yourself?"'],
        aiContext: 'This is the informal way to ask someone\'s name.',
      }),
      createPrompt('p3', 'Say "Nice to meet you" in Spanish', {
        targetPhrase: 'Mucho gusto',
        expectedResponses: ['mucho gusto', 'encantado', 'encantada'],
        hints: ['Literally means "much pleasure"'],
        aiContext: 'Mucho gusto is said when meeting someone for the first time.',
      }),
      createPrompt('p4', 'Say "I am from..." in Spanish', {
        targetPhrase: 'Soy de...',
        expectedResponses: ['soy de'],
        hints: ['"Soy" means "I am"'],
        aiContext: 'Soy de is used to say where you are from.',
      }),
    ], {
      description: 'Learn to introduce yourself',
      xpReward: 15,
      estimatedMinutes: 5,
    }),

    // Lesson 3: Polite Expressions
    createLesson('es-basics-1-polite', 'es-basics-1', 'Polite Words', [
      createPrompt('p1', 'Say "Please" in Spanish', {
        targetPhrase: 'Por favor',
        expectedResponses: ['por favor'],
        hints: ['Literally "for favor"'],
        aiContext: 'Por favor is essential for polite requests.',
      }),
      createPrompt('p2', 'Say "Thank you" in Spanish', {
        targetPhrase: 'Gracias',
        expectedResponses: ['gracias'],
        hints: ['Sounds like "GRAH-see-ahs"'],
        aiContext: 'Gracias is the most common way to say thank you.',
      }),
      createPrompt('p3', 'Say "You\'re welcome" in Spanish', {
        targetPhrase: 'De nada',
        expectedResponses: ['de nada'],
        hints: ['Literally means "of nothing"'],
        aiContext: 'De nada is the standard response to gracias.',
      }),
      createPrompt('p4', 'Say "Excuse me" in Spanish', {
        targetPhrase: 'Perdón',
        expectedResponses: ['perdón', 'perdon', 'disculpe'],
        hints: ['Used to get attention or apologize'],
        aiContext: 'Perdón can be used to get attention or apologize for something minor.',
      }),
    ], {
      description: 'Learn essential polite expressions',
      xpReward: 15,
      estimatedMinutes: 4,
    }),
  ],
  {
    description: 'Start your Spanish journey with essential greetings and introductions',
    requiredXP: 0,
    icon: '👋',
  }
);

// ============================================
// UNIT 2: Numbers & Time
// ============================================

const unit2Numbers: Unit = createUnit(
  'es-numbers',
  'Numbers',
  [
    // Lesson 1: Numbers 1-10
    createLesson('es-numbers-1-10', 'es-numbers', 'Numbers 1-10', [
      createPrompt('p1', 'Say the number "one" in Spanish', {
        targetPhrase: 'Uno',
        expectedResponses: ['uno'],
        aiContext: 'Uno is one. The numbers 1-10 are essential.',
      }),
      createPrompt('p2', 'Say the number "two" in Spanish', {
        targetPhrase: 'Dos',
        expectedResponses: ['dos'],
        aiContext: 'Dos means two.',
      }),
      createPrompt('p3', 'Say the number "three" in Spanish', {
        targetPhrase: 'Tres',
        expectedResponses: ['tres'],
        aiContext: 'Tres means three.',
      }),
      createPrompt('p4', 'Count from one to five in Spanish', {
        targetPhrase: 'Uno, dos, tres, cuatro, cinco',
        expectedResponses: ['uno dos tres cuatro cinco', 'uno, dos, tres, cuatro, cinco'],
        hints: ['Cuatro = 4, Cinco = 5'],
        aiContext: 'Practice counting 1-5 fluently.',
      }),
      createPrompt('p5', 'Count from six to ten in Spanish', {
        targetPhrase: 'Seis, siete, ocho, nueve, diez',
        expectedResponses: ['seis siete ocho nueve diez'],
        hints: ['Seis=6, Siete=7, Ocho=8, Nueve=9, Diez=10'],
        aiContext: 'Practice counting 6-10 fluently.',
      }),
    ], {
      description: 'Learn to count from 1 to 10',
      xpReward: 20,
      estimatedMinutes: 6,
    }),

    // Lesson 2: Telling Time
    createLesson('es-time-basic', 'es-numbers', 'Telling Time', [
      createPrompt('p1', 'Ask "What time is it?" in Spanish', {
        targetPhrase: '¿Qué hora es?',
        expectedResponses: ['qué hora es', 'que hora es'],
        aiContext: 'Qué hora es is the standard way to ask the time.',
      }),
      createPrompt('p2', 'Say "It is one o\'clock" in Spanish', {
        targetPhrase: 'Es la una',
        expectedResponses: ['es la una'],
        hints: ['Use "es la" for 1 o\'clock only'],
        aiContext: 'For 1 o\'clock specifically, we say "Es la una".',
      }),
      createPrompt('p3', 'Say "It is three o\'clock" in Spanish', {
        targetPhrase: 'Son las tres',
        expectedResponses: ['son las tres'],
        hints: ['Use "son las" for 2-12 o\'clock'],
        aiContext: 'For 2-12 o\'clock, we say "Son las [number]".',
      }),
    ], {
      description: 'Learn to tell time',
      xpReward: 15,
      estimatedMinutes: 5,
    }),
  ],
  {
    description: 'Master numbers and telling time',
    requiredXP: 30, // Must complete Unit 1
    icon: '🔢',
  }
);

// ============================================
// UNIT 3: Common Phrases
// ============================================

const unit3Phrases: Unit = createUnit(
  'es-phrases',
  'Common Phrases',
  [
    // Lesson 1: Questions
    createLesson('es-phrases-questions', 'es-phrases', 'Basic Questions', [
      createPrompt('p1', 'Ask "How are you?" in Spanish', {
        targetPhrase: '¿Cómo estás?',
        expectedResponses: ['cómo estás', 'como estas', 'cómo está'],
        hints: ['Informal: estás, Formal: está'],
        aiContext: 'Cómo estás is informal, cómo está is formal.',
      }),
      createPrompt('p2', 'Say "I am fine, thank you" in Spanish', {
        targetPhrase: 'Estoy bien, gracias',
        expectedResponses: ['estoy bien gracias', 'bien gracias', 'muy bien gracias'],
        aiContext: 'A common response to "cómo estás".',
      }),
      createPrompt('p3', 'Ask "Where is...?" in Spanish', {
        targetPhrase: '¿Dónde está...?',
        expectedResponses: ['dónde está', 'donde esta'],
        hints: ['Dónde means "where"'],
        aiContext: 'Dónde está is used to ask where something is located.',
      }),
      createPrompt('p4', 'Ask "How much does it cost?" in Spanish', {
        targetPhrase: '¿Cuánto cuesta?',
        expectedResponses: ['cuánto cuesta', 'cuanto cuesta'],
        hints: ['Essential for shopping!'],
        aiContext: 'Cuánto cuesta is essential for shopping.',
      }),
    ], {
      description: 'Learn to ask common questions',
      xpReward: 20,
      estimatedMinutes: 6,
    }),

    // Lesson 2: Needs & Wants
    createLesson('es-phrases-needs', 'es-phrases', 'Expressing Needs', [
      createPrompt('p1', 'Say "I want..." in Spanish', {
        targetPhrase: 'Quiero...',
        expectedResponses: ['quiero', 'yo quiero'],
        aiContext: 'Quiero is "I want" - very useful!',
      }),
      createPrompt('p2', 'Say "I need..." in Spanish', {
        targetPhrase: 'Necesito...',
        expectedResponses: ['necesito', 'yo necesito'],
        aiContext: 'Necesito means "I need".',
      }),
      createPrompt('p3', 'Say "I would like..." in Spanish (polite)', {
        targetPhrase: 'Me gustaría...',
        expectedResponses: ['me gustaría', 'me gustaria', 'quisiera'],
        hints: ['More polite than "quiero"'],
        aiContext: 'Me gustaría is more polite than quiero.',
      }),
      createPrompt('p4', 'Say "Can you help me?" in Spanish', {
        targetPhrase: '¿Puede ayudarme?',
        expectedResponses: ['puede ayudarme', 'puedes ayudarme', 'me puede ayudar'],
        hints: ['Ayudar = to help'],
        aiContext: 'Useful phrase when you need assistance.',
      }),
    ], {
      description: 'Learn to express what you want and need',
      xpReward: 20,
      estimatedMinutes: 6,
    }),
  ],
  {
    description: 'Learn essential everyday phrases',
    requiredXP: 65, // Must complete Units 1 & 2
    icon: '💬',
  }
);

// ============================================
// UNIT 4: Food & Restaurants
// ============================================

const unit4Food: Unit = createUnit(
  'es-food',
  'Food & Dining',
  [
    // Lesson 1: At the Restaurant
    createLesson('es-food-restaurant', 'es-food', 'At the Restaurant', [
      createPrompt('p1', 'Say "A table for two, please" in Spanish', {
        targetPhrase: 'Una mesa para dos, por favor',
        expectedResponses: ['una mesa para dos por favor', 'mesa para dos'],
        aiContext: 'How to request a table at a restaurant.',
      }),
      createPrompt('p2', 'Say "The menu, please" in Spanish', {
        targetPhrase: 'El menú, por favor',
        expectedResponses: ['el menú por favor', 'el menu por favor', 'la carta por favor'],
        hints: ['Menú or carta both work'],
        aiContext: 'How to ask for the menu.',
      }),
      createPrompt('p3', 'Say "The check, please" in Spanish', {
        targetPhrase: 'La cuenta, por favor',
        expectedResponses: ['la cuenta por favor'],
        hints: ['Cuenta = bill/check'],
        aiContext: 'How to ask for the check.',
      }),
    ], {
      description: 'Navigate restaurants with confidence',
      xpReward: 20,
      estimatedMinutes: 5,
    }),

    // Lesson 2: Ordering Food
    createLesson('es-food-ordering', 'es-food', 'Ordering Food', [
      createPrompt('p1', 'Say "I would like to order..." in Spanish', {
        targetPhrase: 'Quisiera pedir...',
        expectedResponses: ['quisiera pedir', 'me gustaría pedir', 'quiero pedir'],
        aiContext: 'Polite way to start ordering food.',
      }),
      createPrompt('p2', 'Say "Water, please" in Spanish', {
        targetPhrase: 'Agua, por favor',
        expectedResponses: ['agua por favor'],
        aiContext: 'How to order water.',
      }),
      createPrompt('p3', 'Say "Is it spicy?" in Spanish', {
        targetPhrase: '¿Es picante?',
        expectedResponses: ['es picante'],
        hints: ['Picante = spicy'],
        aiContext: 'Ask if something is spicy.',
      }),
      createPrompt('p4', 'Say "It was delicious!" in Spanish', {
        targetPhrase: '¡Estuvo delicioso!',
        expectedResponses: ['estuvo delicioso', 'estaba delicioso', 'muy rico'],
        hints: ['Compliment the food!'],
        aiContext: 'How to compliment the food.',
      }),
    ], {
      description: 'Order food like a local',
      xpReward: 20,
      estimatedMinutes: 6,
    }),
  ],
  {
    description: 'Master dining out in Spanish',
    requiredXP: 105, // Must complete previous units
    icon: '🍽️',
  }
);

// ============================================
// UNIT 5: Directions & Transportation
// ============================================

const unit5Directions: Unit = createUnit(
  'es-directions',
  'Getting Around',
  [
    // Lesson 1: Asking for Directions
    createLesson('es-directions-asking', 'es-directions', 'Asking Directions', [
      createPrompt('p1', 'Ask "Where is the bathroom?" in Spanish', {
        targetPhrase: '¿Dónde está el baño?',
        expectedResponses: ['dónde está el baño', 'donde esta el baño'],
        hints: ['Essential phrase!'],
        aiContext: 'One of the most important phrases to know.',
      }),
      createPrompt('p2', 'Ask "How do I get to...?" in Spanish', {
        targetPhrase: '¿Cómo llego a...?',
        expectedResponses: ['cómo llego a', 'como llego a'],
        hints: ['Llegar = to arrive/get to'],
        aiContext: 'How to ask for directions to a place.',
      }),
      createPrompt('p3', 'Say "Turn right" in Spanish', {
        targetPhrase: 'Gire a la derecha',
        expectedResponses: ['gire a la derecha', 'doble a la derecha', 'a la derecha'],
        hints: ['Derecha = right'],
        aiContext: 'Direction: turn right.',
      }),
      createPrompt('p4', 'Say "Turn left" in Spanish', {
        targetPhrase: 'Gire a la izquierda',
        expectedResponses: ['gire a la izquierda', 'doble a la izquierda', 'a la izquierda'],
        hints: ['Izquierda = left'],
        aiContext: 'Direction: turn left.',
      }),
      createPrompt('p5', 'Say "Go straight" in Spanish', {
        targetPhrase: 'Siga derecho',
        expectedResponses: ['siga derecho', 'vaya derecho', 'todo recto'],
        hints: ['Derecho (straight) ≠ derecha (right)'],
        aiContext: 'Direction: go straight.',
      }),
    ], {
      description: 'Learn to ask for and understand directions',
      xpReward: 25,
      estimatedMinutes: 7,
    }),
  ],
  {
    description: 'Navigate any city with confidence',
    requiredXP: 145,
    icon: '🗺️',
  }
);

// ============================================
// Register the Spanish curriculum
// ============================================

const SPANISH_CURRICULUM: Unit[] = [
  unit1Basics,
  unit2Numbers,
  unit3Phrases,
  unit4Food,
  unit5Directions,
];

registerCurriculum('es', SPANISH_CURRICULUM);

export default SPANISH_CURRICULUM;
