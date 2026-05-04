# City Girl — Backend + Admin Panel Setup Guide

Everything you need to go from zero to a fully working backend with admin panel.
Follow each part in order — don't skip ahead.

---

## What you'll set up

1. MongoDB Atlas — your database (stores sarees, orders)
2. AWS S3 — image and video storage
3. Backend on Railway — the server that connects everything
4. Admin panel — 3 small changes to your Vercel frontend

Total time: about 45–60 minutes the first time.

---

## PART 1 — MongoDB Atlas (Database)

### Step 1 — Create a free account
Go to https://mongodb.com/atlas → click "Try Free" → sign up with Google or email.

### Step 2 — Create a cluster
After logging in you'll see a "Create a cluster" screen.
- Choose **Free** (M0 tier — always free, 512MB storage, enough for thousands of sarees)
- Cloud Provider: **AWS**
- Region: **Mumbai (ap-south-1)** — fastest for India
- Cluster name: leave as "Cluster0"
- Click **Create Deployment**

### Step 3 — Create a database user
A dialog will appear asking you to create a user.
- Username: `citygirl`
- Click "Autogenerate Secure Password" → **copy the password and save it somewhere safe**
- Click "Create Database User"

### Step 4 — Allow all IP addresses
Next you'll see "Add IP addresses".
- Click "Allow Access from Anywhere"
- This adds `0.0.0.0/0` which lets your Railway backend connect
- Click "Add Entry" → "Finish and Close"

### Step 5 — Get your connection string
- From the Atlas dashboard, click **"Connect"** on your cluster
- Choose **"Drivers"**
- Driver: **Node.js**, Version: **5.5 or later**
- Copy the connection string. It looks like:
  ```
  mongodb+srv://citygirl:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with the password you saved in Step 3
- Add your database name before the `?`:
  ```
  mongodb+srv://citygirl:YOURPASSWORD@cluster0.xxxxx.mongodb.net/city-girl?retryWrites=true&w=majority
  ```
- **Save this string — you'll need it in Part 3**

---

## PART 2 — AWS S3 (Image & Video Storage)

### Step 1 — Create an AWS account
Go to https://aws.amazon.com → "Create an AWS Account"
Use a personal email. You'll need a credit card but the free tier covers you for 1 year (5GB storage, 15GB transfer/month).

### Step 2 — Create an S3 bucket
- Open the AWS console → search "S3" in the top bar → click S3
- Click **"Create bucket"**
- Bucket name: `city-girl-sarees` (must be globally unique — if taken, try `city-girl-sarees-yourname`)
- AWS Region: **ap-south-1** (Mumbai)
- Under "Block Public Access settings": **uncheck "Block all public access"**
- Confirm the warning checkbox
- Click **"Create bucket"**

### Step 3 — Make bucket publicly readable
- Click your new bucket → click the **"Permissions"** tab
- Scroll to **"Bucket policy"** → click "Edit"
- Paste this (replace `city-girl-sarees` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::city-girl-sarees/*"
    }
  ]
}
```
- Click **"Save changes"**

### Step 4 — Create access keys
Your backend needs keys to upload files to S3.
- Click your account name (top right) → **"Security credentials"**
- Scroll to **"Access keys"** → click "Create access key"
- Use case: **"Application running outside AWS"**
- Click "Next" → "Create access key"
- **Download the CSV or copy both keys right now — you can't see the secret key again**
  - Access Key ID: looks like `AKIAIOSFODNN7EXAMPLE`
  - Secret Access Key: looks like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

---

## PART 3 — Backend on Railway (Hosting)

### Step 1 — Set up the backend code
Unzip the `city-girl-backend.zip` file you downloaded. Open it in VS Code or any editor.

Copy `.env.example` to a new file called `.env`:
```
city-girl-backend/
  .env.example   ← copy this
  .env           ← paste here, fill in real values
```

Open `.env` and fill in every value:
```
PORT=5000
MONGODB_URI=mongodb+srv://citygirl:YOURPASSWORD@cluster0.xxxxx.mongodb.net/city-girl?retryWrites=true&w=majority
FRONTEND_URL=https://YOUR-APP.vercel.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose_something_strong_like_CityGirl@2024!
JWT_SECRET=paste_any_long_random_text_here_minimum_40_characters
AWS_ACCESS_KEY_ID=your_access_key_from_step_4_above
AWS_SECRET_ACCESS_KEY=your_secret_key_from_step_4_above
AWS_REGION=ap-south-1
AWS_S3_BUCKET=city-girl-sarees
EMAIL_USER=yourshop@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=City Girl Sarees <yourshop@gmail.com>
```

> For JWT_SECRET: just type any random long text, e.g. `CityGirlSarees2024SuperSecretKeyDontShareThis`

> For Gmail App Password: Go to myaccount.google.com → Security → 2-Step Verification (must be ON) → App Passwords → create one for "Mail". Use that 16-character code, not your real password.

### Step 2 — Push backend to GitHub
```bash
cd city-girl-backend
git init
git add .
git commit -m "City Girl backend"
```
Go to github.com → New repository → name it `city-girl-backend` → Create.
```bash
git remote add origin https://github.com/YOUR_USERNAME/city-girl-backend.git
git push -u origin main
```
**Important**: `.env` is in `.gitignore` so your secrets won't be uploaded. Good.

