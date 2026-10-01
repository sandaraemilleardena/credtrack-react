# CredTrack authentication revisions (requirements 23–42)

The existing implementation was inspected and extended in place.

## Implemented behavior
- Failed attempts 1–2 return Invalid username or password. Attempt 3 activates a database-backed 60-second lock and the exact one-minute message. After expiry, three further failures permanently lock the account until ICT unlocks it. Correct credentials cannot bypass an active lock. Successful login resets the failed-attempt cycle.
- ICT User Access displays lock status and offers an audited Unlock Account action. Django enforces ICT-only permission. Forged client counters, timestamps, roles and lock flags are ignored.
- All three staff login pages link to Forgot Password. Username and registered email are required; only a matching account receives a reset email. Responses remain generic even when SMTP fails or the reset origin is misconfigured.
- Django tokens expire after one hour and become unusable after a successful password change. Malformed, tampered, expired and out-of-range account identifiers are rejected. Password validation and hashing use Django. Password changes invalidate existing sessions; temporary and permanent account locks remain intact.
- React reset forms validate required fields, email format, password length and matching confirmation; Django remains the final authority for password policy and token validity.
- Login checks now lock the account row before reading the password, coordinating with password changes. Audit events exclude passwords, reset tokens and uploaded-document contents.

## Files changed in this pass
Backend/accounts/security.py; Backend/accounts/password_reset.py; Backend/accounts/test_security.py; Frontend/src/PasswordReset.jsx.

No new database fields or migrations were needed in this pass. The earlier accounts/0002 migration remains required, alongside the credential migrations already listed in the main handover.

## Validation
62 backend tests passed on isolated SQLite; 9 frontend session tests passed; production build and targeted reset-page lint passed. An additional test extracts the actual generated email link, changes the password through the API, logs in with the new password and rejects link reuse. Email tests use Django's in-memory mail backend, not real SMTP.

## Commands
Run these from C:\Users\hunny\OneDrive\Desktop\credtrack-react with the application's functioning Python environment:

```powershell
python -m pip install -r Backend/requirements.txt
python Backend/manage.py migrate
python Backend/manage.py test accounts credentials operations --settings=credentials.test_settings --noinput
node --test Frontend/tests/session.test.mjs
npm run build
node node_modules/eslint/bin/eslint.js Frontend/src/PasswordReset.jsx
```

## Configuration and remaining deployment work
Set process environment values from Backend/.env.example: EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS, DEFAULT_FROM_EMAIL and CREDTRACK_FRONTEND_URL. No real credentials were added to source. PASSWORD_RESET_TIMEOUT is 3600. Django does not automatically load .env files in this project.

The application runtime still needs the earlier migrations applied and a real SMTP delivery test. Live PostgreSQL migrations and concurrent PostgreSQL behavior were not verified in this session because the available runtime could not load the installed PostgreSQL driver. The Vite large-chunk warning remains. These passing tests are not a claim of a complete security audit.
