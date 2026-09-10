import logging
import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self, persist_dir: str = settings.CHROMA_PERSIST_DIR):
        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="rag_documents",
            metadata={"hnsw:space": "cosine"}
        )
    def add_document_chunks(
        self,
        user_id: str,
        document_id: str,
        chunks: List[Dict[str, Any]],
        document_filename: str = ""
    ) -> int:
        if not chunks:
            return 0

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for chunk in chunks:
            chunk_id = f"{user_id}_{document_id}_{chunk['chunk_index']}"
            ids.append(chunk_id)
            documents.append(chunk["text"])
            meta = {
                "user_id": str(user_id),
                "document_id": str(document_id),
                "page_number": int(chunk["page_number"]),
                "chunk_index": int(chunk["chunk_index"]),
            }
            if document_filename:
                meta["document_filename"] = str(document_filename)
                meta["source"] = str(document_filename)
            elif "source" in chunk:
                meta["document_filename"] = str(chunk["source"])
                meta["source"] = str(chunk["source"])

            metadatas.append(meta)

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Indexed {len(chunks)} chunks into ChromaDB for user '{user_id}', doc '{document_id}'")
        return len(chunks)

    def query_similar_chunks(
        self,
        user_id: str,
        document_id: Optional[str] = None,
        query: str = "",
        top_k: int = settings.RAG_TOP_K,
        distance_threshold: float = settings.RAG_DISTANCE_THRESHOLD,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        target_doc_ids: List[str] = []
        if document_ids:
            if isinstance(document_ids, list):
                target_doc_ids = [str(d) for d in document_ids if d]
            elif isinstance(document_ids, str):
                target_doc_ids = [document_ids]
        elif document_id:
            target_doc_ids = [str(document_id)]

        if not target_doc_ids:
            logger.warning(f"No document IDs provided for query '{query}' by user '{user_id}'")
            return []

        if len(target_doc_ids) == 1:
            doc_filter = {"document_id": {"$eq": target_doc_ids[0]}}
        else:
            doc_filter = {"document_id": {"$in": target_doc_ids}}

        where_filter = {
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                doc_filter
            ]
        }
        effective_top_k = max(top_k, len(target_doc_ids) * 3) if len(target_doc_ids) > 1 else top_k

        results = self.collection.query(
            query_texts=[query],
            n_results=effective_top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        filtered_results: List[Dict[str, Any]] = []
        if not results or not results.get("documents") or not results["documents"][0]:
            logger.info(f"ChromaDB returned 0 raw results for query: '{query}' across docs: {target_doc_ids}")
            return filtered_results

        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
        dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

        logger.info(
            f"ChromaDB returned {len(docs)} raw results for query '{query}' across docs {target_doc_ids}. "
            f"Distances: {[round(d, 4) for d in dists]} (Threshold: {distance_threshold})"
        )

        for doc, meta, dist in zip(docs, metas, dists):
            if dist <= distance_threshold:
                similarity_score = max(0.0, round(1.0 - dist, 4))
                doc_id_val = meta.get("document_id", target_doc_ids[0] if len(target_doc_ids) == 1 else "")
                filename_val = meta.get("document_filename", meta.get("source", ""))
                filtered_results.append({
                    "text": doc,
                    "document_id": doc_id_val,
                    "document_filename": filename_val,
                    "page_number": meta.get("page_number", 1),
                    "chunk_index": meta.get("chunk_index", 0),
                    "distance": round(dist, 4),
                    "similarity_score": similarity_score,
                })

        logger.info(
            f"Retained {len(filtered_results)} / {len(docs)} chunks after distance threshold filtering."
        )

        return filtered_results

    def delete_document_vectors(self, user_id: str, document_id: str) -> None:
        where_filter = {
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                {"document_id": {"$eq": str(document_id)}}
            ]
        }
        self.collection.delete(where=where_filter)

    def migrate_guest_vectors(
        self,
        guest_document_id: str,
        new_user_id: str,
        new_document_id: str,
        new_filename: str = ""
    ) -> int:
        where_filter = {
            "$and": [
                {"user_id": {"$eq": "guest"}},
                {"document_id": {"$eq": str(guest_document_id)}}
            ]
        }
        try:
            guest_records = self.collection.get(
                where=where_filter,
                include=["documents", "metadatas", "embeddings"]
            )
            if not guest_records or not guest_records.get("ids"):
                return 0

            ids = guest_records["ids"]
            docs = guest_records["documents"]
            metas = guest_records["metadatas"]
            embeddings = guest_records.get("embeddings")

            new_ids = []
            new_metas = []
            for i, meta in enumerate(metas):
                chunk_idx = meta.get("chunk_index", i)
                new_ids.append(f"{new_user_id}_{new_document_id}_{chunk_idx}")
                meta_dict = {
                    "user_id": str(new_user_id),
                    "document_id": str(new_document_id),
                    "page_number": int(meta.get("page_number", 1)),
                    "chunk_index": int(chunk_idx),
                }
                fn = new_filename or meta.get("document_filename", meta.get("source", ""))
                if fn:
                    meta_dict["document_filename"] = fn
                    meta_dict["source"] = fn
                new_metas.append(meta_dict)

            if embeddings is not None and len(embeddings) == len(ids) and len(embeddings) > 0:
                self.collection.add(
                    ids=new_ids,
                    documents=docs,
                    embeddings=embeddings,
                    metadatas=new_metas
                )
            else:
                self.collection.add(
                    ids=new_ids,
                    documents=docs,
                    metadatas=new_metas
                )

            # Delete old guest vectors
            self.collection.delete(where=where_filter)
            return len(new_ids)
        except Exception as e:
            logger.error(f"Error migrating guest vectors: {e}")
            return 0

vector_store_service = VectorStoreService()

