import type { VocabItem, WordType } from './types';

/**
 * Checks if a character is a hiragana or katakana character
 */
export function isKana(char: string): boolean {
  const code = char.charCodeAt(0);
  // Hiragana: U+3040 to U+309F
  // Katakana: U+30A0 to U+30FF
  return (code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff);
}

/**
 * Checks if a string ends with a kana character
 */
export function endsWithKana(text: string): boolean {
  if (!text || text.length === 0) return false;
  const lastChar = text[text.length - 1];
  return isKana(lastChar);
}

const VALID_VERB_ENDINGS = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'る'];

/**
 * Validates if a word has a valid ending for its type
 */
function isValidEnding(word: string, type: WordType): boolean {
  if (word.length < 1) return false;
  const lastChar = word[word.length - 1];

  if (type === 'verb') {
    // For verbs, we allow standard verb endings OR nouns (assuming suru-nouns)
    // as per user request: "it's the user's responsibility for now that they're suru-nouns specfically"
    return true; 
  } else if (type === 'adjective') {
    return lastChar === 'い';
  }
  return false;
}

/**
 * Determines if a verb ending in る is likely ichidan or godan
 * Simple heuristic: if the character before る is an "i" or "e" sound, it's likely ichidan
 */
function guessVerbType(word: string): 'ichidan' | 'godan' {
  if (word.length < 2 || !word.endsWith('る')) {
    return 'godan';
  }

  const beforeRu = word[word.length - 2];
  // Ichidan verbs typically end in -いる or -える
  const ichibanEndings = ['い', 'き', 'ぎ', 'し', 'じ', 'ち', 'に', 'ひ', 'び', 'ぴ', 'み', 'り',
                           'え', 'け', 'げ', 'せ', 'ぜ', 'て', 'で', 'ね', 'へ', 'べ', 'ぺ', 'め', 'れ'];

  return ichibanEndings.includes(beforeRu) ? 'ichidan' : 'godan';
}

/**
 * Parses manual vocabulary input and validates that each word ends with kana
 * Returns array of VocabItem or error messages
 */
export function parseManualVocabulary(input: string, type: WordType = 'verb'): { success: true; items: VocabItem[] } | { success: false; errors: string[] } {
  const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    return { success: false, errors: ['No vocabulary items provided'] };
  }

  const items: VocabItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isValidEnding(line, type)) {
      if (type === 'verb') {
        errors.push(`"${line}" does not end with a valid verb kana (${VALID_VERB_ENDINGS.join(', ')})`);
      } else {
        errors.push(`"${line}" does not end with "い" (required for i-adjectives)`);
      }
      continue;
    }

    let verbType: 'ichidan' | 'godan' | undefined = undefined;
    if (type === 'verb') {
      verbType = guessVerbType(line);
    }

    items.push({
      word: line,
      reading: null,
      url: '',
      meanings: {
        'Manual Entry': [`Manually added ${type}`]
      },
      type,
      verbType
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, items };
}
