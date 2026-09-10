import React, { useState } from 'react';
import { User as UserIcon, Bot, Layers, ChevronDown } from 'lucide-react';
import { ChatMessageItem } from '../types/chat';
import { SourceCard } from './SourceCard';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = !isUser && message.sources && message.sources.length > 0;

  return (
    <div className={`chat-bubble-container ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-sender-label" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {isUser ? (
          <>
            <span>You</span>
            <UserIcon size={12} />
          </>
        ) : (
          <>
            <Bot size={13} style={{ color: 'var(--color-primary)' }} />
            <span>Assistant</span>
          </>
        )}
      </div>

      <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </div>

        {/* Collapsible Citations / Sources */}
        {hasSources && (
          <div className="sources-collapsible-wrapper">
            <button
              type="button"
              className={`sources-toggle-btn ${isExpanded ? 'expanded' : ''}`}
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              title={isExpanded ? 'Hide sources' : 'Show sources'}
            >
              <Layers size={13} style={{ color: 'var(--color-primary)' }} />
              <span>Sources ({message.sources!.length})</span>
              <ChevronDown
                size={13}
                className={`sources-chevron ${isExpanded ? 'expanded' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="sources-list-container">
                {message.sources!.map((src, idx) => (
                  <SourceCard key={`${src.chunk_index}-${idx}`} source={src} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

