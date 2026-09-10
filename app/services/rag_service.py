import logging
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings
from app.services.vector_store import vector_store_service, VectorStoreService
from app.services.llm.factory import get_llm_service
from app.services.llm.base import BaseLLM

logger = logging.getLogger(__name__)

FALLBACK_NOT_FOUND_MESSAGE = ("I couldn't find this information in the uploaded document.")

class RAGService:
    def __init__(
        self,
        vector_store: Optional[VectorStoreService] = None,
        llm: Optional[BaseLLM] = None
    ):
        self.vector_store = vector_store or vector_store_service
        self._llm = llm

    @property
    def llm(self) -> BaseLLM:
        if self._llm is None:
            self._llm = get_llm_service()
        return self._llm

    def _build_retrieval_query(self, user_query: str, chat_history: Optional[List[Dict[str, str]]]) -> str:
        if not chat_history:
            return user_query
        user_past_queries = [
            m.get("content", "").strip()
            for m in chat_history
            if m.get("role") == "user" and m.get("content")
        ]

        if not user_past_queries:
            return user_query

        last_user_q = user_past_queries[-1]
        query_lower = f" {user_query.lower()} "
        followup_cues = [
            " it ", " its ", " that ", " this ", " they ", " them ",
            " those ", " these ", " previous ", " earlier ", " mentioned ",
            " above ", " also ", " applications ", " differences ", " compare "
        ]

        is_followup = any(cue in query_lower for cue in followup_cues) or len(user_query.split()) <= 4
        if is_followup:
            return f"{last_user_q} {user_query}"

        return user_query

    def query_document(
        self,
        user_id: str,
        document_id: Optional[str] = None,
        user_query: str = "",
        top_k: int = settings.RAG_TOP_K,
        distance_threshold: float = settings.RAG_DISTANCE_THRESHOLD,
        chat_history: Optional[List[Dict[str, str]]] = None,
        document_ids: Optional[List[str]] = None,
        document_names: Optional[Dict[str, str]] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        target_doc_ids: List[str] = []
        if document_ids:
            if isinstance(document_ids, list):
                target_doc_ids = [str(d) for d in document_ids if d]
            elif isinstance(document_ids, str):
                target_doc_ids = [document_ids]
        elif document_id:
            target_doc_ids = [str(document_id)]

        logger.info(
            f"Executing RAG query for user '{user_id}', docs '{target_doc_ids}': '{user_query}' "
            f"(history turns: {len(chat_history) if chat_history else 0})"
        )
        search_query = self._build_retrieval_query(user_query, chat_history)
        relevant_chunks = self.vector_store.query_similar_chunks(
            user_id=user_id,
            document_ids=target_doc_ids,
            query=search_query,
            top_k=top_k,
            distance_threshold=distance_threshold
        )
        if not relevant_chunks and not chat_history:
            logger.info(
                f"No relevant chunks passed distance threshold ({distance_threshold}) "
                f"and no chat history. Returning fallback not found."
            )
            return FALLBACK_NOT_FOUND_MESSAGE, []
        context_parts = []
        sources = []
        for i, chunk in enumerate(relevant_chunks, 1):
            page_num = chunk.get("page_number", 1)
            chunk_idx = chunk.get("chunk_index", 0)
            chunk_doc_id = chunk.get("document_id", "")
            
            doc_name = ""
            if document_names and chunk_doc_id in document_names:
                doc_name = document_names[chunk_doc_id]
            elif chunk.get("document_filename"):
                doc_name = chunk["document_filename"]
            else:
                doc_name = f"Document {chunk_doc_id[:8]}" if chunk_doc_id else "Document"

            text = chunk.get("text", "")
            dist = chunk.get("distance", 0.0)
            sim = chunk.get("similarity_score", 0.0)

            context_parts.append(f"[Source {i} - {doc_name} (Page {page_num})]:\n{text}")

            clean_snippet = " ".join(text.split())
            if len(clean_snippet) > 220:
                clean_snippet = clean_snippet[:220].rsplit(" ", 1)[0] + "..."

            sources.append({
                "document_id": chunk_doc_id,
                "document_filename": doc_name,
                "page_number": page_num,
                "chunk_index": chunk_idx,
                "distance": dist,
                "similarity_score": sim,
                "snippet": clean_snippet,
            })

        context_str = "\n\n".join(context_parts) if context_parts else "(No specific document excerpts matched for this query)"

        history_limit = getattr(settings, "CHAT_HISTORY_LIMIT", 10)
        recent_history = chat_history[-history_limit:] if chat_history else []

        history_section = ""
        if recent_history:
            formatted_messages = []
            for msg in recent_history:
                role = msg.get("role", "user").capitalize()
                content = msg.get("content", "").strip()
                formatted_messages.append(f"{role}: {content}")
            history_section = "CONVERSATION HISTORY:\n" + "\n".join(formatted_messages) + "\n\n"

        system_prompt = (
            "You are an expert document question-answering assistant.\n"
            "Answer user questions accurately, directly, and naturally using the provided Conversation History and Document Context.\n\n"
            "CORE CONTEXT & GROUNDING PRINCIPLES:\n"
            "1. DOCUMENT QUESTIONS: Answer using ONLY the facts found in the Document Context across the attached PDF documents. Do NOT invent external facts or make unsupported claims.\n"
            "2. MULTI-DOCUMENT COMPARISONS & SUMMARIES: The user may upload 1 to 3 documents. When asked to compare, contrast, summarize, or identify which document discusses a topic, synthesize clearly using the specific document names (e.g. 'In research_paper.pdf... while in deep_learning.pdf...').\n"
            "3. CONVERSATION QUESTIONS & REFERENCES: Use Conversation History to track discussion flow, resolve references (e.g. 'that', 'it', 'they', 'the previous answer'), and answer questions about the conversation itself.\n"
            "4. QUESTION COUNTING: When asked how many questions were asked, count the total number of User questions in the Conversation History plus this current question.\n"
            "5. WHEN TO SAY NOT FOUND:\n"
            "   - If the user asks a factual question and the Document Context contains NO information to answer it, state:\n"
            f"     \"{FALLBACK_NOT_FOUND_MESSAGE}\"\n"
            "   - Do NOT use this fallback for conversational questions answerable from history.\n"
            "6. TONE & STYLE:\n"
            "   - Speak naturally, authoritatively, and concisely.\n"
            "   - NEVER use defensive hedging phrases (e.g. 'I couldn't find a specific statement...', 'Based on the mentioned models...').\n"
            "   - NEVER mention RAG, vector databases, embeddings, ChromaDB, similarity scores, or chunks.\n"
            "   - Include natural page and document references when citing facts (e.g. '(deep_learning.pdf, Page 12)')."
        )

        prompt = (
            f"{history_section}"
            f"DOCUMENT CONTEXT:\n{context_str}\n\n"
            f"CURRENT USER QUESTION:\n{user_query}\n\n"
            f"Answer:"
        )
        try:
            answer = self.llm.generate(prompt=prompt, system_prompt=system_prompt)
            if not answer:
                answer = FALLBACK_NOT_FOUND_MESSAGE
        except Exception as e:
            raise RuntimeError(f"Failed to generate answer from LLM: {str(e)}")

        return answer, sources

rag_service = RAGService()
