# CredTrack revision handover

Changes were applied to the existing project at `C:\Users\hunny\OneDrive\Desktop\credtrack-react`. Existing staged settings, account tests and Vite changes were preserved. No production database migration or real email/SMS delivery was performed.

## Implemented

- Separate first/middle/last names; React and Django validation; numeric 12-digit LRN; +63 followed by 10 mobile digits starting with 9.
- Grades 1–10 each use FAITH, HUMILITY, LOVE, KINDESS and HOPE, as supplied. Grade changes clear the section. `credentials/options.py` supplies the defaults; the existing Preference model supports configuration overrides.
- Purpose dropdown, disabled/cleared conditional Other Reason/Purpose, required private PDF/PNG/JPEG verification upload up to 5 MB, claim method and conditional receiving school.
- PostgreSQL-backed annual reference sequence (`CT-YYYY-00001`) with transactional row locking and uniqueness. Internal UUIDs remain stable for API relationships. Existing request references are backfilled in chronological order.
- Administration and Principal dashboard review modals; labeled View button; grouped request details; persisted confirmation/approval/release status; orange confirmation action and green confirmed state. Principal rejection is available in the dashboard modal.
- Administration can attach verification documents to legacy unconfirmed requests. Historical full names and approval history are retained without guessing name parts or claiming historical identity verification.
- Private storage with server-generated filenames, extension/MIME/parser validation, authorized attachment downloads, no public file URLs, no-store headers and document-access audit events.
- Principal snapshot and queue exclude requests not yet forwarded. Existing session and role route guards remain active. Missing Principal students/profile routes are guarded aliases to the existing approvals/dashboard pages, not newly designed pages.
- Three failed attempts cause a one-minute server lock; three further failures after expiry require ICT unlock. Successful authentication resets the cycle. Lockouts apply through the configured Django authentication backend, including Django admin authentication; already locked sessions cannot read protected API data.
- ICT-only unlock with actor, account and timestamp audit; account lock states in User Access. Existing explicitly authorized Admin account-management behavior remains, but Admin cannot invoke unlock.
- Username + registered email reset request, generic response, database rate limits, server-generated one-hour tokens, single use through password-hash invalidation, Django password validation/hashing, existing-session invalidation. Neither temporary nor permanent locks are cleared by password reset.
- Authentication/reset/unlock audit events contain no passwords, reset tokens or document contents. SMTP and Semaphore configuration comes from environment variables.

## Main files changed or added

Backend: `accounts/models.py`, `security.py`, `password_reset.py`, `views.py`, `urls.py`, `test_security.py`; `config/settings.py`; `credentials/models.py`, `documents.py`, `options.py`, `serializers.py`, `services.py`, `views.py`, `urls.py`, `tests.py`, `postgres_test_settings.py`, `management/commands/configure_grade_sections.py`; `operations/views.py`; `requirements.txt`; `.env.example`.

Frontend: `login.jsx/css`, `PasswordReset.jsx`, `app.jsx`, Administration dashboard/credential-management/reports/student-record files, Principal dashboard/approvals, ICT User Access, `api/credentials.js`, `api/portalData.js`, `components/RequestWorkflowDetails.jsx/css`, `RequestReviewModal.jsx`, `VerificationUpload.jsx`. Root `.gitignore` and ESLint generated-directory exclusions were updated.

## Database changes and migrations

- `accounts/0002_securityratelimit_userprofile_account_locked_and_more`: account failed-attempt/lock/unlock metadata and persistent rate-limit records.
- `credentials/0002_referencesequence_credentialrequest_confirmed_at_and_more`: reference sequence, name parts, identity file/hash, confirmation timestamp, purpose/delivery fields.
- `credentials/0003_backfill_references`: assigns references to existing records. Reversal intentionally retains assigned references; reversing the earlier schema migration removes those fields.
- `credentials/0004_alter_credentialrequest_status`: status labels and Rejected state.

Run migrations with the application's working Python environment before using the updated backend. Stop application writers during migration/backfill and take the normal database backup first. The live PostgreSQL database was not migrated by this task: the available Python runtime could run isolated tests but could not load the installed PostgreSQL driver. Existing virtual environments also referenced another computer or their executables could not be launched from this session.

