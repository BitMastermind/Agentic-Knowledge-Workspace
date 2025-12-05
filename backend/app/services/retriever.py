"""RAG retriever service with hybrid search, re-ranking, and query expansion."""

from typing import List, Dict, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
import re

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RetrieverService:
    """
    Advanced retrieval service with:
    - Hybrid search (vector + BM25 keyword matching)
    - Cross-encoder re-ranking
    - Multi-query expansion for completeness
    - Similarity threshold filtering
    """

    # Model configuration
    EMBEDDING_MODEL = "all-mpnet-base-v2"  # 768 dims, better semantic understanding
    EMBEDDING_DIMS = 768
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"  # Fast, accurate re-ranker
    
    # Retrieval parameters
    MIN_SIMILARITY_THRESHOLD = 0.3  # Filter out low-relevance chunks
    HYBRID_ALPHA = 0.7  # Weight for vector search (0.3 for BM25)
    RERANK_TOP_K = 30  # Number of candidates for re-ranking

    def __init__(self):
        # Initialize embedding model
        try:
            self.embeddings = SentenceTransformer(self.EMBEDDING_MODEL)
            logger.info("embedding_model_initialized", model=self.EMBEDDING_MODEL, dims=self.EMBEDDING_DIMS)
        except Exception as e:
            self.embeddings = None
            logger.error("embedding_model_load_failed", error=str(e))
        
        # Initialize cross-encoder for re-ranking
        try:
            self.reranker = CrossEncoder(self.RERANKER_MODEL)
            logger.info("reranker_initialized", model=self.RERANKER_MODEL)
        except Exception as e:
            self.reranker = None
            logger.warning("reranker_load_failed", error=str(e))

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for search query."""
        if not self.embeddings:
            raise ValueError("Embedding model not loaded")
        
        try:
            embedding = self.embeddings.encode(query, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error("query_embedding_failed", error=str(e))
            raise

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization for BM25."""
        # Lowercase and split on non-alphanumeric
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens

    async def _vector_search(
        self,
        db: AsyncSession,
        query_embedding: List[float],
        tenant_id: int,
        document_ids: List[int] | None = None,
        limit: int = 30,
    ) -> List[Dict]:
        """Vector similarity search using pgvector."""
        try:
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
            
            if document_ids:
                query_str = f"""
                    SELECT 
                        c.id,
                        c.content,
                        c.chunk_metadata,
                        d.filename,
                        d.id as document_id,
                        1 - (c.embedding <=> '{embedding_str}'::vector) as score
                    FROM chunks c
                    JOIN documents d ON c.document_id = d.id
                    WHERE d.tenant_id = :tenant_id
                    AND d.id = ANY(:document_ids)
                    ORDER BY score DESC
                    LIMIT :limit
                """
                params = {"tenant_id": tenant_id, "document_ids": document_ids, "limit": limit}
            else:
                query_str = f"""
                    SELECT 
                        c.id,
                        c.content,
                        c.chunk_metadata,
                        d.filename,
                        d.id as document_id,
                        1 - (c.embedding <=> '{embedding_str}'::vector) as score
                    FROM chunks c
                    JOIN documents d ON c.document_id = d.id
                    WHERE d.tenant_id = :tenant_id
                    ORDER BY score DESC
                    LIMIT :limit
                """
                params = {"tenant_id": tenant_id, "limit": limit}
            
            result = await db.execute(text(query_str), params)
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "content": row.content,
                    "metadata": row.chunk_metadata or {},
                    "document_name": row.filename,
                    "document_id": row.document_id,
                    "score": float(row.score),
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("vector_search_failed", error=str(e))
            raise

    async def _get_all_chunks_for_bm25(
        self,
        db: AsyncSession,
        tenant_id: int,
        document_ids: List[int] | None = None,
    ) -> List[Dict]:
        """Fetch all chunks for BM25 scoring."""
        try:
            if document_ids:
                query_str = """
                    SELECT c.id, c.content, c.chunk_metadata, d.filename, d.id as document_id
                    FROM chunks c
                    JOIN documents d ON c.document_id = d.id
                    WHERE d.tenant_id = :tenant_id
                    AND d.id = ANY(:document_ids)
                """
                params = {"tenant_id": tenant_id, "document_ids": document_ids}
            else:
                query_str = """
                    SELECT c.id, c.content, c.chunk_metadata, d.filename, d.id as document_id
                    FROM chunks c
                    JOIN documents d ON c.document_id = d.id
                    WHERE d.tenant_id = :tenant_id
                """
                params = {"tenant_id": tenant_id}
            
            result = await db.execute(text(query_str), params)
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "content": row.content,
                    "metadata": row.chunk_metadata or {},
                    "document_name": row.filename,
                    "document_id": row.document_id,
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("fetch_chunks_for_bm25_failed", error=str(e))
            return []

    def _bm25_search(
        self,
        query: str,
        chunks: List[Dict],
        limit: int = 30,
    ) -> List[Dict]:
        """BM25 keyword search."""
        if not chunks:
            return []
        
        try:
            # Tokenize all chunks
            tokenized_corpus = [self._tokenize(chunk["content"]) for chunk in chunks]
            
            # Create BM25 index
            bm25 = BM25Okapi(tokenized_corpus)
            
            # Score query against corpus
            query_tokens = self._tokenize(query)
            scores = bm25.get_scores(query_tokens)
            
            # Normalize scores to 0-1 range
            max_score = max(scores) if max(scores) > 0 else 1
            
            # Add scores to chunks and sort
            scored_chunks = []
            for idx, chunk in enumerate(chunks):
                scored_chunk = chunk.copy()
                scored_chunk["score"] = float(scores[idx] / max_score)
                scored_chunks.append(scored_chunk)
            
            # Sort by score and return top results
            scored_chunks.sort(key=lambda x: x["score"], reverse=True)
            return scored_chunks[:limit]
        except Exception as e:
            logger.error("bm25_search_failed", error=str(e))
            return []

    def _hybrid_merge(
        self,
        vector_results: List[Dict],
        bm25_results: List[Dict],
        alpha: float = 0.7,
    ) -> List[Dict]:
        """
        Merge vector and BM25 results using weighted combination.
        alpha: weight for vector scores (1-alpha for BM25)
        """
        # Create score maps
        vector_scores = {r["id"]: r["score"] for r in vector_results}
        bm25_scores = {r["id"]: r["score"] for r in bm25_results}
        
        # Get all unique chunk IDs
        all_ids = set(vector_scores.keys()) | set(bm25_scores.keys())
        
        # Create chunk lookup
        chunk_lookup = {}
        for r in vector_results + bm25_results:
            if r["id"] not in chunk_lookup:
                chunk_lookup[r["id"]] = r
        
        # Calculate hybrid scores
        hybrid_results = []
        for chunk_id in all_ids:
            chunk = chunk_lookup[chunk_id].copy()
            v_score = vector_scores.get(chunk_id, 0)
            b_score = bm25_scores.get(chunk_id, 0)
            chunk["score"] = alpha * v_score + (1 - alpha) * b_score
            chunk["vector_score"] = v_score
            chunk["bm25_score"] = b_score
            hybrid_results.append(chunk)
        
        # Sort by hybrid score
        hybrid_results.sort(key=lambda x: x["score"], reverse=True)
        return hybrid_results

    def _rerank(self, query: str, chunks: List[Dict], top_k: int = 15) -> List[Dict]:
        """Re-rank chunks using cross-encoder model."""
        if not self.reranker or not chunks:
            return chunks[:top_k]
        
        try:
            # Prepare query-document pairs
            pairs = [[query, chunk["content"]] for chunk in chunks]
            
            # Score with cross-encoder
            scores = self.reranker.predict(pairs)
            
            # Add rerank scores
            for idx, chunk in enumerate(chunks):
                chunk["rerank_score"] = float(scores[idx])
            
            # Sort by rerank score
            chunks.sort(key=lambda x: x["rerank_score"], reverse=True)
            
            logger.info("reranking_completed", candidates=len(chunks), top_k=top_k)
            return chunks[:top_k]
        except Exception as e:
            logger.error("reranking_failed", error=str(e))
            return chunks[:top_k]

    def _generate_query_variations(self, query: str) -> List[str]:
        """
        Generate query variations for multi-query retrieval.
        This captures different aspects of the question.
        """
        variations = [query]  # Always include original
        
        # Simple heuristic variations
        query_lower = query.lower().strip()
        
        # If question, try declarative form
        if query_lower.startswith(("what is", "what are")):
            # "What is X?" -> "X definition", "X explanation"
            topic = query_lower.replace("what is ", "").replace("what are ", "").rstrip("?")
            variations.append(f"{topic} definition")
            variations.append(f"{topic} explanation")
        elif query_lower.startswith(("how do", "how does", "how to")):
            # "How to X?" -> "X process", "X steps"
            topic = query_lower.replace("how do ", "").replace("how does ", "").replace("how to ", "").rstrip("?")
            variations.append(f"{topic} process steps")
            variations.append(f"{topic} method")
        elif query_lower.startswith(("why do", "why does", "why is")):
            # "Why X?" -> "X reasons", "X causes"
            topic = query_lower.replace("why do ", "").replace("why does ", "").replace("why is ", "").rstrip("?")
            variations.append(f"{topic} reasons")
            variations.append(f"{topic} causes")
        else:
            # Generic: add keywords
            variations.append(f"{query} details")
            variations.append(f"{query} information")
        
        return variations[:3]  # Max 3 variations

    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        tenant_id: int,
        document_ids: List[int] | None = None,
        top_k: int = 15,
        use_hybrid: bool = True,
        use_reranking: bool = True,
        use_query_expansion: bool = True,
    ) -> List[Dict]:
        """
        Advanced retrieval pipeline with:
        1. Multi-query expansion (optional)
        2. Hybrid search: vector + BM25 (optional)
        3. Cross-encoder re-ranking (optional)
        4. Similarity threshold filtering
        """
        try:
            # Step 1: Generate query variations for completeness
            if use_query_expansion:
                queries = self._generate_query_variations(query)
                logger.info("query_expansion", original=query, variations=len(queries))
            else:
                queries = [query]
            
            # Step 2: Collect results from all query variations
            all_chunks: Dict[int, Dict] = {}  # Deduplicate by chunk ID
            
            for q in queries:
                # Vector search
                query_embedding = await self.embed_query(q)
                vector_results = await self._vector_search(
                    db=db,
                    query_embedding=query_embedding,
                    tenant_id=tenant_id,
                    document_ids=document_ids,
                    limit=self.RERANK_TOP_K,
                )
                
                if use_hybrid:
                    # BM25 search
                    all_chunks_for_bm25 = await self._get_all_chunks_for_bm25(
                        db=db,
                        tenant_id=tenant_id,
                        document_ids=document_ids,
                    )
                    bm25_results = self._bm25_search(q, all_chunks_for_bm25, limit=self.RERANK_TOP_K)
                    
                    # Hybrid merge
                    merged = self._hybrid_merge(vector_results, bm25_results, alpha=self.HYBRID_ALPHA)
                else:
                    merged = vector_results
                
                # Add to all_chunks, keeping best score for duplicates
                for chunk in merged:
                    chunk_id = chunk["id"]
                    if chunk_id not in all_chunks or chunk["score"] > all_chunks[chunk_id]["score"]:
                        all_chunks[chunk_id] = chunk
            
            # Convert to list and sort by score
            candidates = list(all_chunks.values())
            candidates.sort(key=lambda x: x["score"], reverse=True)
            
            # Step 3: Filter by similarity threshold
            candidates = [c for c in candidates if c["score"] >= self.MIN_SIMILARITY_THRESHOLD]
            
            # Step 4: Re-rank top candidates
            if use_reranking and self.reranker:
                # Take more candidates for re-ranking
                rerank_candidates = candidates[:self.RERANK_TOP_K]
                final_results = self._rerank(query, rerank_candidates, top_k=top_k)
            else:
                final_results = candidates[:top_k]
            
            logger.info(
                "retrieval_completed",
                query=query[:50],
                queries_used=len(queries),
                candidates=len(candidates),
                final_results=len(final_results),
                hybrid=use_hybrid,
                reranking=use_reranking,
            )
            
            return final_results
            
        except Exception as e:
            logger.error("retrieval_failed", error=str(e), query=query[:50])
            raise

    # Backward compatible simple search method
    async def search_chunks(
        self,
        db: AsyncSession,
        query_embedding: List[float],
        tenant_id: int,
        document_ids: List[int] | None = None,
        limit: int = 10,
    ) -> List[Dict]:
        """Simple vector search (backward compatible)."""
        return await self._vector_search(
            db=db,
            query_embedding=query_embedding,
            tenant_id=tenant_id,
            document_ids=document_ids,
            limit=limit,
        )
