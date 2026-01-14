import { useState, useEffect } from 'react';
import { Plus, Loader2, GitCompare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ContractList from '../components/contracts/ContractList';
import ContractAssessment from '../components/contracts/ContractAssessment';
import ComparisonHub from '../components/contracts/ComparisonHub';
import { getContracts, createContract, uploadContractDocument, saveAssessment, deleteContract, updateContract } from '../services/contractService';
import { Timestamp } from 'firebase/firestore';

export default function VendorContracts() {
  const { currentUser } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area: '',
    typeOfContract: '',
    dateSigned: '',
    startDate: '',
    endDate: '',
    initialExpirationDate: '',
    renewalPeriod: '',
    autoRenewal: false,
    autoRenewalPeriod: 1,
    cancellationNoticeDays: 30,
    usersOrAccountNumber: '',
    requestedFrom: '',
    document: null
  });

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    setLoading(true);
    try {
      const result = await getContracts({ type: 'vendor', status: 'active' });
      if (result.success) {
        setContracts(result.contracts);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssessmentComplete(data) {
    setAssessmentData(data);
    setShowForm(true);
  }

  async function handleSaveContract(e) {
    e.preventDefault();
    
    try {
      // First, create the contract document
      const contractData = {
        type: 'vendor',
        name: formData.name,
        description: formData.description,
        area: formData.area,
        typeOfContract: formData.typeOfContract,
        dateSigned: formData.dateSigned ? Timestamp.fromDate(new Date(formData.dateSigned)) : null,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        initialExpirationDate: formData.initialExpirationDate ? Timestamp.fromDate(new Date(formData.initialExpirationDate)) : null,
        renewalPeriod: formData.renewalPeriod,
        autoRenewal: formData.autoRenewal,
        autoRenewalPeriod: formData.autoRenewal ? parseInt(formData.autoRenewalPeriod) : null,
        cancellationNoticeDays: parseInt(formData.cancellationNoticeDays),
        usersOrAccountNumber: formData.usersOrAccountNumber,
        requestedFrom: formData.requestedFrom
      };

      const createResult = await createContract(contractData, currentUser.uid);
      
      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      const contractId = createResult.id;

      // Upload the document if provided (either from form or assessment)
      const documentToUpload = formData.document || assessmentData?.file;
      
      if (documentToUpload) {
        const uploadResult = await uploadContractDocument(documentToUpload, contractId);
        
        if (uploadResult.success) {
          // Update contract with document info
          await updateContract(contractId, {
            documentUrl: uploadResult.url,
            documentName: uploadResult.name,
            documentSize: uploadResult.size,
            uploadedAt: Timestamp.now()
          });
        }
      }

      // Save the assessment if we have one
      if (assessmentData?.assessment) {
        await saveAssessment({
          contractId: contractId,
          ...assessmentData.assessment,
          assessmentCriteria: assessmentData.criteria
        }, currentUser.uid);
      }

      // Reset and reload
      resetForm();
      loadContracts();
      alert('Contract saved successfully!');

    } catch (error) {
      console.error('Error saving contract:', error);
      alert(`Failed to save contract: ${error.message}`);
    }
  }

  function resetForm() {
    setShowAssessment(false);
    setShowForm(false);
    setAssessmentData(null);
    setFormData({
      name: '',
      description: '',
      area: '',
      typeOfContract: '',
      dateSigned: '',
      startDate: '',
      endDate: '',
      initialExpirationDate: '',
      renewalPeriod: '',
      autoRenewal: false,
      autoRenewalPeriod: 1,
      cancellationNoticeDays: 30,
      usersOrAccountNumber: '',
      requestedFrom: '',
      document: null
    });
  }

  async function handleDeleteContract(contractId) {
    if (!confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const result = await deleteContract(contractId);
      if (result.success) {
        loadContracts();
        alert('Contract deleted successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete contract');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Contracts</h1>
          <p className="text-gray-600">
            Manage contracts with your vendors and suppliers
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowComparison(true)}
            className="btn-secondary"
          >
            <GitCompare className="w-5 h-5 mr-2 inline" />
            Compare
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="btn-secondary"
              >
                <Plus className="w-5 h-5 mr-2 inline" />
                Add Contract
              </button>
              <button
                onClick={() => setShowAssessment(true)}
                className="btn-primary"
              >
                <Plus className="w-5 h-5 mr-2 inline" />
                Assess Contract
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contract Form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {assessmentData ? 'Contract Details (Assessed)' : 'Add Vendor Contract'}
          </h2>
          <form onSubmit={handleSaveContract} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="label">Area/Department</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="input-field"
                  placeholder="e.g., IT, Marketing, Engineering"
                />
              </div>

              <div>
                <label className="label">Type of Contract</label>
                <input
                  type="text"
                  value={formData.typeOfContract}
                  onChange={(e) => setFormData({ ...formData, typeOfContract: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 1 year, subscription, license"
                />
              </div>

              <div>
                <label className="label">Date Signed</label>
                <input
                  type="date"
                  value={formData.dateSigned}
                  onChange={(e) => setFormData({ ...formData, dateSigned: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Term Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Initial Expiration Date</label>
                <input
                  type="date"
                  value={formData.initialExpirationDate}
                  onChange={(e) => setFormData({ ...formData, initialExpirationDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Current Term End Date *</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Cancellation Notice (days)</label>
                <input
                  type="number"
                  value={formData.cancellationNoticeDays}
                  onChange={(e) => setFormData({ ...formData, cancellationNoticeDays: e.target.value })}
                  className="input-field"
                  min="0"
                  placeholder="e.g., 30, 60, 90"
                />
              </div>

              <div>
                <label className="label">Renewal Period</label>
                <input
                  type="text"
                  value={formData.renewalPeriod}
                  onChange={(e) => setFormData({ ...formData, renewalPeriod: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 1 year automatic, no mention"
                />
              </div>

              <div>
                <label className="label">Users or Account Number</label>
                <input
                  type="text"
                  value={formData.usersOrAccountNumber}
                  onChange={(e) => setFormData({ ...formData, usersOrAccountNumber: e.target.value })}
                  className="input-field"
                  placeholder="e.g., John Doe, Account #12345"
                />
              </div>

              <div>
                <label className="label">Requested From</label>
                <input
                  type="text"
                  value={formData.requestedFrom}
                  onChange={(e) => setFormData({ ...formData, requestedFrom: e.target.value })}
                  className="input-field"
                  placeholder="Who provided this info"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Additional notes or details"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Contract Document (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData({ ...formData, document: e.target.files[0] })}
                  className="input-field"
                />
                {formData.document && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {formData.document.name}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex items-center space-x-4 pt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoRenewal}
                    onChange={(e) => setFormData({ ...formData, autoRenewal: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-Renewal</span>
                </label>

                {formData.autoRenewal && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Period:</label>
                    <input
                      type="number"
                      value={formData.autoRenewalPeriod}
                      onChange={(e) => setFormData({ ...formData, autoRenewalPeriod: e.target.value })}
                      className="input-field w-20"
                      min="1"
                    />
                    <span className="text-sm text-gray-700">year(s)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn-primary">
                Save Contract
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contract List */}
      <ContractList
        contracts={contracts}
        type="vendor"
        onViewContract={(contract) => console.log('View contract:', contract)}
        onDeleteContract={canDelete ? handleDeleteContract : null}
      />

      {/* Assessment Modal */}
      <ContractAssessment
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        onAssessmentComplete={handleAssessmentComplete}
      />
      
      {/* Comparison Modal */}
      <ComparisonHub
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        existingContracts={contracts}
      />
    </div>
  );
}
