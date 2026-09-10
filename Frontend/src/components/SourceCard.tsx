import React from 'react';
import { FileText } from 'lucide-react';
import { SourceCitation } from '../types/chat';

interface SourceCardProps {
  source: SourceCitation;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const docLabel = source.document_filename || source.document_title;
  return (
    <div className="source-card">
      <div className="source-meta">
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FileText size={13} />
          <span>
            {docLabel ? `${docLabel} \u2022 ` : ''}Page {source.page_number}
          </span>
        </span>
      </div>
      <p className="source-snippet">"{source.snippet}"</p>
    </div>
  );
};

