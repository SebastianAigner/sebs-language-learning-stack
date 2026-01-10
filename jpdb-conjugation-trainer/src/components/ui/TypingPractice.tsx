import { Input } from './Input';

interface TypingPracticeProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  hint?: string;
}

export function TypingPractice({ 
  value, 
  onChange, 
  onComplete, 
  hint 
}: TypingPracticeProps) {
  return (
    <div id="typing-practice-section">
      <div className="typing-practice-label">Type the correct answer to continue:</div>
      <Input
        type="text"
        className="typing-practice-input"
        placeholder="Type here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onComplete();
        }}
        autoFocus
        autoComplete="off"
      />
      {hint && (
        <div className="typing-practice-hint">{hint}</div>
      )}
    </div>
  );
}
