# CHR Contract Management - Quick Start Guide

## Setup Steps for Cursor

### 1. Create New Project in Cursor
1. Open Cursor
2. File → Open Folder
3. Create a new folder called `chr-contract-management`
4. Open that folder in Cursor

### 2. Copy All Files
Copy all the files from this structure into your Cursor project. The complete structure should look like:

```
chr-contract-management/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── config/
    │   ├── firebase.js
    │   └── schema.md
    ├── contexts/
    │   └── AuthContext.jsx
    ├── services/
    │   ├── anthropicService.js
    │   ├── contractService.js
    │   └── freshsalesService.js
    ├── utils/
    │   └── helpers.js
    ├── components/
    │   ├── layout/
    │   │   └── Header.jsx
    │   ├── dashboard/
    │   │   └── DashboardStats.jsx
    │   ├── ai/
    │   │   └── AIQuery.jsx
    │   └── contracts/
    │       ├── ContractAssessment.jsx
    │       └── ContractList.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── VendorContracts.jsx
        ├── CustomerContracts.jsx
        ├── Calendar.jsx
        └── Login.jsx
```

### 3. Install Dependencies
Open Cursor's terminal (Ctrl+` or Cmd+`) and run:

```bash
npm install
```

This will install all the required packages.

### 4. Set Up Firebase

1. Go to https://console.firebase.google.com
2. Click "Add Project" or use existing project
3. Name it "CHR Contract Management" (or similar)
4. Enable Google Analytics (optional)
5. Once created, click on "Web" icon (</>) to add a web app
6. Register the app, copy the config object

7. **Enable Firestore:**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create Database"
   - Start in "Production mode" (we'll add rules)
   - Choose your region (us-central1 recommended)

8. **Enable Storage:**
   - Go to "Storage" in Firebase Console
   - Click "Get Started"
   - Start in "Production mode"
   - Use same region as Firestore

9. **Enable Authentication:**
   - Go to "Authentication"
   - Click "Get Started"
   - Enable "Email/Password" provider

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your Firebase config from step 4:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=chr-contracts.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chr-contracts
VITE_FIREBASE_STORAGE_BUCKET=chr-contracts.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

3. Add your Anthropic API key (from console.anthropic.com):
```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

4. Add FreshSales credentials:
```env
VITE_FRESHSALES_DOMAIN=chrintegrated.freshsales.io
VITE_FRESHSALES_API_KEY=your_api_key
```

### 6. Set Up Firestore Security Rules

In Firebase Console → Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contracts/{contractId} {
      allow read, write: if request.auth != null;
    }
    
    match /assessments/{assessmentId} {
      allow read, write: if request.auth != null;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 7. Set Up Storage Security Rules

In Firebase Console → Storage → Rules, paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /contracts/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 8. Create Firestore Indexes

The app will tell you if indexes are needed, but you can pre-create them:

1. Go to Firestore → Indexes
2. Create composite indexes:
   - Collection: `contracts`, Fields: `type` (Ascending), `endDate` (Ascending)
   - Collection: `contracts`, Fields: `type` (Ascending), `status` (Ascending), `endDate` (Ascending)

### 9. Run the Development Server

```bash
npm run dev
```

The app should open at http://localhost:3000

### 10. Create Your First User

1. Click "Sign up" on the login page
2. Create an account with your CHR email
3. You'll be logged in and taken to the dashboard

## Key Features to Test

### 1. Assess a Vendor Contract
1. Navigate to "Vendor Contracts"
2. Click "Assess New Contract"
3. Upload a PDF contract
4. Add/modify assessment criteria
5. Click "Analyze Contract"
6. Review AI assessment results
7. Click "Accept and Continue"
8. Fill in contract details
9. Save

### 2. Add a Customer Contract
1. Navigate to "Customer Contracts"
2. Click "Add Customer Contract"
3. Fill in form (it will auto-sync to FreshSales)
4. Save

### 3. Use AI Query
1. Go to Dashboard
2. In the AI Query box, ask questions like:
   - "What contracts expire in 2027?"
   - "Show me all vendor contracts with auto-renewal"
   - "Which contracts need 90-day notice?"

### 4. View Calendar
1. Navigate to "Calendar"
2. Change year with arrows
3. Filter by contract type
4. See contracts organized by expiration month

## Next Steps

After the MVP is working:
1. **Test FreshSales Integration** - Make sure API credentials are correct
2. **Add More Contracts** - Build up your database
3. **Customize** - Adjust colors, labels, fields as needed
4. **Deploy** - Use Firebase Hosting or your preferred platform

## Troubleshooting

**Firebase Connection Issues:**
- Check that all env variables are set correctly
- Make sure Firebase is initialized (no console errors)
- Verify security rules allow authenticated access

**AI Analysis Not Working:**
- Verify Anthropic API key is correct
- Check browser console for errors
- Make sure you have API credits

**FreshSales Sync Failing:**
- Verify API key and domain
- Check that custom fields exist in FreshSales
- Look at browser console for detailed errors

## Support

If you hit issues:
1. Check browser console (F12) for errors
2. Check Cursor's terminal for server errors
3. Ask me for help!

Good luck! 🚀
