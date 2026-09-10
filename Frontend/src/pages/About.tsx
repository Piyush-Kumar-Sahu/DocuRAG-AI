import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileUp,
  Search,
  BrainCircuit,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Files,
  MessageSquare,
  Database,
  LockKeyhole,
  CheckCircle2,
  Layers3,
  FileText,
  Download,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const About: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '56px 24px 72px',
      }}
    >
      <section
        style={{
          textAlign: 'center',
          maxWidth: '760px',
          margin: '0 auto 64px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            borderRadius: '999px',
            backgroundColor: 'var(--color-bg-subtle, #eff6ff)',
            color: 'var(--color-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '18px',
          }}
        >
          <Sparkles size={14} />
          AI-Powered Document Intelligence
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.1rem)',
            lineHeight: 1.15,
            marginBottom: '18px',
            color: 'var(--color-navy)',
            letterSpacing: '-0.025em',
          }}
        >
          Turn Your PDFs Into
          <span
            style={{
              color: 'var(--color-primary)',
              display: 'block',
            }}
          >
            An Interactive Knowledge Base
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.75,
            maxWidth: '700px',
            margin: '0 auto',
          }}
        >
          DocuRAG lets you upload your documents, ask questions in natural
          language, and get answers grounded in the content of your PDFs with
          source and page references for verification.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '28px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />
            Grounded answers
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />
            Page-level sources
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />
            Multi-PDF conversations
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '68px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p
            style={{
              color: 'var(--color-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            The Pipeline
          </p>

          <h2
            style={{
              fontSize: '1.7rem',
              color: 'var(--color-navy)',
              marginBottom: '10px',
            }}
          >
            How DocuRAG Works
          </h2>

          <p
            style={{
              maxWidth: '620px',
              margin: '0 auto',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
            }}
          >
            Your documents are transformed into searchable knowledge before
            your questions ever reach the language model.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            {
              icon: FileUp,
              title: '1. Upload',
              text: 'Upload one or up to three text-based PDF documents and start building your document workspace.',
            },
            {
              icon: FileText,
              title: '2. Extract & Chunk',
              text: 'PDF text is extracted page by page and divided into meaningful overlapping chunks for better retrieval.',
            },
            {
              icon: Search,
              title: '3. Retrieve',
              text: 'Your question is converted into an embedding and matched against the most relevant document chunks.',
            },
            {
              icon: BrainCircuit,
              title: '4. Generate',
              text: 'Ollama uses the retrieved context and conversation history to generate a grounded response.',
            },
          ].map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}
              >
                <div
                  className="upload-icon-box"
                  style={{
                    margin: '0 0 16px 0',
                    width: '44px',
                    height: '44px',
                  }}
                >
                  <Icon size={21} />
                </div>

                <h3
                  style={{
                    fontSize: '1rem',
                    marginBottom: '9px',
                    color: 'var(--color-navy)',
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '22px',
            padding: '16px 20px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-subtle, #f8fbff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            color: 'var(--color-text-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          <span>PDF</span>
          <ArrowRight size={15} />
          <span>Text Extraction</span>
          <ArrowRight size={15} />
          <span>Embeddings</span>
          <ArrowRight size={15} />
          <span>ChromaDB</span>
          <ArrowRight size={15} />
          <span>Retrieval</span>
          <ArrowRight size={15} />
          <span>Ollama</span>
          <ArrowRight size={15} />
          <span>Answer</span>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '68px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
          }}
        >
          <div
            className="upload-icon-box"
            style={{
              margin: '0 0 18px 0',
              width: '46px',
              height: '46px',
            }}
          >
            <Files size={22} />
          </div>

          <h2
            style={{
              fontSize: '1.35rem',
              color: 'var(--color-navy)',
              marginBottom: '10px',
            }}
          >
            One Conversation. Multiple Documents.
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              fontSize: '0.9rem',
              marginBottom: '18px',
            }}
          >
            Upload up to three PDFs and ask questions across all of them from
            the same conversation. DocuRAG keeps each document identifiable so
            relevant information can be traced back to its original source.
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              'Ask questions about a specific document',
              'Compare information across PDFs',
              'Find related information across documents',
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  fontSize: '0.84rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                <CheckCircle2
                  size={16}
                  style={{
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
          }}
        >
          <div
            className="upload-icon-box"
            style={{
              margin: '0 0 18px 0',
              width: '46px',
              height: '46px',
            }}
          >
            <BookOpen size={22} />
          </div>

          <h2
            style={{
              fontSize: '1.35rem',
              color: 'var(--color-navy)',
              marginBottom: '10px',
            }}
          >
            Answers You Can Verify
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              fontSize: '0.9rem',
              marginBottom: '18px',
            }}
          >
            Each answer can be accompanied by source information so you can
            quickly trace the response back to the document instead of relying
            on an unexplained generated response.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {[
              ['PDF', 'Document'],
              ['Page', 'Reference'],
              ['Text', 'Snippet'],
            ].map(([label, description]) => (
              <div
                key={label}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '12px 8px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-bg-subtle, #f8fbff)',
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: 'var(--color-navy)',
                    marginBottom: '3px',
                  }}
                >
                  {label}
                </strong>

                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '68px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p
            style={{
              color: 'var(--color-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            More Than Search
          </p>

          <h2
            style={{
              fontSize: '1.7rem',
              color: 'var(--color-navy)',
              marginBottom: '10px',
            }}
          >
            Built for Natural Conversations
          </h2>

          <p
            style={{
              maxWidth: '650px',
              margin: '0 auto',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
            }}
          >
            Ask a question, ask a follow-up, or change direction without
            restarting the conversation.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            {
              icon: MessageSquare,
              title: 'Conversational Context',
              text: 'Previous questions and answers remain available for natural follow-up questions.',
            },
            {
              icon: Layers3,
              title: 'Context-Aware Retrieval',
              text: 'Relevant document context is retrieved before generating an answer.',
            },
            {
              icon: Database,
              title: 'Persistent Knowledge',
              text: 'Authenticated users can keep their documents and conversations available across sessions.',
            },
            {
              icon: Download,
              title: 'Export Conversations',
              text: 'Completed conversations can be exported as a PDF for later reference.',
            },
          ].map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                style={{
                  padding: '22px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-bg-card)',
                }}
              >
                <Icon
                  size={21}
                  style={{
                    color: 'var(--color-primary)',
                    marginBottom: '14px',
                  }}
                />

                <h3
                  style={{
                    fontSize: '0.98rem',
                    color: 'var(--color-navy)',
                    marginBottom: '8px',
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.83rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        style={{
          marginBottom: '68px',
          padding: '30px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <h2
            style={{
              fontSize: '1.55rem',
              color: 'var(--color-navy)',
              marginBottom: '8px',
            }}
          >
            Why Use DocuRAG?
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              margin: 0,
            }}
          >
            Designed to make working with long documents faster and more
            intuitive.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
          }}
        >
          {[
            'Ask questions instead of manually searching long PDFs.',
            'Find relevant information faster using semantic retrieval.',
            'Keep responses grounded in retrieved document context.',
            'Verify answers using document and page references.',
            'Compare information across multiple uploaded PDFs.',
            'Continue naturally with follow-up questions.',
          ].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '14px',
                backgroundColor: 'var(--color-bg-subtle, #f8fbff)',
                borderRadius: '10px',
              }}
            >
              <CheckCircle2
                size={17}
                style={{
                  color: 'var(--color-primary)',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />

              <span
                style={{
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                  color: 'var(--color-text-muted)',
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '68px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p
            style={{
              color: 'var(--color-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            Technology
          </p>

          <h2
            style={{
              fontSize: '1.7rem',
              color: 'var(--color-navy)',
              marginBottom: '8px',
            }}
          >
            Built With a Practical RAG Stack
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6,
              fontSize: '0.9rem',
            }}
          >
            A focused architecture combining document processing, semantic
            retrieval, vector search, and local/cloud Ollama inference.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
          }}
        >
          {[
            ['Frontend', 'React · TypeScript · Vite'],
            ['Backend', 'Python · FastAPI'],
            ['RAG', 'LangChain · PyMuPDF'],
            ['Embeddings', 'BGE · Sentence Transformers'],
            ['Vector Store', 'ChromaDB'],
            ['LLM', 'Ollama'],
            ['Database', 'PostgreSQL · SQLAlchemy'],
            ['Export', 'ReportLab'],
          ].map(([category, technologies]) => (
            <div
              key={category}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '7px',
                }}
              >
                {category}
              </div>

              <div
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--color-navy)',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                {technologies}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '68px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck
              size={22}
              style={{ color: 'var(--color-primary)' }}
            />

            <h3
              style={{
                fontSize: '1.12rem',
                color: 'var(--color-navy)',
                margin: 0,
              }}
            >
              Privacy & Document Isolation
            </h3>
          </div>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Documents and vector data are scoped to the appropriate user,
            document, and chat session. This keeps retrieval focused on the
            documents available to the current conversation.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <LockKeyhole
              size={22}
              style={{ color: 'var(--color-primary)' }}
            />

            <h3
              style={{
                fontSize: '1.12rem',
                color: 'var(--color-navy)',
                margin: 0,
              }}
            >
              Authentication & Persistence
            </h3>
          </div>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Registered users can keep their documents and conversations
            persistent with authentication, chat history, OTP verification,
            and PDF conversation export.
          </p>
        </div>
      </section>

      <section
        style={{
          marginBottom: '68px',
          padding: '26px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-bg-subtle, #f8fbff)',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
        }}
      >
        <FileText
          size={24}
          style={{
            color: 'var(--color-primary)',
            marginBottom: '10px',
          }}
        />

        <h3
          style={{
            fontSize: '1.12rem',
            color: 'var(--color-navy)',
            marginBottom: '8px',
          }}
        >
          Current Document Support
        </h3>

        <p
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            color: 'var(--color-text-muted)',
            fontSize: '0.85rem',
            lineHeight: 1.65,
          }}
        >
          The current version is designed for text-based PDFs with
          extractable text. Image-only and scanned documents requiring OCR are
          outside the current scope.
        </p>
      </section>

      <section
        style={{
          textAlign: 'center',
          padding: '40px 24px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            fontSize: '1.65rem',
            color: 'var(--color-navy)',
            marginBottom: '10px',
          }}
        >
          Ready to Explore Your Documents?
        </h2>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            maxWidth: '520px',
            margin: '0 auto 22px',
            lineHeight: 1.6,
          }}
        >
          Upload your PDFs, ask questions naturally, and explore the
          information hidden inside your documents.
        </p>

        <Link
          to={isAuthenticated ? '/app' : '/register'}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: 'auto',
            padding: '12px 26px',
            fontSize: '0.92rem',
          }}
        >
          <span>
            {isAuthenticated ? 'Go to Workspace' : 'Start Asking Questions'}
          </span>
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
};