### Step 3 — Deploy to Railway
- Go to https://railway.app → Sign up with GitHub
- Click **"New Project"** → **"Deploy from GitHub repo"**
- Select your `city-girl-backend` repository
- Railway auto-detects Node.js. Click **"Deploy Now"**

### Step 4 — Add environment variables on Railway
- In Railway, click your project → click the service → click **"Variables"** tab
- Click **"Add Variable"** and add each variable from your `.env` file:

| Variable | Value |
|---|---|
| MONGODB_URI | your full MongoDB connection string |
| FRONTEND_URL | https://your-app.vercel.app |
| ADMIN_USERNAME | admin |
| ADMIN_PASSWORD | your chosen password |
| JWT_SECRET | your long random string |
| AWS_ACCESS_KEY_ID | from AWS |
| AWS_SECRET_ACCESS_KEY | from AWS |
| AWS_REGION | ap-south-1 |
| AWS_S3_BUCKET | city-girl-sarees |
| EMAIL_USER | yourshop@gmail.com |
| EMAIL_PASS | gmail app password |
| EMAIL_FROM | City Girl Sarees \<yourshop@gmail.com\> |

- After adding all variables, Railway automatically redeploys

### Step 5 — Get your backend URL
- Click your Railway service → **"Settings"** tab → scroll to **"Domains"**
- Click "Generate Domain" → you'll get a URL like:
  ```
  https://city-girl-backend-production.up.railway.app
  ```
- **Copy this URL — you need it next**

### Step 6 — Test your backend is working
Open this URL in your browser (replace with your actual Railway URL):
```
https://city-girl-backend-production.up.railway.app/health
```
You should see: `{"status":"ok","time":"..."}` — if so, your backend is live.

---

## PART 4 — Add Admin Panel to Your Existing Vercel Frontend

You only need to make 3 changes to your existing frontend code.

