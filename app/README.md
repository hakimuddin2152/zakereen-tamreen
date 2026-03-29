# Zakereen Tamreen — زاکرین تمرین

A private web app for tracking Marasiya/Noha recitation group practice sessions.

## Setup

### 1. Configure environment — edit `app/.env.local`:
```
DATABASE_URL="postgresql://user:password@host:5432/zakereen_tamreen"
AUTH_SECRET="run: openssl rand -hex 32"
AUTH_URL="http://localhost:3000"
STORAGE_BUCKET="zakereen-audio"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY_ID="..."
STORAGE_SECRET_ACCESS_KEY="..."
STORAGE_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
```

### 2. Push DB schema + seed
```bash
npm run db:push
npm run db:seed
```
Default admin: `admin` / `admin1234` — change after first login.

### 3. Run
```bash
npm run dev
```
