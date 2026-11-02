# Deploying Smart Home Expense Tracker to Vercel

Follow these steps to deploy your Smart Home Expense Tracker to Vercel and access it as a mobile app on your phone:

---

### Step 1: Push your project to GitHub

1. Open your terminal in this project directory:
   ```bash
   git add .
   git commit -m "feat: mobile PWA and Vercel deployment support"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Import Project in Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** $\to$ **"Project"**.
3. Select your GitHub repository and click **Import**.

---

### Step 3: Add a Free Cloud Database (Vercel Postgres / Neon / Supabase)

Because Vercel runs on serverless lambdas, a persistent cloud database is needed for permanent storage:

**Option A (Fastest - 1 Click Vercel Postgres / Neon):**
1. In your Vercel project dashboard, go to the **Storage** tab.
2. Click **Connect Database** $\to$ Choose **Postgres (Powered by Neon)** or **Neon Serverless Postgres**.
3. Click **Create** $\to$ It will automatically link `DATABASE_URL` and `POSTGRES_PRISMA_URL` to your project environment variables!

**Option B (Supabase / Neon free):**
1. Create a free database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy the Connection String (starts with `postgresql://...`).
3. In Vercel Project Settings $\to$ **Environment Variables**, add:
   * **Key**: `DATABASE_URL`
   * **Value**: Your connection string

---

### Step 4: Deploy & Initialize Database

1. Click **Deploy**.
2. Once the build finishes, run the initial database schema push (from your local machine or Vercel CLI):
   ```bash
   # On your local machine pointing to your production database URL:
   DATABASE_URL="<your-cloud-database-url>" npx prisma db push
   ```
   Or in Vercel, the build script will automatically detect the PostgreSQL connection string and generate the Prisma client!

---

### Step 5: Install on Your Mobile Phone (PWA App Experience)

Once deployed, open your Vercel URL (e.g. `https://smart-home-expenses.vercel.app`) on your mobile phone:

#### On iPhone (iOS Safari):
1. Tap the **Share** button (box with an arrow pointing up at the bottom).
2. Scroll down and tap **"Add to Home Screen"**.
3. Tap **Add**. The app will appear on your phone home screen with its custom emerald ₹ app icon and will open full-screen like a native iOS app!

#### On Android (Chrome):
1. Tap the **three-dots menu** (top right).
2. Tap **"Install app"** or **"Add to Home screen"**.
3. Tap **Install**. It installs as an app on your Android launcher.

---

### Features for Mobile Users:
- **Bottom Navigation Bar**: Native-like bottom bar with Home, Ledger, a central elevated **Import** button, Monthly summary, and a More drawer.
- **Touch-Optimized**: Responsive cards, touch-friendly tap targets, and no unwanted auto-zoom on input focus.
- **Offline / PWA Capable**: Native web manifest and app icons.