### Change 1 — Add the AdminPanel.jsx file
From the zip, copy `AdminPanel.jsx` into your frontend project at:
```
src/pages/AdminPanel.jsx
```
(It's already in the zip file you downloaded)

### Change 2 — Add the /admin route in App.jsx
Open `src/App.jsx`. Add one import and one Route:

Find this block (your existing imports at the top):
```jsx
import ConfirmationPage from './pages/ConfirmationPage';
```

Add this line right after it:
```jsx
import AdminPanel from './pages/AdminPanel';
```

Then find your `<Routes>` block. It currently looks like:
```jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/shop" element={<Shop />} />
  <Route path="/cart" element={<CartPage />} />
  <Route path="/checkout" element={<CheckoutPage />} />
  <Route path="/confirmation" element={<ConfirmationPage />} />
</Routes>
```

Add one line at the end before `</Routes>`:
```jsx
  <Route path="/admin" element={<AdminPanel />} />
```

### Change 3 — Add your backend URL to Vercel environment variables
- Go to vercel.com → your project → **Settings** → **Environment Variables**
- Add a new variable:
  - Name: `REACT_APP_API_URL`
  - Value: `https://city-girl-backend-production.up.railway.app` (your Railway URL, no trailing slash)
- Click **Save**
- Go to **Deployments** tab → click the three dots on the latest deployment → **Redeploy**

### Deploy the frontend changes
```bash
git add src/pages/AdminPanel.jsx src/App.jsx
git commit -m "Add admin panel"
git push
```
Vercel auto-deploys when you push. Wait ~60 seconds.

---

## PART 5 — Using the Admin Panel

### Access it
Go to: `https://your-app.vercel.app/admin`

Log in with the username and password you set in `.env` (ADMIN_USERNAME / ADMIN_PASSWORD).

### Adding a saree
1. Click **"+ Add New Saree"**
2. Fill in:
   - **SKU**: your own code, e.g. `CG-SILK-001`. No spaces. This is your internal reference.
   - **Name**: full saree name
   - **Description**: what makes it special
   - **Type**: choose from the dropdown
   - **Color**: type it in
   - **Selling Price**: what customers pay
   - **Original / MRP**: optional — shows a strikethrough price
   - **Stock Qty**: how many pieces you have
   - **Size**: usually `5.5m` or `6.3m`
   - **Tags**: optional, helps with search — e.g. `bridal, festive`
   - **Sort Order**: controls the order sarees appear in the shop. `0` is first, `1` is second, etc.
3. Check **"Active"** so it appears in the shop
4. Check **"Show on Home Page"** if you want it featured on the landing page
5. Under **"Product Images"**: click "Choose Images" and select your saree photos. First image = the thumbnail.
6. Under **"Product Video"**: optional — click "Choose Video" if you have one
7. Click **"Create Saree"**

The saree is saved to MongoDB and images go to S3. It appears in your shop immediately.

### Editing a saree
Click **"Edit"** on any row in the sarees table. The same form opens, pre-filled. Change what you need and click "Save Changes".

### Updating stock quickly
Click the **"Edit"** button next to the stock number. A small popup asks for the new quantity.

### Hiding a saree without deleting it
Click the **"Live"** badge on the row — it toggles to **"Hidden"**. The saree disappears from the shop but stays in your database. Click again to show it.

### Deleting a saree permanently
Click **"Delete"** on the row. This cannot be undone. Note: it does NOT delete the images from S3 (to do that you'd go to AWS console — but leaving old images in S3 is fine, they're tiny cost).

### Managing orders
Click the **"Orders"** tab. You see every order placed through the shop. Use the status dropdown on each row to mark orders as confirmed, shipped, delivered, etc.

---

## PART 6 — Connect frontend shop to live API (important!)

Right now your Vercel shop is showing the static mock data from `src/data/sarees.js`. You need to update the shop to fetch from your API instead.

Open `src/pages/Shop.jsx` in your frontend. Replace the top of the file where it imports SAREES:

**Current code (top of Shop.jsx):**
```jsx
import { SAREES } from '../data/sarees';
```

**Replace the entire component to fetch from API instead:**
```jsx
// src/pages/Shop.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Filters from '../components/Filters';
import ProductList from '../components/ProductList';
import VideoModal from '../components/VideoModal';

const DEFAULT_FILTERS = {
  search: '', types: [], colors: [],
  priceMin: '', priceMax: '', stock: 'all', qty: 'any',
};

export default function Shop() {
  const [sarees, setSarees]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState(DEFAULT_FILTERS);
  const [videoSaree, setVideoSaree] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/sarees`)
      .then(r => r.json())
      .then(data => setSarees(data))
      .catch(e => console.error('Failed to load sarees', e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return sarees.filter(s => {
      if (filters.types.length && !filters.types.includes(s.type)) return false;
      if (filters.colors.length && !filters.colors.includes(s.color)) return false;
      if (filters.priceMin && s.price < +filters.priceMin) return false;
      if (filters.priceMax && s.price > +filters.priceMax) return false;
      if (filters.stock === 'in' && s.stock <= 0) return false;
      if (filters.stock === 'out' && s.stock > 0) return false;
      if (filters.qty === 'hi' && s.stock < 5) return false;
      if (filters.qty === 'lo' && s.stock >= 5) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) &&
            !s.color.toLowerCase().includes(q) &&
            !s.type.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sarees, filters]);

  if (loading) return (
    <div style={{ textAlign:'center', padding:'5rem', color:'#7A6247' }}>
      Loading sarees…
    </div>
  );

  return (
    <div className="shop-layout">
      <Filters filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} />
      <main className="shop-main">
        <div className="shop-topbar">
          <span className="results-count">
            Showing <strong>{filtered.length}</strong> of {sarees.length} sarees
          </span>
        </div>
        <ProductList sarees={filtered} onVideoClick={setVideoSaree} />
      </main>
      {videoSaree && <VideoModal saree={videoSaree} onClose={() => setVideoSaree(null)} />}
    </div>
  );
}
```

Do the same for `src/pages/Home.jsx` — change the featured sarees to fetch from API:
```jsx
// In Home.jsx, replace:
const featured = SAREES.filter((s) => s.stock > 0).slice(0, 8);

// With:
const [featured, setFeatured] = useState([]);
useEffect(() => {
  fetch(`${process.env.REACT_APP_API_URL}/api/sarees?featured=true`)
    .then(r => r.json())
    .then(data => setFeatured(data.slice(0, 8)))
    .catch(() => {});
}, []);
```

Push these changes to GitHub and Vercel will redeploy automatically.

---

## PART 7 — Common Problems & Fixes

### "Failed to load sarees" on the shop page
- Check that `REACT_APP_API_URL` is set in Vercel's environment variables
- Check Railway logs (Railway → your project → service → Logs tab)
- Make sure CORS: `FRONTEND_URL` on Railway matches exactly your Vercel URL (no trailing slash)

### Admin login says "Login failed"
- Double-check `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set in Railway environment variables
- Try redeploying on Railway after adding variables

### Images not uploading
- Check AWS keys are correct in Railway environment variables
- Make sure the S3 bucket name matches `AWS_S3_BUCKET`
- Check bucket policy allows public read (Part 2, Step 3)

### Orders not saving
- Check MongoDB connection: Railway logs will show "MongoDB connected" or an error
- Make sure your IP is allowed in Atlas (you set "Allow from Anywhere" in Part 1 Step 4)

### Railway keeps crashing
- Check the Logs tab in Railway for the error message
- Most common cause: missing environment variable. Compare your Railway variables against `.env.example`

---

## Quick Reference

| Thing | Where to find it |
|---|---|
| Admin panel | https://your-app.vercel.app/admin |
| Backend health check | https://your-railway-url.railway.app/health |
| MongoDB data | Atlas → Browse Collections → city-girl → sarees |
| S3 images | AWS Console → S3 → city-girl-sarees → sarees/images/ |
| Backend logs | Railway → project → service → Logs |
| Redeploy frontend | Push to GitHub or Vercel dashboard → Redeploy |
| Redeploy backend | Push to GitHub or Railway dashboard → Deploy |
