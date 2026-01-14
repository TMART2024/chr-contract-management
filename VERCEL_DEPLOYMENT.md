# Deploying CHR Contract Management to Vercel

## Prerequisites
- Vercel account (free at vercel.com)
- GitHub repository (your code is already there!)
- All environment variables ready from your `.env` file

## Step-by-Step Deployment

### 1. Install Vercel CLI (Optional but recommended)
```bash
npm install -g vercel
```

### 2. Deploy via Vercel Website (Easiest Method)

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. **Import your GitHub repository:**
   - Connect your GitHub account if not already connected
   - Find and select `chr-contract-management` repository
   - Click **"Import"**

4. **Configure Project:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)

5. **Add Environment Variables:**
   Click "Environment Variables" and add ALL these from your `.env` file:
   
   ```
   VITE_FIREBASE_API_KEY=your_value_here
   VITE_FIREBASE_AUTH_DOMAIN=your_value_here
   VITE_FIREBASE_PROJECT_ID=your_value_here
   VITE_FIREBASE_STORAGE_BUCKET=your_value_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_value_here
   VITE_FIREBASE_APP_ID=your_value_here
   VITE_ANTHROPIC_API_KEY=your_value_here
   VITE_FRESHSALES_DOMAIN=your_value_here
   VITE_FRESHSALES_API_KEY=your_value_here
   ```
   
   **IMPORTANT:** Make sure to select "Production", "Preview", and "Development" for all variables

6. Click **"Deploy"**

7. Wait 2-3 minutes for build to complete

8. **Done!** You'll get a URL like: `https://chr-contract-management.vercel.app`

### 3. Alternative: Deploy via CLI

If you prefer command line:

```bash
# Login to Vercel
vercel login

# Navigate to your project
cd chr-contract-management

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - What's your project's name? chr-contract-management
# - In which directory is your code? ./
# - Override settings? No

# Add environment variables via dashboard or CLI:
vercel env add VITE_FIREBASE_API_KEY
# (repeat for each variable)

# Deploy to production
vercel --prod
```

### 4. Update Firebase Authorized Domains

**IMPORTANT:** After deployment, add your Vercel domain to Firebase:

1. Go to Firebase Console → Authentication → Settings
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add your Vercel URL: `chr-contract-management.vercel.app` (without https://)
5. Click **"Add"**

### 5. Set Up Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain (e.g., `contracts.chrintegrated.com`)
4. Follow Vercel's instructions to update DNS records
5. Don't forget to add the custom domain to Firebase Authorized Domains too!

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:
- **Push to `main` branch** → Production deployment
- **Push to other branches** → Preview deployment

## Troubleshooting

### Build fails:
- Check that all environment variables are set
- Look at the build logs in Vercel dashboard
- Make sure `vercel.json` is in your repo

### Can't login after deployment:
- Verify Firebase Authorized Domains includes your Vercel URL
- Check browser console for CORS errors

### Environment variables not working:
- Make sure they ALL start with `VITE_`
- Redeploy after adding variables (they're not hot-reloaded)

### 404 on refresh:
- Check that `vercel.json` has the rewrite rules (it does!)

## Monitoring & Logs

- **Deployment logs:** Vercel dashboard → Deployments
- **Runtime logs:** Vercel dashboard → Functions (if using serverless)
- **Analytics:** Built into Vercel dashboard

## Production Checklist

- [ ] All environment variables added
- [ ] Firebase authorized domains updated
- [ ] Test login/logout works
- [ ] Test contract upload works
- [ ] Test AI features work
- [ ] Test on mobile devices
- [ ] Share URL with team!

## Your First Admin User

Since you created your account in development:
1. Login with your existing credentials
2. Your role should already be set
3. If not, manually update in Firebase Console:
   - Firestore → users → your user doc → role: "admin"

Then you can use the User Management page to assign roles to others!
