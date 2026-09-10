import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface QuestionInputProps {
  onSend: (query: string) => Promise<void>;
  disabled: boolean;
  isGenerating: boolean;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({ onSend, disabled, isGenerating }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed || disabled || isGenerating) return;
    setQuery('');
    await onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-input-bar">
      <input
        type="text"
        className="chat-input"
        placeholder={isGenerating ? 'Generating answer...' : 'Ask something about this PDF...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isGenerating}
      />
      <button
        type="button"
        className="chat-send-btn"
        onClick={handleSubmit}
        disabled={!query.trim() || disabled || isGenerating}
      >
        {isGenerating ? (
          <div className="spinner" />
        ) : (
          <>
            <span>Ask</span>
            <Send size={15} />
          </>
        )}
      </button>
    </div>
  );
};
