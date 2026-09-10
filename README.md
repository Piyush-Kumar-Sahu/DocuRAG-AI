# DocuRAG — AI-Powered PDF Document Chat

DocuRAG is a Retrieval-Augmented Generation (RAG) application that lets users upload PDF documents and interact with them through natural-language conversations.

Instead of sending an entire document to an LLM, DocuRAG extracts and chunks the document, generates embeddings, retrieves the most relevant sections for each question, and sends the relevant context to an LLM through the Ollama Cloud API.

The application supports multi-PDF conversations, source references, authentication, persistent chat history, and PDF chat export.

---

## 🚀 Features

- Upload and process PDF documents
- Ask questions about uploaded documents
- Retrieval-Augmented Generation (RAG)
- Semantic search using vector embeddings
- Chat with multiple PDFs in a single conversation
- Source references with document name, page number, and relevant text
- JWT-based user authentication
- OTP-based email verification
- Password reset functionality
- PostgreSQL-based persistence
- ChromaDB vector storage
- User and document-level data isolation
- Persistent chat sessions and message history
- Export conversations as PDF
- Ollama Cloud API for LLM inference
- FastAPI REST API
- Automated test suite

---

## How It Works

                    PDF Upload
                        │
                        ▼
                PyMuPDF Extraction
                        │
                        ▼
                   Text Chunking
                        │
                        ▼
               Embedding Generation
                        │
                        ▼
                     ChromaDB
                        │
                        │
User Question ──────────┘
       │
       ▼
  Query Embedding
       │
       ▼
Relevant Chunk Retrieval
       │
       ▼
 Context + Question
       │
       ▼
 Ollama Cloud API
       │
       ▼
   AI Response
       │
       ▼
 Answer + Sources

### RAG Pipeline

1. PDF text is extracted using PyMuPDF.
2. Extracted text is divided into chunks.
3. Embeddings are generated for the chunks.
4. Chunks and metadata are stored in ChromaDB.
5. A user's question is converted into an embedding.
6. Relevant chunks are retrieved from ChromaDB.
7. Retrieved context is combined with the question.
8. The context is sent to the configured Ollama Cloud model.
9. The response is returned with source information.

---

## Multi-PDF Chat

DocuRAG supports conversations across multiple PDF documents.

Users can attach up to **3 PDFs** to a chat session and ask questions across them.

PDF 1 ──┐
PDF 2 ──┼──► Single Chat Session ──► Retrieval ──► LLM
PDF 3 ──┘


This makes it possible to ask comparative questions such as:

> Compare the revenue mentioned in the first two reports.

Sources can include:

- PDF filename
- Page number
- Relevant text snippet

---

## Authentication & Security

DocuRAG includes an authentication and user-isolation layer with:

- User registration and login
- JWT authentication
- OTP email verification
- Password reset
- Argon2 password hashing
- HMAC-SHA256 based OTP storage
- OTP expiration and usage tracking
- User-specific document access
- User/document-level ChromaDB isolation

The Ollama Cloud API key is kept exclusively on the backend and is never exposed to the frontend.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL, SQLAlchemy 2.0 |
| RAG | LangChain, ChromaDB |
| PDF Processing | PyMuPDF |
| Embeddings | BGE / Sentence Transformers |
| LLM | Ollama Cloud API |
| Authentication | JWT, Argon2, HMAC-SHA256 |
| PDF Export | ReportLab |
| Testing | Pytest |

---

## Project Structure

├── app/
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── auth.py
│   │           ├── documents.py
│   │           └── chat.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── otp.py
│   │   ├── document.py
│   │   └── chat.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── document.py
│   │   └── chat.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── email_service.py
│   │   ├── pdf_processor.py
│   │   ├── vector_store.py
│   │   ├── rag_service.py
│   │   └── llm/
│   │       ├── base.py
│   │       ├── ollama.py
│   │       └── factory.py
│   │
│   └── main.py
│
├── scripts/
│   ├── init_db.py
│   └── create_tables.py
│
├── tests/
│   ├── test_core_security.py
│   ├── test_auth_service.py
│   ├── test_pdf_processor.py
│   ├── test_vector_store.py
│   ├── test_llm_and_rag.py
│   └── test_api_endpoints.py
│
├── .env.example
├── pytest.ini
├── requirements.txt
└── README.md


## 🛠️ Local Setup

### 1. Clone the Repository

git clone <repository-url>
cd DocuRAG


### 2. Create Virtual Environment

python -m venv .venv
.\.venv\Scripts\activate


### 3. Install Dependencies

pip install -r requirements.txt

### 4. Configure Environment

cp .env.example .env


Update `.env` with your PostgreSQL credentials and Ollama Cloud configuration.

### 5. Initialize Database

python scripts/init_db.py
python scripts/create_tables.py

### 6. Start FastAPI

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

---

## PDF Support

DocuRAG currently processes **text-based PDFs** using PyMuPDF.

Scanned or image-only PDFs are not supported because OCR is not part of the current document-processing pipeline.

---

## System Architecture

                         ┌──────────────────────┐
                         │    React Frontend    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     FastAPI API      │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │ PostgreSQL  │    │ RAG Pipeline│    │    Auth     │
          └─────────────┘    └──────┬──────┘    └─────────────┘
                                    │
                           ┌────────┴────────┐
                           │                 │
                           ▼                 ▼
                       ChromaDB       Ollama Cloud
                                           │
                                           ▼
                                         LLM

---

## Current Scope

DocuRAG currently focuses on:

- Text-based PDF question answering
- Semantic document retrieval
- Multi-PDF conversations
- Source-aware responses
- Persistent user conversations
- Secure authentication
- Ollama Cloud-based LLM inference

OCR for scanned PDFs is currently outside the scope of the project.

---

