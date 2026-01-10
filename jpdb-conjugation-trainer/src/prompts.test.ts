import { describe, it, expect } from 'vitest';
import { getGradingPrompt } from './prompts';

describe('getGradingPrompt', () => {
  it('should generate a prompt with the correct verb, label, and answer', () => {
    const dictionaryForm = '食べる';
    const targetLabel = 'past casual';
    const userAnswer = '食べた';
    
    const prompt = getGradingPrompt(dictionaryForm, targetLabel, userAnswer, 'verb');
    
    expect(prompt).toContain('conjugate the verb "食べる" into past casual');
    expect(prompt).toContain('Here is my reply: "食べた"');
    expect(prompt).toContain('"correct": true or false');
  });
});
