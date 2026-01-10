export function getGradingPrompt(dictionaryForm: string, targetLabel: string, userAnswer: string, wordType: string): string {
  return `I'm a Japanese learner. I was tasked to conjugate the ${wordType} "${dictionaryForm}" into ${targetLabel}. Here is my reply: "${userAnswer}". Is it correct?

Please respond with your evaluation. You MUST include a JSON object wrapped in triple-backtick json markdown code block (specifically: \`\`\`json ... \`\`\`) with the following structure:

\`\`\`json
{
  "correct": true or false,
  "correctAnswer": "the correct conjugation in Japanese",
  "reading": "the kana reading of the correct answer (hiragana/katakana)",
  "explanation": "only include this field if wrong - explain why it's wrong and what the correct answer is"
}
\`\`\`

You may also include free-form text before or after the triple-backtick json code block if you want to provide additional context.
If you're referring to Japanese words in your reply, please always spell them in Kana / Kanji, do not use Romaji in your reply.
Proivde a very brief interpretation of what the conjugated word means.
Please keep your explanation in English.
`;
}

export function getGrammarGradingPrompt(description: string, userAnswer: string): string {
  return `I'm a Japanese learner. I was given the following task: "${description}". Here is my answer: "${userAnswer}". Is it correct?

Please respond with your evaluation. You MUST include a JSON object wrapped in triple-backtick json markdown code block (specifically: \`\`\`json ... \`\`\`) with the following structure:

\`\`\`json
{
  "correct": true or false,
  "correctAnswer": "the correct answer in Japanese",
  "explanation": "explain why it's wrong or provide context for the correct answer"
}
\`\`\`

You may also include free-form text before or after the triple-backtick json code block if you want to provide additional context.
If you're referring to Japanese words in your reply, please always spell them in Kana / Kanji, do not use Romaji in your reply.
Please keep your explanation in English.
`;
}
