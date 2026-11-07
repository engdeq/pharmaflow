# PharmaFlow — Pharmacy Management System

Modern pharmacy management platform with animated auth, JWT RBAC, POS, inventory, purchases, reports, and database-driven menus.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (local or in-memory fallback for development)

## Quick start

```bash
# Install
npm install
npm install --prefix client
npm install --prefix server

# Run both
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000

## Default admin

- Username: `admin`
- Password: `Admin@123`

## Environment

Create `server/.env`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pharmacy
JWT_SECRET=change_me_in_production
```

## Production notes

1. Build client: `npm run build --prefix client`
2. Serve `client/dist` behind Nginx or Express static
3. Run API with PM2: `pm2 start server/index.js --name pharmaflow-api`
4. Use a real MongoDB instance in production