## Setup and exact commands (PowerShell)

Using your functioning Python installation/environment:

```powershell
Set-Location 'C:\Users\hunny\OneDrive\Desktop\credtrack-react'
# Activate the environment used to run your Django server, then:
python -m pip install -r Backend/requirements.txt
python Backend/manage.py migrate
python Backend/manage.py check
python Backend/manage.py runserver 7788
```

In a separate terminal:

```powershell
Set-Location 'C:\Users\hunny\OneDrive\Desktop\credtrack-react'
npm run dev
```

Environment variables are documented in `Backend/.env.example`. Django reads process environment variables; merely creating a `.env` file does not load them. Supply `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`, and `CREDTRACK_FRONTEND_URL`. Use an SMTP account authorized to send from the configured address. Keep existing PostgreSQL values. Set `PRIVATE_DOCUMENT_ROOT` to a server-only directory outside any public web root (and preferably outside OneDrive for real student documents); omit it only for local development. Do not expose that directory through the web server. Install the added Pillow and pypdf dependencies in the actual server environment.

For deployment, set `DJANGO_DEBUG=False`, a real `DJANGO_SECRET_KEY`, allowed hosts and HTTPS frontend origins. Existing cookies use Secure outside debug. The project still has an existing development database-password fallback; production must supply `DB_PASSWORD` rather than relying on it.

Optional section override, using a JSON object mapping grade names to actual section-name arrays:

```powershell
python Backend/manage.py configure_grade_sections 'C:\path\to\school-sections.json'
```

## Test commands and results

```powershell
Set-Location 'C:\Users\hunny\OneDrive\Desktop\credtrack-react'
python Backend/manage.py test accounts credentials operations --settings=credentials.test_settings --noinput
python Backend/manage.py makemigrations --check --dry-run --settings=credentials.test_settings
node --test Frontend/tests/session.test.mjs
node Frontend/tests/run-portal-render.mjs
npm run build
npm run lint
```

Results: 51 backend tests passed on isolated in-memory SQLite; 9 frontend session tests passed; 28 empty/populated portal render checks passed; production build passed; migration consistency check passed. Browser checks verified field-specific required errors, 12-digit LRN input, conditional purpose enabling/clearing, grade selection and conditional receiving-school fields. No real student submission or real password-reset email was sent.

The exact alternate backend test invocation used in this session was:

```powershell
Set-Location 'C:\Users\hunny\OneDrive\Desktop\credtrack-react\Backend'
$env:PYTHONPATH='C:\Users\hunny\OneDrive\Desktop\credtrack-react\Backend\.venv\Lib\site-packages'
& 'C:\Users\hunny\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' manage.py test accounts credentials operations --settings=credentials.test_settings --noinput
```

This alternate runtime is for the isolated checks, not a replacement production environment.

## Remaining verification and limitations

- Apply the migrations and install upload dependencies in the actual server environment. Verify SMTP delivery and private storage permissions with deployment configuration.
- PostgreSQL concurrency behavior was designed with transactions, row locks and unique constraints but not exercised against PostgreSQL here. Run tests against a dedicated test database with `python Backend/manage.py test accounts credentials operations --settings=credentials.postgres_test_settings --noinput`; the configured DB user must be allowed to create the test database. Never point `CREDTRACK_TEST_DATABASE` at a live database.
- Existing pending requests without an ID require Administration to attach one before confirmation/approval. Historical completed records are preserved.
- PDF parsing/file signatures validate supported content, not malware scanning. Private documents are served only as authorized downloads.
- Annual references stop at 99,999 rather than silently breaking the five-digit format.
- Full-project lint still reports pre-existing React purity issues in ICT Data Protection/System Maintenance and unused React imports in visual test fixtures. Generated builds and Python virtual environments are now excluded from lint. The build reports a large-chunk warning. One old portal test fixture without a reference produces a React list-key warning; render assertions pass.
- Authenticated dashboard visual interactions and all production database/email scenarios still need a deployment smoke test. These results are not a claim of a complete security audit.
