FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY Frontend ./Frontend
RUN npm run build

FROM python:3.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/Backend
COPY Backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY Backend ./
COPY --from=frontend /app/Frontend/dist /app/Frontend/dist
# Collect Django admin assets without connecting to PostgreSQL.
RUN DJANGO_SECRET_KEY=build-only-not-used-at-runtime DJANGO_DEBUG=False python manage.py collectstatic --noinput
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60"]
