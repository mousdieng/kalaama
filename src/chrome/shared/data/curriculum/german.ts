/**
 * German curriculum for French-speaking learners
 * Theme-based conversation units with vocabulary, phrases, and roleplay
 */

import type { ConversationUnit, VocabularyItem, PhrasePattern, RoleplayConfig } from '../../types/messages';

// Helper to create vocabulary items
function vocab(
  id: string,
  word: string,
  translation: string,
  exampleSentence: string,
  pronunciation?: string
): VocabularyItem {
  return { id, word, translation, exampleSentence, pronunciation };
}

// Helper to create phrase patterns
function phrase(
  id: string,
  pattern: string,
  translation: string,
  vocabSlots: string[],
  hint?: string
): PhrasePattern {
  return { id, pattern, translation, vocabSlots, hint };
}

// ============================================
// Unit 1: Grundlagen (Basics)
// ============================================
const BASICS_UNIT: ConversationUnit = {
  id: 'de-basics',
  title: 'Grundlagen',
  titleNative: 'Les bases',
  theme: 'Salutations et expressions de base',
  icon: '👋',
  requiredXP: 0,
  xpReward: 50,
  vocabulary: [
    vocab('v1', 'Guten Tag', 'Bonjour', 'Guten Tag, wie geht es Ihnen?', 'GOO-ten tahk'),
    vocab('v2', 'Auf Wiedersehen', 'Au revoir', 'Auf Wiedersehen, bis morgen!', 'owf VEE-der-zay-en'),
    vocab('v3', 'Danke', 'Merci', 'Danke schön!', 'DAHN-keh'),
    vocab('v4', 'Bitte', 'S\'il vous plaît / De rien', 'Bitte schön!', 'BIT-teh'),
    vocab('v5', 'Ja', 'Oui', 'Ja, natürlich!', 'yah'),
    vocab('v6', 'Nein', 'Non', 'Nein, danke.', 'nine'),
    vocab('v7', 'Entschuldigung', 'Excusez-moi', 'Entschuldigung, wo ist...?', 'ent-SHOOL-di-goong'),
    vocab('v8', 'Ich verstehe', 'Je comprends', 'Ich verstehe nicht.', 'ikh fer-SHTAY-eh'),
  ],
  phrasePatterns: [
    phrase('p1', 'Guten Tag, ich heiße ___', 'Bonjour, je m\'appelle ___', ['v1'], 'Présentez-vous'),
    phrase('p2', '___, wie geht es Ihnen?', '___, comment allez-vous?', ['v1', 'v7'], 'Demandez comment ça va'),
    phrase('p3', '___ schön!', '___ beaucoup!', ['v3', 'v4'], 'Remerciez poliment'),
    phrase('p4', 'Ich verstehe ___.', 'Je comprends ___.', ['v5', 'v6'], 'Confirmez ou niez'),
  ],
  roleplayScenario: {
    aiCharacter: 'Un passant allemand',
    scenario: 'Vous rencontrez quelqu\'un dans la rue en Allemagne. Saluez-le, présentez-vous et ayez une courte conversation polie.',
    openingLine: 'Guten Tag! Wie geht es Ihnen heute?',
    targetVocabUsage: 70,
    maxTurns: 6,
  },
};

// ============================================
// Unit 2: Im Restaurant
// ============================================
const RESTAURANT_UNIT: ConversationUnit = {
  id: 'de-restaurant',
  title: 'Im Restaurant',
  titleNative: 'Au restaurant',
  theme: 'Commander au restaurant en allemand',
  icon: '🍽️',
  requiredXP: 50,
  xpReward: 75,
  vocabulary: [
    vocab('v1', 'die Speisekarte', 'le menu', 'Kann ich die Speisekarte haben?', 'dee SHPY-zeh-kar-teh'),
    vocab('v2', 'bestellen', 'commander', 'Ich möchte bestellen.', 'beh-SHTEL-en'),
    vocab('v3', 'das Wasser', 'l\'eau', 'Ein Wasser, bitte.', 'dahs VAH-ser'),
    vocab('v4', 'der Wein', 'le vin', 'Ein Glas Wein, bitte.', 'dehr vine'),
    vocab('v5', 'das Bier', 'la bière', 'Ein Bier, bitte.', 'dahs beer'),
    vocab('v6', 'die Rechnung', 'l\'addition', 'Die Rechnung, bitte.', 'dee REKH-noong'),
    vocab('v7', 'das Hauptgericht', 'le plat principal', 'Was ist das Hauptgericht?', 'dahs HOWPT-geh-rikht'),
    vocab('v8', 'die Vorspeise', 'l\'entrée', 'Als Vorspeise nehme ich...', 'dee FOR-shpy-zeh'),
    vocab('v9', 'der Nachtisch', 'le dessert', 'Haben Sie Nachtisch?', 'dehr NAHKH-tish'),
    vocab('v10', 'lecker', 'délicieux', 'Das war sehr lecker!', 'LEK-er'),
  ],
  phrasePatterns: [
    phrase('p1', 'Kann ich ___ haben?', 'Puis-je avoir ___ ?', ['v1', 'v3', 'v4', 'v5', 'v6'], 'Pour demander quelque chose'),
    phrase('p2', 'Ich möchte ___ bestellen.', 'Je voudrais commander ___.', ['v7', 'v8', 'v9'], 'Pour commander'),
    phrase('p3', 'Ein ___, bitte.', 'Un/Une ___, s\'il vous plaît.', ['v3', 'v4', 'v5'], 'Commande simple'),
    phrase('p4', 'Das war sehr ___!', 'C\'était très ___ !', ['v10'], 'Pour complimenter'),
  ],
  roleplayScenario: {
    aiCharacter: 'Serveur allemand',
    scenario: 'Vous êtes dans un restaurant allemand. Commandez une boisson, un plat principal, et demandez l\'addition à la fin.',
    openingLine: 'Guten Abend! Willkommen in unserem Restaurant. Haben Sie schon gewählt, oder möchten Sie die Speisekarte?',
    targetVocabUsage: 80,
    maxTurns: 8,
  },
};

