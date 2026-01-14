# Firestore Database Schema

## Collections

### contracts
Stores all contract information for both vendors and customers.

```javascript
{
  id: string,                    // Auto-generated document ID
  type: string,                  // 'vendor' | 'customer'
  contractType: string,          // 'msa' | 'nda' | 'service' | 'project' (customer only)
  
  // Basic Information
  name: string,                  // Contract/vendor/customer name
  description: string,           // Optional description
  
  // Dates
  startDate: timestamp,
  endDate: timestamp,
  renewalDate: timestamp,        // Optional
  
  // Renewal & Cancellation
  autoRenewal: boolean,
  autoRenewalPeriod: number,     // Years if auto-renewal
  cancellationNoticeDays: number, // Days notice required
  cancellationDeadline: timestamp, // Calculated from endDate and notice days
  
  // Document
  documentUrl: string,           // Firebase Storage URL
  documentName: string,
  documentSize: number,
  uploadedAt: timestamp,
  
  // AI Assessment
  assessmentId: string,          // Reference to assessment document
  assessed: boolean,
  assessmentSummary: string,     // Brief summary of concerns
  riskLevel: string,             // 'low' | 'medium' | 'high'
  
  // Customer-specific fields
  customerId: string,            // For customer contracts
  msaId: string,                 // Reference to MSA if applicable
  ndaId: string,                 // Reference to NDA if applicable
  serviceType: string[],         // ['IT', 'Software', 'Engineering']
  
  // FreshSales Integration
  freshsalesId: string,          // FreshSales deal/contact ID
  lastSyncedAt: timestamp,
  syncStatus: string,            // 'pending' | 'synced' | 'error'
  
  // Metadata
  createdBy: string,             // User ID
  createdAt: timestamp,
  updatedAt: timestamp,
  tags: string[],                // Optional tags for filtering
  notes: string,                 // General notes
  
  // Status
  status: string,                // 'active' | 'expired' | 'pending' | 'cancelled'
}
```

### assessments
Stores AI-generated contract assessments.

```javascript
{
  id: string,
  contractId: string,            // Reference to contract
  
  // Assessment Results
  summary: string,               // Overall summary
  riskLevel: string,             // 'low' | 'medium' | 'high'
  
  findings: [
    {
      type: string,              // 'concern' | 'warning' | 'info'
      category: string,          // 'auto-renewal' | 'cancellation' | 'liability' | 'pricing' | 'other'
      description: string,
      severity: string,          // 'low' | 'medium' | 'high'
      excerpt: string,           // Relevant contract text
      recommendation: string,    // What to do about it
    }
  ],
  
  // Key Terms Extracted
  keyTerms: {
    autoRenewal: boolean,
    renewalPeriod: string,
    cancellationNotice: string,
    paymentTerms: string,
    liabilityLimits: string,
    jurisdiction: string,
  },
  
  // Questions Asked
  assessmentCriteria: string[],  // What was asked to look for
  
  // Metadata
  assessedAt: timestamp,
  assessedBy: string,            // User ID
  modelUsed: string,             // 'claude-sonnet-4-5-20250929'
}
```

### users
User profiles and preferences.

```javascript
{
  id: string,                    // Same as auth.uid
  email: string,
  displayName: string,
  role: string,                  // 'admin' | 'manager' | 'viewer'
  department: string,            // 'IT' | 'Sales' | 'Finance' | 'Engineering'
  
  // Notification Preferences
  notifications: {
    email: boolean,
    renewalAlerts: boolean,
    cancellationAlerts: boolean,
    alertDaysBefore: number,     // Days before expiration to alert
  },
  
  createdAt: timestamp,
  lastLoginAt: timestamp,
}
```

### notifications
System notifications for contract events.

```javascript
{
  id: string,
  userId: string,                // Who to notify
  contractId: string,
  
  type: string,                  // 'renewal' | 'cancellation-deadline' | 'expiration' | 'assessment-complete'
  title: string,
  message: string,
  
  read: boolean,
  dismissed: boolean,
  
  actionUrl: string,             // Link to contract
  
  createdAt: timestamp,
  scheduledFor: timestamp,       // When to send (for future alerts)
  sentAt: timestamp,
}
```

## Indexes

### contracts
- `type` ASC, `endDate` ASC
- `type` ASC, `status` ASC, `endDate` ASC
- `customerId` ASC, `contractType` ASC
- `status` ASC, `cancellationDeadline` ASC
- `autoRenewal` ASC, `renewalDate` ASC

### assessments
- `contractId` ASC, `assessedAt` DESC

### notifications
- `userId` ASC, `read` ASC, `createdAt` DESC
- `userId` ASC, `scheduledFor` ASC, `read` ASC

## Storage Structure

```
/contracts/
  /{contractId}/
    /original-{filename}        // Original uploaded document
    /assessed-{filename}        // Document with highlights/annotations (future)
```
