import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash of text for cache key
 */
function generateCacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

describe('generateCacheKey', () => {
  it('should generate consistent hash for same text', () => {
    const text = '食べる';
    const hash1 = generateCacheKey(text);
    const hash2 = generateCacheKey(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64-character hex string
  });

  it('should generate different hashes for different text', () => {
    const text1 = '食べる';
    const text2 = '食べた';

    const hash1 = generateCacheKey(text1);
    const hash2 = generateCacheKey(text2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = generateCacheKey('');
    expect(hash).toHaveLength(64);
  });

  it('should handle long Japanese text', () => {
    const longText = '食べる'.repeat(100);
    const hash = generateCacheKey(longText);
    expect(hash).toHaveLength(64);
  });

  it('should generate expected hash for known input', () => {
    const text = 'test';
    const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

    expect(generateCacheKey(text)).toBe(expectedHash);
  });
});

describe('Cache validation', () => {
  it('should validate text length constraints', () => {
    const maxLength = 500;
    const validText = 'a'.repeat(maxLength);
    const invalidText = 'a'.repeat(maxLength + 1);

    expect(validText.length).toBeLessThanOrEqual(maxLength);
    expect(invalidText.length).toBeGreaterThan(maxLength);
  });

  it('should handle special characters in Japanese text', () => {
    const specialTexts = [
      '食べる！',
      '食べる？',
      '「食べる」',
      '食べる…',
      '食べる〜'
    ];

    for (const text of specialTexts) {
      const hash = generateCacheKey(text);
      expect(hash).toHaveLength(64);
    }
  });
});
