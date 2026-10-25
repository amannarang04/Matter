# Production Deployment Guide: Matter

This is a copy-paste-ready, step-by-step checklist to deploy **Matter** across:
- **Database**: MongoDB Atlas (Free Tier M0)
- **Backend API & Engine**: Render Web Service (Free Tier)
- **Frontend Studio UI**: Vercel (Free Tier)

---

## 0. Demo & Evaluation Pre-Warm Notice

> [!IMPORTANT]
> **Render Free Tier Spin-Down**: Render suspends free web services after 15 minutes of inactivity. When a new request arrives, it takes **30–50 seconds** to boot.
>
> **Action**: Open your Render health check URL (`https://your-backend.onrender.com/api/health`) in your browser **60–90 seconds before** evaluators open the application or before presenting a demo.
>
> If an evaluator opens the frontend while the backend is asleep, Matter will display a clear notification:
> `Waking up the server, this can take up to a minute...`
> and automatically retries connecting every 3 seconds.

---

## 1. MongoDB Atlas Setup (Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log in.
2. **Create Cluster**:
   - Click **Create Deployment** -> select **M0 Free**.
   - Cloud Provider & Region: **AWS / closest region to your evaluators** (e.g., `ap-south-1` Mumbai or `us-east-1` N. Virginia).
   - Cluster Name: `matter-cluster` (or default `Cluster0`). Click **Create**.
3. **Database User**:
   - Navigate to **Security** -> **Database Access** -> **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `matter_admin`.
   - Autogenerate or set a strong Password (save this safely).
   - Database User Privileges: `Read and write to any database`. Click **Add User**.
4. **Network Access (IP Whitelist)**:
   - Navigate to **Security** -> **Network Access** -> **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Security Tradeoff Note*: Render free-tier services run on shared compute pools with dynamic egress IP addresses. Whitelisting `0.0.0.0/0` is necessary so Render's containers can communicate with MongoDB Atlas. Do not commit or publicly disclose your database user password.
5. **Get Connection String**:
   - Navigate to **Deployment** -> **Database** -> Click **Connect**.
   - Select **Drivers** (Node.js version 5.5 or later).
   - Copy the SRV connection URI:
     ```
     mongodb+srv://<username>:<password>@<cluster-url>/matter?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your credentials, and ensure the database name `/matter` is present before the query string `?`.

---

## 2. One-Time Database Seeding (Seed on Demand)

Before launching the web services, seed the initial `Discount & Tier Evaluation` template workflow into your MongoDB Atlas cluster:

### Windows (PowerShell):
```powershell
cd server
$env:MONGODB_URI="mongodb+srv://matter_admin:<password>@<cluster-url>/matter?retryWrites=true&w=majority"
npm run seed
```

### macOS / Linux (Bash):
```bash
cd server
MONGODB_URI="mongodb+srv://matter_admin:<password>@<cluster-url>/matter?retryWrites=true&w=majority" npm run seed
```

You should see:
```text
Connecting to MongoDB...
Seeded default Discount & Tier Evaluation workflow (ID: ...)
Seeding finished successfully.
```

---

## 3. Backend Deployment on Render

1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository containing `matter`.
3. Configure the service settings:
   - **Name**: `matter-backend`
   - **Region**: Same region or geographically close to your Atlas cluster
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Expand **Advanced** -> **Health Check Path**:
   - Set to: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production error masking & rate limits |
   | `PORT` | `5000` | Port for Express listener |
   | `MONGODB_URI` | `mongodb+srv://...` | Full Atlas connection string from Step 1 |
   | `CLIENT_ORIGIN` | `http://localhost:5173` | Temporary value until Vercel URL is created |
6. Click **Create Web Service**.
7. Wait 2–3 minutes for the build to finish. Once healthy, copy your Render service URL:
   `https://matter-backend.onrender.com`

---

## 4. Frontend Deployment on Vercel

1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Select your `matter` GitHub repository and click **Import**.
3. Configure project settings:
   - **Project Name**: `matter-studio`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `client`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://matter-backend.onrender.com` |
   *(Use your exact Render backend URL from Step 3 without trailing slash)*
