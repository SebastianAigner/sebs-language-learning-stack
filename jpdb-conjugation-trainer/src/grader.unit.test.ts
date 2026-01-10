import { describe, it, expect, vi } from 'vitest';
import { gradeAnswerStreaming } from './grader';
import { OpenRouter } from '@openrouter/sdk';

vi.mock('@openrouter/sdk', () => {
  const OpenRouterMock = vi.fn();
  (OpenRouterMock as any).prototype.chat = {
    send: vi.fn()
  };
  return {
    OpenRouter: OpenRouterMock
  };
});

describe('Grader Override Logic', () => {
  it('should override LLM assessment if user answer exactly matches correct answer', async () => {
    const mockSend = vi.fn().mockImplementation(async () => {
      const content = '```json\n{\n  "correct": false,\n  "correctAnswer": "よしそうです",\n  "reading": "よしそうです",\n  "explanation": "Incorrect"\n}\n```';
      
      // Simulate streaming response
      return {
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{
              delta: {
                content: content
              }
            }]
          };
        }
      };
    });

    const mockOpenRouter = vi.mocked(OpenRouter);
    (mockOpenRouter.prototype as any).chat = {
      send: mockSend
    };

    const result = await gradeAnswerStreaming(
      'よしそう',
      'non-past-affirmative-polite' as any,
      'よしそうです',
      'i-adjective',
      'fake-api-key',
      'fake-model',
      {}
    );

    // Should be correct because userAnswer === correctAnswer, even though LLM said false
    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe('よしそうです');
    expect(result.userAnswer).toBe('よしそうです');
  });

  it('should respect LLM assessment when answers do not match', async () => {
    const mockSend = vi.fn().mockImplementation(async () => {
      const content = '```json\n{\n  "correct": false,\n  "correctAnswer": "よしそうです",\n  "reading": "よしそうです",\n  "explanation": "Incorrect"\n}\n```';
      
      return {
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{
              delta: {
                content: content
              }
            }]
          };
        }
      };
    });

    const mockOpenRouter = vi.mocked(OpenRouter);
    (mockOpenRouter.prototype as any).chat = {
      send: mockSend
    };

    const result = await gradeAnswerStreaming(
      'よしそう',
      'non-past-affirmative-polite' as any,
      'wrong answer',
      'i-adjective',
      'fake-api-key',
      'fake-model',
      {}
    );

    expect(result.isCorrect).toBe(false);
  });
});
