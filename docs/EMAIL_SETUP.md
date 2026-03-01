# Email Notifications Setup

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com
```

## Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password in `MAIL_PASSWORD`

## Installation

Install Flask-Mail:
```bash
poetry add Flask-Mail
```

## Features

The system sends email notifications for:

1. **File Upload Success**: When a file is successfully uploaded
2. **Compliance Check Complete**: When compliance analysis is finished

## Test Endpoint

Test the email functionality:
```bash
POST /email/test
{
  "user_id": "your_user_id"
}
```

## Email Templates

- **Upload Success**: Simple text email confirming file upload
- **Compliance Check**: Email with compliance status and dashboard link
