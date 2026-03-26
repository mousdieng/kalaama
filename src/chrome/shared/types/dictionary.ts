/**
 * Dictionary Types
 *
 * German-French dictionary for Kalaama language learning
 */

export interface DictionaryWord {
  id: string;
  word: string;
  article?: 'der' | 'die' | 'das';
  gender?: 'm' | 'f' | 'n';
  part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' |
                  'conjunction' | 'pronoun' | 'article' | 'interjection';
  difficulty_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  french_translation: string;
  french_definition: string;
  french_explanation?: string;
  pronunciation_ipa?: string;
  context_usage?: string;

  examples: DictionaryExample[];
  synonyms: string[];
  antonyms: string[];
  collocations: Collocation[];

  plural_form?: string;        // For nouns (e.g., "Häuser")
  conjugation_hint?: string;   // For verbs (e.g., "ich lerne, du lernst, er lernt")
  frequency_rank?: number;     // Word frequency (1=most common)

  created_at: string;
  updated_at: string;
}

export interface DictionaryExample {
  german: string;
  french: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface Collocation {
  phrase: string;              // German phrase (e.g., "nach Hause gehen")
  french: string;              // French translation (e.g., "rentrer à la maison")
}

export interface MissingWord {
  id: string;
  word: string;
  user_id: string;
  video_id?: string;
  video_title?: string;
  context_sentence?: string;
  language: string;
  click_count: number;
  first_clicked_at: string;
  last_clicked_at: string;
  status: 'pending' | 'added' | 'rejected';
  created_at: string;
}

/**
 * Input type for adding words to dictionary (omits auto-generated fields)
 */
export interface DictionaryWordInput {
  word: string;
  article?: 'der' | 'die' | 'das';
  gender?: 'm' | 'f' | 'n';
  part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' |
                  'conjunction' | 'pronoun' | 'article' | 'interjection';
  difficulty_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  french_translation: string;
  french_definition: string;
  french_explanation?: string;
  pronunciation_ipa?: string;
  context_usage?: string;

  examples: DictionaryExample[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocation[];

  plural_form?: string;
  conjugation_hint?: string;
  frequency_rank?: number;
}
