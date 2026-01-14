# Setting Up Cloud Functions for User Deletion

## Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Blaze plan enabled in Firebase (required for Cloud Functions)

## Setup Steps

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project
In your project root directory:
```bash
firebase init functions
```

When prompted:
- **Use an existing project** → Select your `chr-contract-management` project
- **Language** → JavaScript
- **ESLint** → No (or Yes if you prefer)
- **Install dependencies now** → Yes

This will create a `functions` folder with the necessary setup.

### 4. Replace the functions files
The `functions/index.js` and `functions/package.json` files are already created in this package. They should be in your project now.

### 5. Install dependencies
```bash
cd functions
npm install
cd ..
```

### 6. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

This will deploy the `deleteUser` function to Firebase.

### 7. Test it
After deployment:
1. Go to your app
2. Try deleting a user from User Management
3. It should now delete them from BOTH Firebase Auth AND Firestore

## Verify Deployment

After deploying, you can check:
1. **Firebase Console** → Functions tab
2. You should see `deleteUser` function listed
3. Click on it to see logs

## Troubleshooting

**Error: "Firebase CLI not found"**
```bash
npm install -g firebase-tools
```

**Error: "Billing account not configured"**
- Your Firebase project needs to be on the Blaze (pay-as-you-go) plan
- Go to Firebase Console → Upgrade
- Cloud Functions have a generous free tier

**Error: "Permission denied"**
- Make sure you're logged in: `firebase login`
- Make sure you have owner/editor access to the Firebase project

**Function not showing up**
- Check deployment logs: `firebase functions:log`
- Make sure deployment completed successfully
- Wait a minute and refresh Firebase Console

## Cost
Cloud Functions on Blaze plan:
- **Free tier:** 2 million invocations/month
- **After free tier:** $0.40 per million invocations
- For user deletion, you'll likely never exceed free tier

## Local Testing (Optional)
```bash
# Start emulator
firebase emulators:start --only functions

# Your function will be available at:
# http://localhost:5001/chr-contract-management/us-central1/deleteUser
```
