"""Document upload and management endpoints."""

import asyncio
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user, require_role, require_tenant_access
from app.models.document import Document, DocumentStatus
from app.services.storage import storage_service
from app.services.ingestion import ingestion_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Allowed file types
ALLOWED_FILE_TYPES = {
    "application/pdf": "pdf",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".md", ".txt", ".docx"}


class DocumentResponse(BaseModel):
    """Document response model."""

    id: int
    filename: str
    file_type: str
    file_size: int
    status: str
    created_at: str


async def process_document_background(document_id: int, file_path: str, file_type: str):
    """Background task to process document."""
    async with AsyncSessionLocal() as db:
        try:
            from pathlib import Path
            await ingestion_service.process_document(
                db=db,
                document_id=document_id,
                file_path=Path(file_path),
                file_type=file_type,
            )
        except Exception as e:
            logger.error("background_processing_failed", document_id=document_id, error=str(e))


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("member")),  # Members can upload
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document for processing.
    
    Flow:
    1. Validate file type and size
    2. Save file to storage
    3. Create document record
    4. Trigger background processing
    
    Requires: member role or higher
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided",
            )
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )
        
        # Determine file type
        file_type = file_ext[1:]  # Remove the dot
        
        # Check file size (max 10MB for now)
        content = await file.read()
        file_size = len(content)
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB",
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty",
            )
        
        # Generate storage key
        storage_key = storage_service.generate_storage_key(
            current_user["tenant_id"],
            file.filename,
        )
        
        # Save file to storage
        from io import BytesIO
        file_obj = BytesIO(content)
        await storage_service.save_file(file_obj, storage_key)
        
        # Create document record
        document = Document(
            tenant_id=current_user["tenant_id"],
            user_id=current_user["user_id"],
            filename=file.filename,
            file_type=file_type,
            file_size=file_size,
            status=DocumentStatus.PENDING,
            storage_key=storage_key,
            doc_metadata={},
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        
        logger.info(
            "document_uploaded",
            document_id=document.id,
            filename=file.filename,
            file_size=file_size,
            user_id=current_user["user_id"],
            tenant_id=current_user["tenant_id"],
        )
        
        # Trigger background processing
        file_full_path = await storage_service.get_file_path(storage_key)
        background_tasks.add_task(
            process_document_background,
            document.id,
            str(file_full_path),
            file_type,
        )
        
        return {
            "id": document.id,
            "filename": document.filename,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "status": document.status.value,
            "created_at": document.created_at.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("upload_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """List all documents for the current tenant."""
    try:
        # Query documents filtered by tenant_id
        result = await db.execute(
            select(Document)
            .where(Document.tenant_id == current_user["tenant_id"])
            .order_by(Document.created_at.desc())
        )
        
        documents = []
        for doc in result.scalars():
            documents.append({
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size or 0,
                "status": doc.status.value,
                "created_at": doc.created_at.isoformat(),
            })
        
        return documents
        
    except Exception as e:
        logger.error("list_documents_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list documents",
        )


@router.get("/{document_id}/stats")
async def get_document_stats(
    document_id: int,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """Get document statistics (chunk count, etc.)."""
    try:
        # Get document
        result = await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.tenant_id == current_user["tenant_id"])
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        
        # Count chunks
        from sqlalchemy import func
        result = await db.execute(
            select(func.count(Chunk.id))
            .where(Chunk.document_id == document_id)
        )
        chunk_count = result.scalar() or 0
        
        return {
            "document_id": document.id,
            "filename": document.filename,
            "status": document.status.value,
            "chunk_count": chunk_count,
            "file_size": document.file_size,
            "error_message": document.error_message,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_document_stats_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document stats",
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """Get document details by ID."""
    try:
        result = await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.tenant_id == current_user["tenant_id"])
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        
        return {
            "id": document.id,
            "filename": document.filename,
            "file_type": document.file_type,
            "file_size": document.file_size or 0,
            "status": document.status.value,
            "created_at": document.created_at.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_document_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document",
        )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: dict = Depends(require_role("member")),  # Members can delete
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document, its chunks, and the stored file.
    
    Requires: member role or higher
    """
    try:
        # Get document and verify it belongs to current tenant
        result = await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.tenant_id == current_user["tenant_id"])
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        
        storage_key = document.storage_key
        
        # Delete document from database (chunks will cascade delete)
        await db.delete(document)
        await db.commit()
        
        # Delete file from storage (non-blocking)
        try:
            await storage_service.delete_file(storage_key)
        except Exception as e:
            logger.warning("file_deletion_failed", storage_key=storage_key, error=str(e))
            # Don't fail the request if file deletion fails
        
        logger.info(
            "document_deleted",
            document_id=document_id,
            user_id=current_user["user_id"],
            tenant_id=current_user["tenant_id"],
        )
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("delete_document_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document",
        )

