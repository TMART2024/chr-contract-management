# CHR Contract Management System

A comprehensive contract management system for tracking vendor and customer contracts with AI-powered analysis and FreshSales integration.

## Features

- **AI-Powered Contract Analysis**: Upload contracts and get intelligent assessments for auto-renewals, concerning clauses, and risk factors
- **Dual Contract Management**: Separate workflows for vendor and customer contracts
- **Global AI Query**: Ask questions across all contracts (e.g., "What contracts expire in Q1 2027?")
- **Calendar View**: Visual timeline of contract expirations and renewal dates
- **Document Hierarchy**: Support for MSAs, NDAs, service contracts, and project work
- **FreshSales Integration**: Automatic sync of contract dates and renewal periods
- **Smart Alerts**: Notifications for upcoming renewals and cancellation deadlines

## Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Firebase (Firestore, Storage, Auth)
- **AI**: Anthropic Claude API for contract analysis
- **CRM Integration**: FreshSales API
- **UI**: Tailwind CSS
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- Firebase account
- Anthropic API key
- FreshSales API credentials

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Enable Storage
4. Enable Authentication (Email/Password)
5. Copy your Firebase config

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_ANTHROPIC_API_KEY=your_anthropic_api_key

VITE_FRESHSALES_DOMAIN=your_domain.freshsales.io
VITE_FRESHSALES_API_KEY=your_freshsales_api_key
```

### 4. Firestore Security Rules

Update your Firestore rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their org's contracts
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

### 5. Storage Rules

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

### 6. Run Development Server

```bash
npm run dev
```

## Project Structure

```
chr-contract-management/
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   │   ├── contracts/      # Contract-specific components
│   │   ├── calendar/       # Calendar view components
│   │   └── ai/            # AI query and assessment components
│   ├── pages/              # Page components
│   ├── services/           # API services (Firebase, Anthropic, FreshSales)
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── config/             # Configuration files
├── public/                 # Static assets
└── functions/              # Firebase Cloud Functions (optional)
```

## Usage

### Upload and Assess a Contract

1. Navigate to Vendor or Customer Contracts
2. Click "Assess New Contract"
3. Drag and drop or upload the contract PDF
4. Configure assessment parameters
5. Review AI-generated assessment report
6. Save contract with metadata

### Global AI Query

1. Use the search bar on the landing page
2. Ask questions like:
   - "What vendor contracts expire in 2027?"
   - "Show me all contracts with auto-renewal clauses"
   - "Which customer contracts need 90-day cancellation notice?"

### Calendar View

1. Navigate to Calendar
2. Filter by contract type (vendor/customer)
3. View expirations by month
4. Click contracts for details

### FreshSales Sync

1. Contract data automatically syncs when saved
2. Updates SOW end dates, renewal periods
3. Check sync status in contract details

## Development

### Adding New Features

1. Create components in appropriate directory
2. Add routes in `App.jsx`
3. Update services for new data models
4. Test thoroughly before deploying

### Database Schema

See `src/config/schema.md` for detailed Firestore structure

## Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy
```

## Support

For issues or questions, contact IT Services team.

## License

Proprietary - CHR Solutions
