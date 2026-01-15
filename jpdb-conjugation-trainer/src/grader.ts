import { OpenRouter } from '@openrouter/sdk';
import type { ChatGenerationParams } from '@openrouter/sdk/models';
import type { ConjugationType} from './types';
import { CONJUGATION_LABELS } from './types';
import { getGradingPrompt, getGrammarGradingPrompt } from './prompts';

export interface GradingResult {
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer?: string;
  reading?: string;
  explanation?: string;
  freeText?: string;
  rawOutput: string;
}

export interface StreamCallbacks {
  onReasoningStart?: () => void;
  onReasoningToken?: (token: string) => void;
  onReasoningEnd?: () => void;
  onContentToken?: (token: string) => void;
  onThinking?: () => void;
}

export class GradingError extends Error {
  rawOutput: string;

  constructor(message: string, rawOutput: string) {
    super(message);
    this.name = 'GradingError';
    this.rawOutput = rawOutput;
  }
}

const THINKING_EMOJIS = ['🤔', '💭', '🧠', '⚡', '✨', '🔍'];

export async function gradeAnswerStreaming(
  dictionaryForm: string,
  targetForm: ConjugationType,
  userAnswer: string,
  wordType: string,
  apiKey: string,
  model: string,
  callbacks: StreamCallbacks
): Promise<GradingResult> {
  const targetLabel = CONJUGATION_LABELS[targetForm];
  const prompt = getGradingPrompt(dictionaryForm, targetLabel, userAnswer, wordType);
  return gradeGenericStreaming(prompt, userAnswer, apiKey, model, callbacks);
}

export async function gradeGrammarAnswerStreaming(
  description: string,
  userAnswer: string,
  apiKey: string,
  model: string,
  callbacks: StreamCallbacks
): Promise<GradingResult> {
  const prompt = getGrammarGradingPrompt(description, userAnswer);
  return gradeGenericStreaming(prompt, userAnswer, apiKey, model, callbacks);
}

async function gradeGenericStreaming(
  prompt: string,
  userAnswer: string,
  apiKey: string,
  model: string,
  callbacks: StreamCallbacks
): Promise<GradingResult> {
  const client = new OpenRouter({
    apiKey: apiKey
  });

  // Parse model string for reasoning effort (e.g., "openai/gpt-oss-120b:nitro:xhigh")
  const reasoningLevels = ['xhigh', 'high', 'medium', 'low', 'minimal', 'none'] as const;
  type ReasoningEffort = typeof reasoningLevels[number];
  
  let reasoningEffort: ReasoningEffort | undefined;
  let actualModel = model;

  for (const level of reasoningLevels) {
    if (model.endsWith(`:${level}`)) {
      reasoningEffort = level;
      actualModel = model.slice(0, -(level.length + 1));
      break;
    }
  }

  const hasReasoning = reasoningEffort !== undefined;

  try {
    // Build request parameters with proper OpenRouter SDK types
    const requestParams: ChatGenerationParams & { stream: true } = {
      model: actualModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      maxTokens: 100000,
      stream: true,
      ...(reasoningEffort !== undefined && {
        reasoning: {
          effort: reasoningEffort
        }
      })
    };

    const stream = await client.chat.send(requestParams);

    let fullContent = '';
    let fullReasoning = '';
    let inReasoning = false;
    let hasSeenContent = false;
    let thinkingInterval: ReturnType<typeof setInterval> | null = null;
    let currentEmojiIndex = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Debug logging for reasoning
      if (hasReasoning) {
        console.log('Stream chunk delta:', JSON.stringify(delta, null, 2));
      }

      // Check for reasoning tokens
      const reasoning = 'reasoning' in delta ? delta.reasoning : undefined;
      if (reasoning !== undefined && reasoning !== null && reasoning !== '') {
        if (!inReasoning) {
          inReasoning = true;
          callbacks.onReasoningStart?.();

          // Start thinking indicator if no reasoning content yet
          if (reasoning.trim() === '') {
            thinkingInterval = setInterval(() => {
              callbacks.onThinking?.();
              currentEmojiIndex = (currentEmojiIndex + 1) % THINKING_EMOJIS.length;
            }, 500);
          } else {
            fullReasoning += reasoning;
            callbacks.onReasoningToken?.(reasoning);
          }
        } else {
          // Stop thinking indicator if we get actual reasoning
          if (thinkingInterval !== null && reasoning.trim() !== '') {
            clearInterval(thinkingInterval);
            thinkingInterval = null;
          }
          fullReasoning += reasoning;
          callbacks.onReasoningToken?.(reasoning);
        }
      }

      // Check for content tokens
      const content = delta.content;
      if (content !== undefined && content !== null && content !== '') {
        // First content token - stop reasoning display
        if (!hasSeenContent && inReasoning) {
          hasSeenContent = true;
          if (thinkingInterval !== null) {
            clearInterval(thinkingInterval);
            thinkingInterval = null;
          }
          callbacks.onReasoningEnd?.();
        }

        fullContent += content;
        callbacks.onContentToken?.(content);
      }
    }

    // Clean up thinking interval if still running
    if (thinkingInterval) {
      clearInterval(thinkingInterval);
    }

    // If reasoning ended but no content, close reasoning
    if (inReasoning && !hasSeenContent) {
      callbacks.onReasoningEnd?.();
    }

    // Debug logging for reasoning
    if (hasReasoning) {
      console.log('Final fullContent:', fullContent);
      console.log('Final fullReasoning:', fullReasoning);
    }

    const rawOutput = fullContent !== '' ? fullContent : 'No response from model';

    // Extract JSON from code block
    const codeBlockMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      throw new GradingError(
        `No valid JSON code block found in LLM response. Raw output: ${rawOutput}`,
        rawOutput
      );
    }

    let parsedJson: { correct: boolean; correctAnswer: string; reading?: string; explanation?: string };
    try {
      parsedJson = JSON.parse(codeBlockMatch[1]) as typeof parsedJson;
    } catch {
      throw new GradingError('Failed to parse JSON from LLM response', rawOutput);
    }

    // Validate required fields
    if (typeof parsedJson.correct !== 'boolean') {
      throw new GradingError('LLM response missing required field: correct (boolean)', rawOutput);
    }
    if (typeof parsedJson.correctAnswer !== 'string') {
      throw new GradingError('LLM response missing required field: correctAnswer (string)', rawOutput);
    }

    // Extract free text (everything except the JSON code block)
    const freeText = rawOutput.replace(codeBlockMatch[0], '').trim();

    // Override LLM assessment if user answer exactly matches correct answer
    let isCorrect = parsedJson.correct;
    if (userAnswer.trim() === parsedJson.correctAnswer.trim()) {
      isCorrect = true;
    }

    return {
      isCorrect: isCorrect,
      correctAnswer: parsedJson.correctAnswer,
      reading: parsedJson.reading,
      explanation: parsedJson.explanation,
      userAnswer: userAnswer,
      freeText: freeText !== '' ? freeText : undefined,
      rawOutput: rawOutput
    };
  } catch (error) {
    console.error('Grading error:', error);

    // Rethrow GradingError to preserve error context
    if (error instanceof GradingError) {
      throw error;
    }

    // Wrap other errors with context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to grade answer: ${errorMessage}. Please check your API key and model configuration.`);
  }
}

export function getThinkingEmoji(index: number): string {
  return THINKING_EMOJIS[index % THINKING_EMOJIS.length];
}
