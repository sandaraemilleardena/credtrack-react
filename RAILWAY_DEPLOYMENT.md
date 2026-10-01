# CredTrack on Railway

Deploy the repository root as ONE Docker service. Django serves the built React app and API from the same domain; no separate frontend service or VITE_API_BASE_URL is needed. This preserves session cookies and CSRF.

1. Connect the GitHub repository to Railway. Keep service root at the repository root. The Dockerfile builds React and installs Django dependencies. railway.json applies migrations before each deployment.
2. Add a Railway PostgreSQL service and reference its PGDATABASE, PGUSER, PGPASSWORD, PGHOST and PGPORT variables in the app service (for example `PGHOST=${{Postgres.PGHOST}}`). Do not set the local DB_* values in Railway; they take precedence.
3. Set DJANGO_DEBUG=False, a new random DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS=pmrmis-southcredtrack.site, DJANGO_FRONTEND_ORIGINS=https://pmrmis-southcredtrack.site and FRONTEND_URL=https://pmrmis-southcredtrack.site. Railway supplies PORT automatically.
4. Set EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_USE_TLS=True, EMAIL_HOST_USER to the sending account, EMAIL_HOST_PASSWORD to its App Password, and DEFAULT_FROM_EMAIL to the same sender. Keep these in Railway Variables. Gmail SMTP connectivity must be tested from Railway; local delivery does not prove cloud connectivity.
5. Add a persistent Railway volume mounted at /app/Backend/private_documents. Existing uploaded identity documents must be copied privately into this volume if moving existing data.
6. Add pmrmis-southcredtrack.site under the app service's Networking settings. Use the DNS records Railway displays and wait for its HTTPS certificate.
7. After deployment, verify role selection/PIN, staff login, credential submission, document viewing, reset-email delivery, and the 3+3 lockout.

## Existing database data

GitHub contains schema migrations, NOT your PostgreSQL accounts, requests, passwords or uploaded documents. The local database has all current migrations applied. A new Railway database starts empty.

To transfer existing data, use a private pg_dump backup and restore it into the Railway database before opening the site to users, then run migrations. Do not commit or upload database backups to GitHub. Keep a backup before restoring. Set the production connection only when the target is confirmed; importing a database can replace target data.

If starting fresh, create the initial superuser using Railway's shell (python manage.py createsuperuser), then configure staff roles, registered emails and grade sections.

The temporary 1025 PIN is only a frontend entry gate. Django staff login remains the authorization boundary.

## Validation

Frontend: npm ci, npm run lint, npm run build, node --test Frontend/tests/session.test.mjs, node Frontend/tests/run-portal-render.mjs.
Backend: python manage.py check, python manage.py makemigrations --check --dry-run, python manage.py test accounts credentials operations --settings=credentials.test_settings.
