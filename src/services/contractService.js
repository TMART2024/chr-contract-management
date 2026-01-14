import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const CONTRACTS_COLLECTION = 'contracts';
const ASSESSMENTS_COLLECTION = 'assessments';

/**
 * Upload contract document to Firebase Storage
 */
export async function uploadContractDocument(file, contractId) {
  try {
    const storageRef = ref(storage, `contracts/${contractId}/original-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      path: snapshot.ref.fullPath,
      name: file.name,
      size: file.size
    };
  } catch (error) {
    console.error('Document upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new contract
 */
export async function createContract(contractData, userId) {
  try {
    const docRef = await addDoc(collection(db, CONTRACTS_COLLECTION), {
      ...contractData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: contractData.status || 'active',
      assessed: false
    });

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Create contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update an existing contract
 */
export async function updateContract(contractId, updates) {
  try {
    const docRef = doc(db, CONTRACTS_COLLECTION, contractId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Update contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a single contract by ID
 */
export async function getContract(contractId) {
  try {
    const docRef = doc(db, CONTRACTS_COLLECTION, contractId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'Contract not found'
      };
    }

    return {
      success: true,
      contract: {
        id: docSnap.id,
        ...docSnap.data()
      }
    };
  } catch (error) {
    console.error('Get contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all contracts with optional filtering
 */
export async function getContracts(filters = {}) {
  try {
    let q = collection(db, CONTRACTS_COLLECTION);
    const constraints = [];

    // Apply filters
    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.contractType) {
      constraints.push(where('contractType', '==', filters.contractType));
    }
    if (filters.customerId) {
      constraints.push(where('customerId', '==', filters.customerId));
    }

    // Default ordering
    constraints.push(orderBy('endDate', 'asc'));

    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);
    const contracts = [];

    querySnapshot.forEach((doc) => {
      contracts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      contracts
    };
  } catch (error) {
    console.error('Get contracts error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get contracts expiring within a date range
 */
export async function getExpiringContracts(startDate, endDate, contractType = null) {
  try {
    const constraints = [
      where('endDate', '>=', Timestamp.fromDate(startDate)),
      where('endDate', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'active')
    ];

    if (contractType) {
      constraints.push(where('type', '==', contractType));
    }

    const q = query(
      collection(db, CONTRACTS_COLLECTION),
      ...constraints,
      orderBy('endDate', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const contracts = [];

    querySnapshot.forEach((doc) => {
      contracts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      contracts
    };
  } catch (error) {
    console.error('Get expiring contracts error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a contract
 */
export async function deleteContract(contractId) {
  try {
    // Delete the document
    const docRef = doc(db, CONTRACTS_COLLECTION, contractId);
    await deleteDoc(docRef);

    // TODO: Also delete associated storage files and assessments

    return {
      success: true
    };
  } catch (error) {
    console.error('Delete contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save contract assessment
 */
export async function saveAssessment(assessmentData, userId) {
  try {
    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), {
      ...assessmentData,
      assessedBy: userId,
      assessedAt: serverTimestamp()
    });

    // Update the contract with assessment info
    if (assessmentData.contractId) {
      await updateContract(assessmentData.contractId, {
        assessmentId: docRef.id,
        assessed: true,
        riskLevel: assessmentData.riskLevel,
        assessmentSummary: assessmentData.summary
      });
    }

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Save assessment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get assessment for a contract
 */
export async function getAssessment(assessmentId) {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'Assessment not found'
      };
    }

    return {
      success: true,
      assessment: {
        id: docSnap.id,
        ...docSnap.data()
      }
    };
  } catch (error) {
    console.error('Get assessment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate cancellation deadline based on end date and notice period
 */
export function calculateCancellationDeadline(endDate, noticeDays) {
  if (!endDate || !noticeDays) return null;
  
  const deadline = new Date(endDate.toDate ? endDate.toDate() : endDate);
  deadline.setDate(deadline.getDate() - noticeDays);
  return Timestamp.fromDate(deadline);
}

/**
 * Get contract statistics
 */
export async function getContractStats() {
  try {
    const result = await getContracts();
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const contracts = result.contracts;
    
    return {
      success: true,
      stats: {
        total: contracts.length,
        vendor: contracts.filter(c => c.type === 'vendor').length,
        customer: contracts.filter(c => c.type === 'customer').length,
        active: contracts.filter(c => c.status === 'active').length,
        expiringSoon: contracts.filter(c => {
          const endDate = c.endDate?.toDate?.() || new Date(c.endDate);
          const daysUntilExpiry = Math.floor((endDate - new Date()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        }).length,
        highRisk: contracts.filter(c => c.riskLevel === 'high').length,
        autoRenewal: contracts.filter(c => c.autoRenewal === true).length
      }
    };
  } catch (error) {
    console.error('Get contract stats error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
