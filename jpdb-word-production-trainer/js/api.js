// Service communication and deduplication logic

import { CONFIG } from './config.js';
import { stripKana } from './utils.js';

// Fetch vocabulary reviewed today from the service
export async function fetchReviewedToday(baseUrl) {
  const endpoint = `${baseUrl}${CONFIG.REVIEWED_TODAY_ENDPOINT}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw data from service:', data);

    // Extract entries array from jpdb-review-transcriber format
    let rawEntries = [];
    if (data.entries && Array.isArray(data.entries)) {
      rawEntries = data.entries;
    } else if (Array.isArray(data)) {
      rawEntries = data;
    } else {
      console.warn('Unexpected response format:', data);
      rawEntries = [];
    }

    console.log(`Fetched ${rawEntries.length} raw entries from service`);

    // Parse the nested JSON content for each entry
    const items = [];
    for (const entry of rawEntries) {
      try {
        // Parse the content field (it's a JSON string)
        const content = typeof entry.content === 'string'
          ? JSON.parse(entry.content)
          : entry.content;

        // Transform to our expected format
        items.push({
          timestamp: entry.timestamp,
          word: content.word,
          reading: content.reading,
          meanings: content.meanings,
          url: content.url
        });
      } catch (error) {
        console.error('Failed to parse entry:', entry, error);
      }
    }

    console.log(`Parsed ${items.length} items before deduplication`);

    // Deduplicate before returning
    const deduplicated = deduplicateVocabulary(items);
    console.log(`${deduplicated.length} items after deduplication`);

    return deduplicated;

  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    throw new Error(
      `Cannot reach vocabulary service at ${endpoint}.\n` +
      `Error: ${error.message}\n\n` +
      `Please check that:\n` +
      `1. The service is running at ${baseUrl}\n` +
      `2. CORS is properly configured\n` +
      `3. The endpoint path is correct`
    );
  }
}

// Fetch public TTS defaults from the TTS service
export async function fetchTTSDefaults(ttsBaseUrl) {
  const endpoint = `${ttsBaseUrl.replace(/\/$/, '')}/api/config`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const defaultPrefixText = typeof data.defaultPrefixText === 'string'
      ? data.defaultPrefixText
      : data.defaultPreviousText;

    return {
      defaultPreviousText: typeof defaultPrefixText === 'string'
        ? defaultPrefixText
        : CONFIG.DEFAULT_TTS_PREFIX_TEXT,
      defaultSuffixText: typeof data.defaultSuffixText === 'string'
        ? data.defaultSuffixText
        : CONFIG.DEFAULT_TTS_SUFFIX_TEXT
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Deduplicate vocabulary items by ID or Japanese text
export function deduplicateVocabulary(items) {
  const seen = new Map();

  for (const item of items) {
    // Use word as the primary deduplication key
    const key = item.word || item.vocabularyId || item.vid || item.id || item.japaneseText || item.japanese || item.spelling;

    if (!key) {
      console.warn('Item has no identifiable key, skipping:', item);
      continue;
    }

    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      // If we've seen this item before, keep the most recent one
      const existing = seen.get(key);
      const itemTimestamp = new Date(item.timestamp || item.reviewedAt || item.date || 0).getTime();
      const existingTimestamp = new Date(existing.timestamp || existing.reviewedAt || existing.date || 0).getTime();

      if (itemTimestamp > existingTimestamp) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}

// Normalize data format from service to internal format
export function normalizeVocabItem(item) {
  // Parse meanings from object with parts of speech as keys
  // Example: { "Noun": ["soldier; combatant; warrior"], "Verb": [...] }
  let englishDef = '';

  if (item.meanings && typeof item.meanings === 'object') {
    const parts = [];
    for (const [partOfSpeech, meaningsList] of Object.entries(item.meanings)) {
      if (Array.isArray(meaningsList) && meaningsList.length > 0) {
        // Strip kana from meanings but keep part of speech intact
        const strippedMeanings = meaningsList.map(m => stripKana(m)).join(', ');
        // Format: "Noun: soldier; combatant; warrior" (kana preserved in "Noun", stripped from meanings)
        parts.push(`${partOfSpeech}: ${strippedMeanings}`);
      }
    }
    englishDef = parts.join('\n');
  }

  return {
    // Preserve original data
    ...item,

    // Normalized fields for consistency
    vocabularyId: item.word || item.vocabularyId || item.vid || item.id,
    japaneseText: item.word || item.japaneseText || item.japanese || item.spelling,
    englishDefinition: englishDef,
    reviewedAt: item.timestamp || item.reviewedAt || item.date || Date.now()
  };
}

// Helper function to discover available endpoints (for development)
export async function discoverEndpoints(baseUrl) {
  try {
    const response = await fetch(baseUrl);
    const data = await response.json();
    console.log('Available endpoints from root:', data);
    return data;
  } catch (error) {
    console.error('Failed to discover endpoints:', error);
    throw error;
  }
}
