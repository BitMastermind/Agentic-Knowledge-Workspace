"""Agent action endpoints (email, Jira, reports)."""

import json
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_tenant_access
from app.core.config import settings
from app.core.logging import get_logger
from app.models.document import Document, Chunk
from app.services.agent import AgentService
from app.services.retriever import RetrieverService
from app.services.storage import storage_service
from app.services.credentials import credentials_service
from app.integrations.jira_client import JiraClient
from app.integrations.email_client import EmailClient

logger = get_logger(__name__)
router = APIRouter()

# Initialize services
agent_service = AgentService()
retriever_service = RetrieverService()


class EmailDraftRequest(BaseModel):
    """Email draft generation request."""

    context: str
    recipient: str | None = None
    tone: str = "professional"


class EmailDraftResponse(BaseModel):
    """Email draft response."""

    subject: str
    body: str


class SendEmailRequest(BaseModel):
    """Email sending request."""

    to_emails: list[str]
    subject: str
    body: str
    body_html: str | None = None
    cc_emails: list[str] | None = None
    bcc_emails: list[str] | None = None


class SendEmailResponse(BaseModel):
    """Email sending response."""

    status: str
    message: str


class JiraTicketRequest(BaseModel):
    """Jira ticket creation request."""

    project_key: str
    summary: str
    description: str
    issue_type: str = "Task"


class JiraTicketResponse(BaseModel):
    """Jira ticket response."""

    ticket_key: str
    ticket_url: str


class ReportRequest(BaseModel):
    """Report generation request."""

    document_ids: list[int]
    report_type: str = "summary"
    format: str = "html"  # html or pdf


class ReportResponse(BaseModel):
    """Report response."""

    report_url: str
    format: str
    report_id: str
    report_type: str
    document_names: list[str]
    document_count: int


