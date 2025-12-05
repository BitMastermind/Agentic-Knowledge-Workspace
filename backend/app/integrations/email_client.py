"""Email client for sending emails via SMTP."""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from typing import Dict

from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailClient:
    """SMTP email client for sending emails."""

    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        use_tls: bool = True,
    ):
        """
        Initialize email client.
        
        Args:
            smtp_host: SMTP server hostname
            smtp_port: SMTP server port (587 for TLS, 465 for SSL)
            smtp_user: SMTP username/email
            smtp_password: SMTP password
            use_tls: Whether to use TLS encryption
        """
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.use_tls = use_tls

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        body_html: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
    ) -> Dict[str, str]:
        """
        Send an email.
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            body: Plain text email body
            body_html: Optional HTML email body
            cc_emails: Optional CC recipients
            bcc_emails: Optional BCC recipients
        
        Returns:
            Dict with status and message_id
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_user
            msg["To"] = ", ".join(to_emails)
            
            if cc_emails:
                msg["Cc"] = ", ".join(cc_emails)
            
            # Add body parts
            part1 = MIMEText(body, "plain")
            msg.attach(part1)
            
            if body_html:
                part2 = MIMEText(body_html, "html")
                msg.attach(part2)
            
            # Collect all recipients
            recipients = to_emails.copy()
            if cc_emails:
                recipients.extend(cc_emails)
            if bcc_emails:
                recipients.extend(bcc_emails)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg, to_addrs=recipients)
            
            logger.info(
                "email_sent",
                to=to_emails,
                subject=subject[:50],
            )
            
            return {
                "status": "sent",
                "message": f"Email sent successfully to {', '.join(to_emails)}",
            }
            
        except smtplib.SMTPException as e:
            logger.error("email_send_failed", error=str(e), to=to_emails)
            raise ValueError(f"Failed to send email: {str(e)}")
        except Exception as e:
            logger.error("email_unexpected_error", error=str(e))
            raise

    def test_connection(self) -> bool:
        """Test SMTP connection."""
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.smtp_user, self.smtp_password)
            return True
        except Exception as e:
            logger.error("email_connection_test_failed", error=str(e))
            return False

