import { describe, it, expect, vi } from 'vitest';
import { gradeAnswerStreaming } from './grader';
import { OpenRouter } from '@openrouter/sdk';
import type { ConjugationType } from './types';

interface MockOpenRouter {
  chat: {
    send: ReturnType<typeof vi.fn>;
  };
}

vi.mock('@openrouter/sdk', () => {
  const OpenRouterMock = vi.fn() as unknown as { new(): MockOpenRouter; prototype: MockOpenRouter };
  OpenRouterMock.prototype.chat = {
    send: vi.fn()
  };
  return {
    OpenRouter: OpenRouterMock
  };
});

describe('Grader Override Logic', () => {
  it('should override LLM assessment if user answer exactly matches correct answer', async () => {
    const mockSend = vi.fn().mockImplementation(() => {
      const content = '```json\n{\n  "correct": false,\n  "correctAnswer": "よしそうです",\n  "reading": "よしそうです",\n  "explanation": "Incorrect"\n}\n```';

      // Simulate streaming response
      return {
        *[Symbol.asyncIterator]() {
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

    const mockOpenRouter = vi.mocked(OpenRouter) as unknown as { prototype: MockOpenRouter };
    mockOpenRouter.prototype.chat = {
      send: mockSend
    };

    const targetForm: ConjugationType = 'non-past-affirmative-polite';
    const result = await gradeAnswerStreaming(
      'よしそう',
      targetForm,
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
    const mockSend = vi.fn().mockImplementation(() => {
      const content = '```json\n{\n  "correct": false,\n  "correctAnswer": "よしそうです",\n  "reading": "よしそうです",\n  "explanation": "Incorrect"\n}\n```';

      return {
        *[Symbol.asyncIterator]() {
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

    const mockOpenRouter = vi.mocked(OpenRouter) as unknown as { prototype: MockOpenRouter };
    mockOpenRouter.prototype.chat = {
      send: mockSend
    };

    const targetForm: ConjugationType = 'non-past-affirmative-polite';
    const result = await gradeAnswerStreaming(
      'よしそう',
      targetForm,
      'wrong answer',
      'i-adjective',
      'fake-api-key',
      'fake-model',
      {}
    );

    expect(result.isCorrect).toBe(false);
  });
});
