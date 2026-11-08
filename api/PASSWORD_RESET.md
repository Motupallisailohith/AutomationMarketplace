# Password Reset Feature

Complete password reset implementation for Automation Marketplace, based on n8n's architecture.

## Overview

This feature allows users to reset their password via email when they forget it. The implementation follows industry best practices for security and user experience.

## Architecture

### Components

1. **PasswordResetController** (`src/controllers/password-reset.controller.ts`)
   - Handles HTTP requests for password reset operations
   - Validates inputs and manages error responses

2. **AuthService** (`src/services/auth.service.ts`)
   - `generatePasswordResetToken()` - Creates JWT tokens with 1-hour expiry
   - `verifyPasswordResetToken()` - Validates tokens and returns user
   - `updatePassword()` - Securely updates user password

3. **EmailService** (`src/services/email.service.ts`)
   - Sends password reset emails via SMTP
   - Configurable with multiple email providers
   - Beautiful HTML email template

4. **Routes** (`src/routes/password-reset.routes.ts`)
   - POST `/api/auth/forgot-password` - Request password reset
   - GET `/api/auth/resolve-password-token` - Verify reset token
   - POST `/api/auth/change-password` - Change password with token

## API Endpoints

### 1. Request Password Reset

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "message": "If an account exists with that email, a password reset link has been sent"
}
```

**Response (Email Not Configured):**
```json
{
  "message": "Email sending must be set up in order to request a password reset email"
}
```

### 2. Verify Reset Token

```http
GET /api/auth/resolve-password-token?token=<jwt-token>
```

**Response (Valid Token):**
```json
{
  "message": "Token is valid",
  "userId": "user-id",
  "email": "user@example.com"
}
```

**Response (Invalid Token):**
```json
{
  "message": "Invalid or expired password reset token"
}
```

### 3. Change Password

```http
POST /api/auth/change-password
Content-Type: application/json

{
  "token": "jwt-reset-token",
  "password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password changed successfully. You can now log in with your new password."
}
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:5173

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@automationmarketplace.com
```

### Supported Email Providers

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<app-password>  # Generate at https://myaccount.google.com/apppasswords
```

#### Outlook/Office 365
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=<mailgun-smtp-username>
SMTP_PASS=<mailgun-smtp-password>
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.<region>.amazonaws.com
SMTP_PORT=587
SMTP_USER=<aws-smtp-username>
SMTP_PASS=<aws-smtp-password>
```

## Security Features

1. **Token Expiration**: Reset tokens expire after 1 hour
2. **Rate Limiting**: Password reset requests are rate-limited (5 per 15 minutes)
3. **No User Enumeration**: Same response whether user exists or not
4. **Secure Token Generation**: JWT tokens with purpose validation
5. **Password Validation**: 8-128 characters required
6. **Bcrypt Hashing**: Passwords hashed with 12 salt rounds

## User Flow

1. User clicks "Forgot Password" on login page
2. User enters their email address
3. System generates a secure token and sends email
4. User clicks link in email (redirects to frontend with token)
5. Frontend validates token via `/resolve-password-token`
6. User enters new password
7. Frontend submits password with token to `/change-password`
8. System updates password and user can log in

## Email Template

The password reset email includes:
- Professional gradient header
- Clear reset button with secure link
- Link expiration notice (1 hour)
- Fallback text link
- Branded footer

Example:
```
Subject: Password Reset Request

Hi {firstName},

We received a request to reset your password for your 
Automation Marketplace account. Click the button below 
to create a new password:

[Reset Password Button]

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
```

## Frontend Integration

### Forgot Password Page

Already exists at `frontend/src/pages/Auth/ForgotPassword.tsx`

### Reset Password Page (To Be Created)

```tsx
// frontend/src/pages/Auth/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Verify token on mount
    if (token) {
      axios.get(`/api/auth/resolve-password-token?token=${token}`)
        .then(() => setTokenValid(true))
        .catch(() => setTokenValid(false));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/change-password', { token, password });
      // Redirect to login with success message
      navigate('/login?reset=success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // ... render form
};
```

## Testing

### Test Password Reset Flow

1. **Start the API with email configured:**
   ```bash
   cd api
   # Add SMTP credentials to .env
   pnpm dev
   ```

2. **Test forgot password endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. **Check email for reset link**

4. **Extract token from email and verify:**
   ```bash
   curl "http://localhost:3000/api/auth/resolve-password-token?token=<token>"
   ```

5. **Reset password:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/change-password \
     -H "Content-Type: application/json" \
     -d '{"token":"<token>","password":"newPassword123"}'
   ```

### Development Mode (No Email)

If SMTP is not configured, the endpoint returns:
```json
{
  "message": "Email sending must be set up in order to request a password reset email"
}
```

You can temporarily modify `email.service.ts` to log tokens instead:
```typescript
// In development, log token instead of sending email
if (process.env.NODE_ENV === 'development') {
  console.log('Password reset token:', resetToken);
  console.log('Reset URL:', resetUrl);
}
```

## Troubleshooting

### Email Not Sending

1. Check SMTP credentials in `.env`
2. Verify SMTP port (587 for TLS, 465 for SSL)
3. For Gmail, use [App Passwords](https://myaccount.google.com/apppasswords)
4. Check logs for detailed error messages

### Token Invalid

- Tokens expire after 1 hour
- Ensure JWT_SECRET matches between token generation and verification
- Check system clock sync

### Rate Limit Hit

- Wait 15 minutes or adjust rate limit in `index.ts`:
  ```typescript
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Increase this
  });
  ```

## Comparison with n8n

This implementation closely follows n8n's password reset architecture:

| Feature | n8n | Automation Marketplace |
|---------|-----|----------------------|
| Token expiry | 1 hour | 1 hour ✓ |
| Email service | UserManagementMailer | EmailService ✓ |
| Token storage | JWT | JWT ✓ |
| Rate limiting | 3 per window | 5 per window ✓ |
| User enumeration protection | Yes | Yes ✓ |
| HTML email template | Yes | Yes ✓ |

## Future Enhancements

- [ ] Add email templates for different languages (i18n)
- [ ] Support multiple email providers with fallback
- [ ] Add email verification for new accounts
- [ ] Implement password strength meter on frontend
- [ ] Add password history (prevent reuse of last N passwords)
- [ ] Send notification email after successful password change
- [ ] Add audit logging for password reset attempts
- [ ] Support custom email templates via configuration

## Files Created/Modified

### New Files
- `src/controllers/password-reset.controller.ts` - Password reset controller
- `src/services/email.service.ts` - Email sending service
- `src/routes/password-reset.routes.ts` - Password reset routes

### Modified Files
- `src/services/auth.service.ts` - Added token methods
- `src/index.ts` - Added password reset routes
- `package.json` - Added nodemailer dependency
- `.env.example` - Added SMTP configuration

## Dependencies

- `nodemailer@^6.9.7` - Email sending library
- `@types/nodemailer@^6.4.14` - TypeScript types
- `jsonwebtoken` - Already included for JWT tokens
- `express-validator` - Already included for validation