@router.post("/email-draft", response_model=EmailDraftResponse)
async def generate_email_draft(
    request: EmailDraftRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an email draft using AI.
    
    Uses the agent service to generate a professional email draft
    based on the provided context.
    """
    try:
        result = await agent_service.generate_email_draft(
            context=request.context,
            recipient=request.recipient,
            tone=request.tone,
        )
        
        logger.info(
            "email_draft_generated",
            tenant_id=current_user["tenant_id"],
            user_id=current_user["user_id"],
        )
        
        return result
        
    except Exception as e:
        logger.error("email_draft_endpoint_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate email draft: {str(e)}",
        )


@router.post("/send-email", response_model=SendEmailResponse)
async def send_email(
    request: SendEmailRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Send an email using SMTP.
    
    Uses tenant-specific credentials if available, otherwise falls back to global settings.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Try to get tenant-specific credentials first
        tenant_creds = await credentials_service.get_credentials(
            db=db,
            tenant_id=tenant_id,
            integration_type="email",
        )
        
        if tenant_creds:
            # Use tenant-specific credentials
            smtp_host = tenant_creds.get("smtp_host")
            smtp_port = tenant_creds.get("smtp_port", 587)
            smtp_user = tenant_creds.get("smtp_user")
            smtp_password = tenant_creds.get("smtp_password")
            use_tls = tenant_creds.get("use_tls", True)
        else:
            # Fall back to global settings
            smtp_host = settings.SMTP_HOST
            smtp_port = settings.SMTP_PORT
            smtp_user = settings.SMTP_USER
            smtp_password = settings.SMTP_PASSWORD
            use_tls = True
        
        # Check if credentials are available
        if not all([smtp_host, smtp_user, smtp_password]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SMTP credentials not configured. Please configure email credentials in tenant settings or set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in environment variables.",
            )
        
        # Initialize email client
        email_client = EmailClient(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            use_tls=use_tls,
        )
        
        # Send email
        result = email_client.send_email(
            to_emails=request.to_emails,
            subject=request.subject,
            body=request.body,
            body_html=request.body_html,
            cc_emails=request.cc_emails,
            bcc_emails=request.bcc_emails,
        )
        
        logger.info(
            "email_sent",
            to=request.to_emails,
            subject=request.subject[:50],
            tenant_id=current_user["tenant_id"],
            user_id=current_user["user_id"],
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("email_send_failed", error=str(e), to=request.to_emails)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}",
        )


@router.get("/jira-test")
async def test_jira_connection(
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Test Jira connection and credentials.
    
    Uses tenant-specific credentials if available, otherwise falls back to global settings.
    Returns connection status and user information if successful.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Try to get tenant-specific credentials first
        tenant_creds = await credentials_service.get_credentials(
            db=db,
            tenant_id=tenant_id,
            integration_type="jira",
        )
        
        if tenant_creds:
            # Use tenant-specific credentials
            jira_url = tenant_creds.get("jira_url")
            jira_email = tenant_creds.get("jira_email")
            jira_api_token = tenant_creds.get("jira_api_token")
        else:
            # Fall back to global settings
            jira_url = settings.JIRA_URL
            jira_email = settings.JIRA_EMAIL
            jira_api_token = settings.JIRA_API_TOKEN
        
        # Check if credentials are configured
        if not all([jira_url, jira_email, jira_api_token]):
            return {
                "status": "not_configured",
                "message": "Jira credentials not configured. Please configure Jira credentials in tenant settings or set JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN in environment variables.",
            }
        
        # Initialize Jira client
        jira_client = JiraClient(
            server_url=jira_url,
            email=jira_email,
            api_token=jira_api_token,
        )
        
        # Test connection
        is_connected = jira_client.test_connection()
        
        if is_connected:
            # Get current user info
            client = jira_client._get_client()
            current_user_info = client.current_user()
            
            logger.info(
                "jira_connection_test_success",
                tenant_id=current_user["tenant_id"],
                user_id=current_user["user_id"],
            )
            
            return {
                "status": "connected",
                "message": "Successfully connected to Jira",
                "user": {
                    "account_id": current_user_info.accountId,
                    "display_name": current_user_info.displayName,
                    "email": getattr(current_user_info, "emailAddress", None),
                },
                "server_url": settings.JIRA_URL,
            }
        else:
            return {
                "status": "failed",
                "message": "Failed to connect to Jira. Please check your credentials.",
            }
            
    except Exception as e:
        logger.error("jira_connection_test_failed", error=str(e))
        return {
            "status": "error",
            "message": f"Connection test failed: {str(e)}",
        }


@router.post("/jira-ticket", response_model=JiraTicketResponse)
async def create_jira_ticket(
    request: JiraTicketRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Jira ticket.
    
    Uses tenant-specific credentials if available, otherwise falls back to global settings.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Try to get tenant-specific credentials first
        tenant_creds = await credentials_service.get_credentials(
            db=db,
            tenant_id=tenant_id,
            integration_type="jira",
        )
        
        if tenant_creds:
            # Use tenant-specific credentials
            jira_url = tenant_creds.get("jira_url")
            jira_email = tenant_creds.get("jira_email")
            jira_api_token = tenant_creds.get("jira_api_token")
        else:
            # Fall back to global settings
            jira_url = settings.JIRA_URL
            jira_email = settings.JIRA_EMAIL
            jira_api_token = settings.JIRA_API_TOKEN
        
        # Check if credentials are configured
        if not all([jira_url, jira_email, jira_api_token]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Jira credentials not configured. Please configure Jira credentials in tenant settings or set JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN in environment variables.",
            )
        
        # Initialize Jira client
        jira_client = JiraClient(
            server_url=jira_url,
            email=jira_email,
            api_token=jira_api_token,
        )
        
        # Create ticket
        result = jira_client.create_ticket(
            project_key=request.project_key,
            summary=request.summary,
            description=request.description,
            issue_type=request.issue_type,
        )
        
        logger.info(
            "jira_ticket_created",
            ticket_key=result["ticket_key"],
            tenant_id=current_user["tenant_id"],
            user_id=current_user["user_id"],
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("jira_ticket_creation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Jira ticket: {str(e)}",
        )


@router.post("/generate-report", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a report from selected documents.
    
    Fetches document contents, uses AI to analyze/summarize,
    and generates an HTML or PDF report.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # 1. Validate documents belong to tenant
        result = await db.execute(
            select(Document)
            .where(
                Document.id.in_(request.document_ids),
                Document.tenant_id == tenant_id,
                Document.status == "completed",
            )
        )
        documents = result.scalars().all()
        
        if len(documents) != len(request.document_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more documents not found or not accessible",
            )
        
        # 2. Fetch chunks from documents
        result = await db.execute(
            select(Chunk)
            .where(Chunk.document_id.in_(request.document_ids))
            .order_by(Chunk.document_id, Chunk.id)
        )
        chunks = result.scalars().all()
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content found in selected documents",
            )
        
        # 3. Build context from chunks
        context_parts = []
        for chunk in chunks:
            context_parts.append(chunk.content)
        full_context = "\n\n".join(context_parts)
        
        # 4. Generate report using LLM
        report_prompt = f"""Generate a comprehensive {request.report_type} report based on the following document content:

Documents: {', '.join([d.filename for d in documents])}

Content:
{full_context[:10000]}  # Limit context size

Create a well-structured report with:
- Executive summary
- Key findings
- Detailed analysis
- Conclusions and recommendations

Format the report in markdown with proper headings, sections, and formatting.
"""
        
        from langchain.schema import HumanMessage, SystemMessage
        
        llm = agent_service._get_llm()
        messages = [
            SystemMessage(content="You are an expert report writer. Generate professional, well-structured reports."),
            HumanMessage(content=report_prompt),
        ]
        
        response = await llm.ainvoke(messages)
        report_content = response.content
        
        # 5. Generate HTML report
        if request.format == "html":
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }}
        h1 {{ color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 30px; }}
        h3 {{ color: #777; }}
        p {{ margin: 15px 0; }}
        ul, ol {{ margin: 15px 0; padding-left: 30px; }}
        code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }}
        pre {{ background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }}
        blockquote {{ border-left: 4px solid #ddd; padding-left: 20px; margin: 20px 0; color: #666; }}
    </style>
</head>
<body>
    <h1>Document Analysis Report</h1>
    <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <p><strong>Documents:</strong> {', '.join([d.filename for d in documents])}</p>
    <hr>
    {_markdown_to_html(report_content)}
</body>
</html>
"""
            
            # Save HTML report
            report_id = uuid.uuid4().hex[:8]
            storage_key = f"tenant_{tenant_id}/reports/{report_id}_report.html"
            
            # Save to local storage
            report_path = storage_service.local_path / storage_key
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(html_content, encoding="utf-8")
            
            # Return API endpoint URL for accessing the report
            report_url = f"/api/{settings.API_VERSION}/agent/reports/{report_id}"
            
        else:  # PDF format (simplified - would use reportlab or weasyprint in production)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF format not yet implemented. Please use 'html' format.",
            )
        
        logger.info(
            "report_generated",
            report_type=request.report_type,
            format=request.format,
            document_count=len(documents),
            tenant_id=tenant_id,
        )
        
        return {
            "report_url": report_url,
            "format": request.format,
            "report_id": report_id,
            "report_type": request.report_type,
            "document_names": [d.filename for d in documents],
            "document_count": len(documents),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("report_generation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}",
        )


@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a generated report file.
    
    Validates that the report belongs to the user's tenant.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Construct storage key
        storage_key = f"tenant_{tenant_id}/reports/{report_id}_report.html"
        report_path = storage_service.local_path / storage_key
        
        # Check if file exists
        if not report_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found",
            )
        
        # Verify tenant access (report path contains tenant_id)
        if f"tenant_{tenant_id}" not in str(report_path):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        
        # Return file
        return FileResponse(
            path=str(report_path),
            media_type="text/html",
            filename=f"report_{report_id}.html",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("report_serve_failed", error=str(e), report_id=report_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve report: {str(e)}",
        )


def _markdown_to_html(markdown: str) -> str:
    """Simple markdown to HTML converter (basic implementation)."""
    import re
    
    html = markdown
    
    # Headers
    html = re.sub(r'^### (.*)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.*)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    
    # Bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    
    # Italic
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```([^`]+)```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)
    
    # Inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    
    # Lists
    html = re.sub(r'^\* (.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    
    # Paragraphs
    paragraphs = html.split('\n\n')
    html = '\n'.join([f'<p>{p.strip()}</p>' if p.strip() and not p.strip().startswith('<') else p for p in paragraphs])
    
    return html

