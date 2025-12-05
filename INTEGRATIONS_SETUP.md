# Integrations Setup Guide

This guide explains how to set up Jira and Email integrations for the Agent Actions feature.

## Current Status

### ✅ Email Draft Generation

**Status:** ✅ **Working** (No configuration needed)

The email draft generation feature works out of the box. It uses the LLM to generate email drafts based on context. No email service configuration is required for this feature.

**What it does:**

- Generates professional email drafts with subject and body
- Supports different tones (professional, casual, formal, friendly)
- Returns editable drafts that users can review before sending

**Note:** Currently, the email draft feature only **generates** drafts. It does **not** send emails. To add email sending functionality, see "Email Sending" below.

### ⚠️ Jira Ticket Creation

**Status:** ⚠️ **Requires Configuration**

The Jira integration is implemented but requires credentials to be configured.

## Setup Instructions

### 1. Jira Integration Setup

#### Step 1: Get Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a label (e.g., "Agentic Workspace")
4. Copy the generated token (you'll only see it once!)

#### Step 2: Get Your Jira Server URL

Your Jira server URL format is:

- Cloud: `https://yourcompany.atlassian.net`
- Server/Data Center: `https://jira.yourcompany.com`

#### Step 3: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Jira Configuration
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
```

#### Step 4: Restart Backend Server

```bash
# Stop the server (Ctrl+C) and restart
uvicorn app.main:app --reload
```

#### Step 5: Test Jira Integration

1. Go to the chat page
2. Click the **"Jira Ticket"** button
3. Fill in:
   - **Project Key**: Your Jira project key (e.g., "PROJ", "DEV")
   - **Summary**: Ticket title
   - **Description**: Ticket description
   - **Issue Type**: Task, Bug, Story, etc.
4. Click **"Create Ticket"**

**Troubleshooting:**

- **"Jira credentials not configured"**: Check that all three environment variables are set
- **"Failed to connect to Jira"**: Verify your JIRA_URL is correct
- **"Authentication failed"**: Check your email and API token
- **"Project not found"**: Verify the project key exists in your Jira instance

### 2. Email Sending Setup (Optional)

Currently, the email draft feature only generates drafts. To add email **sending** functionality:

#### Step 1: Choose Email Provider

**Option A: Gmail (Recommended for Testing)**

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create an app password for "Mail"
4. Copy the 16-character password

**Option B: Other SMTP Providers**

- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your organization's SMTP server

#### Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
```

**For Gmail:**

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=your-email@gmail.com`
- `SMTP_PASSWORD=your-16-char-app-password`

**For Outlook:**

- `SMTP_HOST=smtp-mail.outlook.com`
- `SMTP_PORT=587`
- `SMTP_USER=your-email@outlook.com`
- `SMTP_PASSWORD=your-password`

#### Step 3: Update Email Draft Endpoint (If Needed)

The current implementation only generates drafts. To add sending functionality, you would need to:

1. Update the frontend to include a "Send Email" button
2. Create a new endpoint `/agent/send-email` that uses the `EmailClient`
3. Or modify the existing endpoint to optionally send emails

**Example implementation** (not currently in code):

```python
# In backend/app/api/v1/agent.py
from app.integrations.email_client import EmailClient

@router.post("/send-email")
async def send_email(
    to_emails: List[str],
    subject: str,
    body: str,
    current_user: dict = Depends(require_tenant_access),
):
    """Send an email using SMTP."""
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        raise HTTPException(
            status_code=400,
            detail="Email service not configured"
        )

    email_client = EmailClient(
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
    )

    result = email_client.send_email(
        to_emails=to_emails,
        subject=subject,
        body=body,
    )

    return result
```

## Testing Integrations

### Test Jira Connection

You can test the Jira connection by creating a test ticket:

1. Use a test project key
2. Create a simple ticket
3. Check your Jira instance to verify it was created

### Test Email Connection

The `EmailClient` has a `test_connection()` method. You can create a test endpoint:

```python
@router.get("/test-email")
async def test_email_connection():
    """Test email SMTP connection."""
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        return {"status": "not_configured"}

    email_client = EmailClient(
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
    )

    is_connected = email_client.test_connection()
    return {"status": "connected" if is_connected else "failed"}
```

## Security Notes

1. **Never commit credentials to Git**: Always use `.env` files (which should be in `.gitignore`)
2. **Use App Passwords**: For Gmail, use app passwords instead of your main password
3. **API Tokens**: Store Jira API tokens securely
4. **Environment Variables**: In production, use secure secret management (AWS Secrets Manager, etc.)

## Current Limitations

1. **Email Sending**: Email drafts are generated but not automatically sent (by design for safety)
2. **Tenant-Specific Credentials**: Currently uses global credentials. Future enhancement: per-tenant credentials
3. **Error Handling**: Basic error handling is in place, but could be enhanced with retry logic

## Quick Reference

### Required Environment Variables

**For Jira:**

```env
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

**For Email Sending (Optional):**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Feature Status

| Feature                | Status             | Configuration Required  |
| ---------------------- | ------------------ | ----------------------- |
| Email Draft Generation | ✅ Working         | ❌ No                   |
| Email Sending          | ⚠️ Not Implemented | ✅ Yes (if implemented) |
| Jira Ticket Creation   | ⚠️ Needs Config    | ✅ Yes                  |

## Next Steps

1. **For Jira**: Add credentials to `.env` and test ticket creation
2. **For Email Sending**: Implement the send endpoint if needed (currently only drafts are generated)
3. **Future**: Add per-tenant credential storage for multi-tenant scenarios
