"""Document and chunk models for file storage and embeddings."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, JSON
from pgvector.sqlalchemy import Vector
import enum

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    """Document processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base):
    """Document model for uploaded files."""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, csv, md, txt, docx
    file_size = Column(Integer)  # bytes
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False, index=True)
    storage_key = Column(String, nullable=False, unique=True)  # S3 key or local path
    error_message = Column(Text, nullable=True)
    doc_metadata = Column(JSON, default={})  # Renamed from 'metadata' (SQLAlchemy reserved word)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Chunk(Base):
    """Chunk model for document embeddings (for RAG)."""

    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768))  # Gemini embedding-001 dimension (FREE!)
    chunk_metadata = Column(JSON, default={})  # page, section, etc. (renamed from 'metadata')
    created_at = Column(DateTime, default=datetime.utcnow)

