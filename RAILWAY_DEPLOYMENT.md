# CredTrack on Railway

## Browser security headers

The updated Django middleware adds Content-Security-Policy and Permissions-Policy
when deployed with DJANGO_DEBUG=False. Frame, MIME-type and referrer protections
also cover WhiteNoise assets, redirects and errors. The CSP allows existing font
services, React inline styles and blob PDF previews; executable scripts are limited
to the same origin. Unused camera, microphone, location, payment and USB access
is disabled. Local Vite development does not enforce the production CSP.

HSTS starts at 3600 seconds on HTTPS responses. After verifying HTTPS and application
flows, set DJANGO_HSTS_SECONDS=31536000 in Railway for one year. Subdomain enforcement
and preload remain disabled until all subdomains are verified. The trusted Railway
proxy must overwrite X-Forwarded-Proto; do not expose the origin directly to clients.

Deploy these changes through the existing Railway service, then check the live
headers with `curl.exe -I https://pmrmis-southcredtrack.site/` and rescan the domain.
Verify login, forms, fonts/icons, charts, PDF/image previews, downloads and Django
admin in a browser, checking for CSP console violations. Local tests do not prove
that the deployed proxy preserves the headers.

Deploy the repository root as ONE Docker service. Django serves the built React app and API from the same domain; no separate frontend service or VITE_API_BASE_URL is needed. This preserves session cookies and CSRF.

1. Connect the GitHub repository to Railway. Keep service root at the repository root. The Dockerfile builds React and installs Django dependencies. railway.json applies migrations before each deployment.
2. Add a Railway PostgreSQL service and reference its PGDATABASE, PGUSER, PGPASSWORD, PGHOST and PGPORT variables in the app service (for example `PGHOST=${{Postgres.PGHOST}}`). Do not set the local DB_* values in Railway; they take precedence.
3. Set DJANGO_DEBUG=False, a new random DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS=pmrmis-southcredtrack.site, DJANGO_FRONTEND_ORIGINS=https://pmrmis-southcredtrack.site and FRONTEND_URL=https://pmrmis-southcredtrack.site. Railway supplies PORT automatically.
4. For Railway Free/Trial/Hobby, use Resend HTTPS email delivery (SMTP is blocked). Verify pmrmis-southcredtrack.site in Resend and create a sending-only API key. Set EMAIL_BACKEND=accounts.email_backend.ResendEmailBackend, RESEND_API_KEY to the private key, DEFAULT_FROM_EMAIL=noreply@pmrmis-southcredtrack.site, and FRONTEND_URL=https://pmrmis-southcredtrack.site in the app service's Railway Variables. Never commit the key or put it in a VITE_* variable. Deploy the updated code and variables together. Gmail is still supported as the recipient; the sender uses your verified domain. No Gmail App Password is needed for this backend. SMTP remains available as an alternative only on supported hosting/plans.
5. Add a persistent Railway volume mounted at /app/Backend/private_documents. Existing uploaded identity documents must be copied privately into this volume if moving existing data.
6. Add pmrmis-southcredtrack.site under the app service's Networking settings. Use the DNS records Railway displays and wait for its HTTPS certificate.
7. After deployment, verify role selection/PIN, staff login, credential submission, document viewing, reset-email delivery, and the 3+3 lockout.

## Existing database data

GitHub contains schema migrations, NOT your PostgreSQL accounts, requests, passwords or uploaded documents. The local database has all current migrations applied. A new Railway database starts empty.

To transfer existing data, use a private pg_dump backup and restore it into the Railway database before opening the site to users, then run migrations. Do not commit or upload database backups to GitHub. Keep a backup before restoring. Set the production connection only when the target is confirmed; importing a database can replace target data.

If starting fresh, create the initial superuser using Railway's shell (python manage.py createsuperuser), then configure staff roles, registered emails and grade sections.

The temporary 1025 PIN is only a frontend entry gate. Django staff login remains the authorization boundary.

## Validation

Login policy: three failed attempts cause a one-minute cooldown; three further
failures require ICT to unlock the account. The IP limiter permits 60 attempts
per one-minute window. Sessions expire after 15 minutes of user inactivity.
The browser sends CSRF-protected activity updates for real input; dashboard
polling and session checks do not renew the idle deadline. Deploy frontend and
backend together so the activity endpoint is available, and restart the local
Django server plus reload the browser when testing these changes.

Frontend: npm ci, npm run lint, npm run build, node --test Frontend/tests/session.test.mjs, node Frontend/tests/run-portal-render.mjs.
Backend: python manage.py check, python manage.py makemigrations --check --dry-run, python manage.py test accounts credentials operations --settings=credentials.test_settings.
