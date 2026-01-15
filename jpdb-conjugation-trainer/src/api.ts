import type { VocabItem, ApiResponse, VocabContent, ReviewMode } from './types';

export async function fetchTodayVocabulary(apiBaseUrl: string): Promise<VocabItem[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/today/unique`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json() as ApiResponse;

    // Parse and filter verb and adjective entries
    const items: VocabItem[] = [];

    for (const entry of data.entries) {
      if (entry.content === '') {
        console.warn('Skipping entry with empty content:', entry);
        continue;
      }

      let content: VocabContent;
      try {
        content = JSON.parse(entry.content) as VocabContent;
      } catch (error) {
        console.warn('Failed to parse entry content:', entry, error);
        continue;
      }

      // Check if any of the meanings keys indicates this is a verb or i-adjective
      const meaningKeys = Object.keys(content.meanings);
      let type: 'verb' | 'adjective' | null = null;
      let verbType: 'ichidan' | 'godan' | undefined = undefined;

      for (const key of meaningKeys) {
        if (key.includes('Verb (1-dan')) {
          type = 'verb';
          verbType = 'ichidan';
          break;
        } else if (key.includes('Verb (5-dan')) {
          type = 'verb';
          verbType = 'godan';
          break;
        } else if (key.includes('Verb (する)')) {
          type = 'verb';
          break;
        } else if (key.includes('Verb (irregular)')) {
          type = 'verb';
          break;
        } else if (key.includes('Adjective (い)')) {
          type = 'adjective';
          break;
        }
      }

      if (type !== null) {
        items.push({
          ...content,
          type,
          verbType
        } as VocabItem);
      }
    }

    return items;
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    throw error;
  }
}

export async function fetchAndFilterVocabulary(apiBaseUrl: string): Promise<VocabItem[]> {
  return fetchTodayVocabulary(apiBaseUrl);
}

/**
 * Filters vocabulary items based on the selected review mode
 */
export function filterVocabularyByMode(items: VocabItem[], mode: ReviewMode): VocabItem[] {
  if (mode === 'verbs') {
    return items.filter(item => item.type === 'verb');
  } else if (mode === 'adjectives') {
    return items.filter(item => item.type === 'adjective');
  }
  return items;
}

// Keep the old name for backward compatibility during transition if needed
export const fetchAndFilterVerbs = fetchAndFilterVocabulary;