// ============================================
// Unit 3: Einkaufen (Shopping)
// ============================================
const SHOPPING_UNIT: ConversationUnit = {
  id: 'de-shopping',
  title: 'Einkaufen',
  titleNative: 'Faire les courses',
  theme: 'Faire des achats en allemand',
  icon: '🛒',
  requiredXP: 125,
  xpReward: 75,
  vocabulary: [
    vocab('v1', 'der Laden', 'le magasin', 'Der Laden ist um die Ecke.', 'dehr LAH-den'),
    vocab('v2', 'der Preis', 'le prix', 'Was ist der Preis?', 'dehr price'),
    vocab('v3', 'teuer', 'cher', 'Das ist zu teuer.', 'TOY-er'),
    vocab('v4', 'billig', 'bon marché', 'Das ist sehr billig!', 'BIL-ikh'),
    vocab('v5', 'die Größe', 'la taille', 'Welche Größe haben Sie?', 'dee GRUH-seh'),
    vocab('v6', 'anprobieren', 'essayer', 'Kann ich das anprobieren?', 'AHN-pro-beer-en'),
    vocab('v7', 'bezahlen', 'payer', 'Wo kann ich bezahlen?', 'beh-TSAH-len'),
    vocab('v8', 'die Kasse', 'la caisse', 'Die Kasse ist dort drüben.', 'dee KAH-seh'),
    vocab('v9', 'bar', 'en espèces', 'Ich zahle bar.', 'bar'),
    vocab('v10', 'die Karte', 'la carte', 'Kann ich mit Karte zahlen?', 'dee KAR-teh'),
  ],
  phrasePatterns: [
    phrase('p1', 'Was ist ___?', 'Quel est ___ ?', ['v2', 'v5'], 'Pour demander des informations'),
    phrase('p2', 'Kann ich ___ ?', 'Puis-je ___ ?', ['v6', 'v7'], 'Pour demander permission'),
    phrase('p3', 'Das ist zu ___.', 'C\'est trop ___.', ['v3', 'v4'], 'Pour donner votre opinion'),
    phrase('p4', 'Ich zahle mit ___.', 'Je paie par ___.', ['v9', 'v10'], 'Pour le paiement'),
  ],
  roleplayScenario: {
    aiCharacter: 'Vendeur dans un magasin',
    scenario: 'Vous êtes dans un magasin de vêtements en Allemagne. Demandez la taille, le prix, et payez votre achat.',
    openingLine: 'Guten Tag! Kann ich Ihnen helfen? Suchen Sie etwas Bestimmtes?',
    targetVocabUsage: 75,
    maxTurns: 8,
  },
};