5. Click **Deploy**.
6. Deployment will complete in under 1 minute. Copy your live Vercel URL:
   `https://matter-studio.vercel.app`

---

## 5. Final Two-Way CORS Linkage

1. Return to the [Render Dashboard](https://dashboard.render.com/) -> select `matter-backend`.
2. Go to **Environment**.
3. Update the `CLIENT_ORIGIN` variable to allow both local development and your production Vercel app (comma-separated):
   ```
   http://localhost:5173,https://matter-studio.vercel.app
   ```
4. Click **Save Changes**. Render will automatically redeploy the service with updated CORS rules in ~60 seconds.

---

## 6. Evaluator Smoke Test Sequence

Run through these 7 checks to verify complete end-to-end functionality:

1. **Health & Readiness Check**:
   - Open `https://matter-backend.onrender.com/api/health` in your browser.
   - Verify response:
     ```json
     {
       "status": "ok",
       "database": "connected"
     }
     ```
2. **Studio Load**:
   - Open `https://matter-studio.vercel.app`.
   - The canvas should load the seeded **Discount & Tier Evaluation** workflow with 6 interconnected nodes (`Input Prices`, `Calculate Discount`, `Calculate Discounted Price`, `Check Price Threshold`, `Premium Tier Output`, `Standard Tier Output`).
3. **Execution & Live SSE Stream**:
   - Click the blue **Run Workflow** button in the header.
   - Observe nodes highlighting in real-time, progress ring pulsing, and terminal logs appearing in the bottom Execution panel.
   - Verify terminal displays `Execution completed successfully`.
4. **Data Inspector**:
   - Click on the `Calculate Discount` node.
   - The right sidebar inspector should populate with node configuration parameters (`originalPrice`, `discountRate`, `multiply`).
5. **Execution History**:
   - Click the clock icon (**History**) in the top navbar.
   - Verify your executed run appears in the list with duration, status, and node count.
   - Click **Retry** on the run and observe it re-executing.
6. **Error Handling**:
   - Click on `Input Prices`, change `discountRate` to an invalid string `abc`, and click **Run Workflow**.
   - Verify the engine catches the error, marks the node red, and displays a clean error banner without system crashes.
7. **SPA Refresh**:
   - Refresh the browser (`Ctrl+F5` / `Cmd+R`).
   - The client-side rewrite (`vercel.json`) ensures the app reloads cleanly without a 404 error, and restores the active workflow from database/storage.

---

## 7. Troubleshooting Guide

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error** in browser console (`CORS blocked: Origin ... not allowed`) | `CLIENT_ORIGIN` in Render does not match your exact Vercel URL. | Check Render Environment -> `CLIENT_ORIGIN`. Ensure it has no trailing slash and matches `https://your-app.vercel.app`. Allow multiple origins separated by commas: `http://localhost:5173,https://your-app.vercel.app`. |
| **SSE Stream Dropping / No live node animations** | Proxy buffer timeout or interrupted HTTP connection. | Matter's backend sends automated `: ping` heartbeats every 15s and sets `X-Accel-Buffering: no`. The client automatically falls back to polling `GET /api/runs/:id` if the stream drops, so runs complete reliably even on aggressive networks. |
| **502 Bad Gateway / Waking Banner Displayed** | Render free instance is cold-booting after idle sleep. | Normal behavior on free tier. The client automatically displays `Waking up the server, this can take up to a minute...` and auto-retries every 3 seconds until online. Pre-warm by opening `/api/health` 1 min before demos. |
| **Database Disconnected (`status: "degraded", database: "disconnected"`)** | Atlas Network Access IP whitelist is blocking Render, or invalid credentials. | In MongoDB Atlas -> Network Access, ensure `0.0.0.0/0` is active. Check Render logs to verify `MONGODB_URI` has the correct username, password, and database `/matter`. |
| **404 on Page Refresh** | Missing SPA rewrite rule on Vercel. | Verify that [`client/vercel.json`](file:///d:/mern_endterm_project/matter/client/vercel.json) is present with the `/(.*) -> /index.html` rewrite rule. |
