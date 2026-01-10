import { describe, it, expect, beforeAll } from 'vitest';
import { gradeAnswerStreaming } from './grader';
import { readFileSync } from 'fs';

describe('OpenRouter Integration', () => {
  let apiKey: string;

  beforeAll(() => {
    try {
      apiKey = readFileSync('openrouter.txt', 'utf-8').trim();
    } catch (error) {
      console.warn('Warning: openrouter.txt not found. Integration tests will be skipped.');
    }
  });

  it('should grade a correct answer with star emoji', async () => {
    if (!apiKey) {
      console.log('Skipping test: no API key');
      return;
    }

    const result = await gradeAnswerStreaming(
      '食べる',
      'non-past-affirmative-casual',
      '食べる',
      'verb',
      apiKey,
      'x-ai/grok-4',
      {}
    );

    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe('食べる');
  }, 30000);

  it('should grade an incorrect answer with sparkle emoji', async () => {
    if (!apiKey) {
      console.log('Skipping test: no API key');
      return;
    }

    const result = await gradeAnswerStreaming(
      '食べる',
      'non-past-affirmative-casual',
      'wrong answer',
      'verb',
      apiKey,
      'x-ai/grok-4',
      {}
    );

    expect(result.isCorrect).toBe(false);
    expect(result.explanation).toBeDefined();
  }, 30000);

  it('should handle API errors gracefully', async () => {
    const invalidApiKey = 'invalid-key';

    await expect(
      gradeAnswerStreaming(
        '食べる',
        'non-past-affirmative-casual',
        '食べる',
        'verb',
        invalidApiKey,
        'x-ai/grok-4',
        {}
      )
    ).rejects.toThrow();
  }, 30000);
});