// ============================================
// Unit 4: Reisen (Travel)
// ============================================
const TRAVEL_UNIT: ConversationUnit = {
  id: 'de-travel',
  title: 'Reisen',
  titleNative: 'Voyager',
  theme: 'Vocabulaire de voyage en allemand',
  icon: '✈️',
  requiredXP: 200,
  xpReward: 100,
  vocabulary: [
    vocab('v1', 'der Bahnhof', 'la gare', 'Wo ist der Bahnhof?', 'dehr BAHN-hof'),
    vocab('v2', 'der Flughafen', 'l\'aéroport', 'Zum Flughafen, bitte.', 'dehr FLOOK-hah-fen'),
    vocab('v3', 'die Fahrkarte', 'le billet', 'Eine Fahrkarte nach Berlin, bitte.', 'dee FAR-kar-teh'),
    vocab('v4', 'der Zug', 'le train', 'Wann fährt der Zug?', 'dehr tsook'),
    vocab('v5', 'das Hotel', 'l\'hôtel', 'Ich suche ein Hotel.', 'dahs ho-TEL'),
    vocab('v6', 'das Zimmer', 'la chambre', 'Haben Sie ein Zimmer frei?', 'dahs TSIM-er'),
    vocab('v7', 'links', 'à gauche', 'Gehen Sie links.', 'links'),
    vocab('v8', 'rechts', 'à droite', 'Biegen Sie rechts ab.', 'rekhts'),
    vocab('v9', 'geradeaus', 'tout droit', 'Gehen Sie geradeaus.', 'geh-RAH-deh-ows'),
    vocab('v10', 'die Straße', 'la rue', 'Welche Straße ist das?', 'dee SHTRAH-seh'),
  ],
  phrasePatterns: [
    phrase('p1', 'Wo ist ___?', 'Où est ___ ?', ['v1', 'v2', 'v5'], 'Pour demander un lieu'),
    phrase('p2', 'Eine ___ nach ___, bitte.', 'Un ___ pour ___, s\'il vous plaît.', ['v3'], 'Pour acheter un billet'),
    phrase('p3', 'Gehen Sie ___.', 'Allez ___.', ['v7', 'v8', 'v9'], 'Pour donner des directions'),
    phrase('p4', 'Haben Sie ___ frei?', 'Avez-vous ___ de libre ?', ['v6'], 'Pour demander la disponibilité'),
  ],
  roleplayScenario: {
    aiCharacter: 'Réceptionniste d\'hôtel',
    scenario: 'Vous arrivez dans un hôtel en Allemagne. Demandez une chambre, renseignez-vous sur les services et demandez des directions.',
    openingLine: 'Guten Tag! Willkommen im Hotel. Wie kann ich Ihnen helfen?',
    targetVocabUsage: 80,
    maxTurns: 10,
  },
};

// ============================================
// Unit 5: Alltag (Daily Life)
// ============================================
const DAILY_LIFE_UNIT: ConversationUnit = {
  id: 'de-daily',
  title: 'Alltag',
  titleNative: 'Vie quotidienne',
  theme: 'Conversations de la vie quotidienne',
  icon: '🏠',
  requiredXP: 300,
  xpReward: 100,
  vocabulary: [
    vocab('v1', 'die Zeit', 'l\'heure / le temps', 'Wie viel Uhr ist es?', 'dee tsyte'),
    vocab('v2', 'heute', 'aujourd\'hui', 'Was machen Sie heute?', 'HOY-teh'),
    vocab('v3', 'morgen', 'demain', 'Bis morgen!', 'MOR-gen'),
    vocab('v4', 'das Wetter', 'le temps (météo)', 'Wie ist das Wetter?', 'dahs VET-er'),
    vocab('v5', 'der Termin', 'le rendez-vous', 'Ich habe einen Termin.', 'dehr ter-MEEN'),
    vocab('v6', 'arbeiten', 'travailler', 'Ich arbeite von 9 bis 5.', 'AR-by-ten'),
    vocab('v7', 'die Familie', 'la famille', 'Meine Familie wohnt in Berlin.', 'dee fa-MEE-lee-eh'),
    vocab('v8', 'wohnen', 'habiter', 'Wo wohnen Sie?', 'VOH-nen'),
    vocab('v9', 'sprechen', 'parler', 'Sprechen Sie Deutsch?', 'SHPREKH-en'),
    vocab('v10', 'lernen', 'apprendre', 'Ich lerne Deutsch.', 'LER-nen'),
  ],
  phrasePatterns: [
    phrase('p1', 'Wie ist ___?', 'Comment est ___ ?', ['v4', 'v1'], 'Pour demander l\'état de quelque chose'),
    phrase('p2', 'Ich ___ heute.', 'Je ___ aujourd\'hui.', ['v6', 'v9', 'v10'], 'Pour décrire vos activités'),
    phrase('p3', 'Wo ___ Sie?', 'Où ___ -vous ?', ['v8', 'v6'], 'Pour poser des questions personnelles'),
    phrase('p4', 'Meine ___ ist...', 'Ma ___ est...', ['v7'], 'Pour parler de votre famille'),
  ],
  roleplayScenario: {
    aiCharacter: 'Un collègue allemand',
    scenario: 'Vous discutez avec un collègue au bureau. Parlez de votre journée, du temps qu\'il fait et de vos projets.',
    openingLine: 'Guten Morgen! Wie geht es Ihnen heute? Das Wetter ist schön, nicht wahr?',
    targetVocabUsage: 80,
    maxTurns: 10,
  },
};

// ============================================
// Export the complete German curriculum
// ============================================
export const GERMAN_CURRICULUM: ConversationUnit[] = [
  BASICS_UNIT,
  RESTAURANT_UNIT,
  SHOPPING_UNIT,
  TRAVEL_UNIT,
  DAILY_LIFE_UNIT,
];

/**
 * Get the German curriculum
 */
export function getGermanCurriculum(): ConversationUnit[] {
  return GERMAN_CURRICULUM;
}

/**
 * Get a specific unit by ID
 */
export function getGermanUnit(unitId: string): ConversationUnit | undefined {
  return GERMAN_CURRICULUM.find(unit => unit.id === unitId);
}

/**
 * Get units that the user has unlocked based on XP
 */
export function getUnlockedGermanUnits(userXP: number): ConversationUnit[] {
  return GERMAN_CURRICULUM.filter(unit => userXP >= unit.requiredXP);
}
