import { useState, useEffect } from 'react';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ContractList from '../components/contracts/ContractList';
import { getContracts, createContract, deleteContract, updateContract } from '../services/contractService';
import { syncContractToFreshSales } from '../services/freshsalesService';
import { Timestamp } from 'firebase/firestore';

export default function CustomerContracts() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contractType: 'service',
    serviceType: [],
    startDate: '',
    endDate: '',
    autoRenewal: false,
    autoRenewalPeriod: 1,
    cancellationNoticeDays: 30
  });

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    setLoading(true);
    try {
      const result = await getContracts({ type: 'customer', status: 'active' });
      if (result.success) {
        setContracts(result.contracts);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveContract(e) {
    e.preventDefault();
    
    try {
      const contractData = {
        type: 'customer',
        name: formData.name,
        description: formData.description,
        contractType: formData.contractType,
        serviceType: formData.serviceType,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        autoRenewal: formData.autoRenewal,
        autoRenewalPeriod: formData.autoRenewal ? parseInt(formData.autoRenewalPeriod) : null,
        cancellationNoticeDays: parseInt(formData.cancellationNoticeDays),
        syncStatus: 'pending'
      };

      const createResult = await createContract(contractData, currentUser.uid);
      
      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      // Sync to FreshSales
      const syncResult = await syncContractToFreshSales({
        ...contractData,
        id: createResult.id
      });

      if (syncResult.success) {
        await updateContract(createResult.id, {
          freshsalesId: syncResult.freshsalesId,
          syncStatus: 'synced',
          lastSyncedAt: Timestamp.now()
        });
      } else {
        console.warn('FreshSales sync failed:', syncResult.error);
        await updateContract(createResult.id, {
          syncStatus: 'error'
        });
      }

      resetForm();
      loadContracts();
      alert('Customer contract saved and synced to FreshSales!');

    } catch (error) {
      console.error('Error saving contract:', error);
      alert(`Failed to save contract: ${error.message}`);
    }
  }

  async function handleSyncToFreshSales() {
    if (!confirm('Sync all customer contracts to FreshSales?')) {
      return;
    }

    setSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    try {
      for (const contract of contracts) {
        const result = await syncContractToFreshSales(contract);
        if (result.success) {
          await updateContract(contract.id, {
            freshsalesId: result.freshsalesId,
            syncStatus: 'synced',
            lastSyncedAt: Timestamp.now()
          });
          syncedCount++;
        } else {
          errorCount++;
        }
      }

      alert(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);
      loadContracts();

    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync contracts');
    } finally {
      setSyncing(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      contractType: 'service',
      serviceType: [],
      startDate: '',
      endDate: '',
      autoRenewal: false,
      autoRenewalPeriod: 1,
      cancellationNoticeDays: 30
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

  function toggleServiceType(type) {
    setFormData(prev => ({
      ...prev,
      serviceType: prev.serviceType.includes(type)
        ? prev.serviceType.filter(t => t !== type)
        : [...prev.serviceType, type]
    }));
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Contracts</h1>
          <p className="text-gray-600">
            Manage service agreements, MSAs, NDAs, and customer contracts
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncToFreshSales}
            disabled={syncing}
            className="btn-secondary"
          >
            {syncing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2 inline" />
                Sync to FreshSales
              </>
            )}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Add Customer Contract
          </button>
        </div>
      </div>

      {/* Contract Form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">New Customer Contract</h2>
          <form onSubmit={handleSaveContract} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name *</label>
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
                <label className="label">Contract Type *</label>
                <select
                  required
                  value={formData.contractType}
                  onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                  className="input-field"
                >
                  <option value="msa">MSA (Master Service Agreement)</option>
                  <option value="nda">NDA (Non-Disclosure Agreement)</option>
                  <option value="service">Service Contract</option>
                  <option value="project">Project Work</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label">Service Types</label>
                <div className="flex flex-wrap gap-3">
                  {['IT', 'Software', 'Engineering'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.serviceType.includes(type)}
                        onChange={() => toggleServiceType(type)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">End Date *</label>
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
                />
              </div>

              <div className="flex items-center space-x-4 pt-6">
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
                Save Contract & Sync to FreshSales
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
        type="customer"
        onViewContract={(contract) => console.log('View contract:', contract)}
        onDeleteContract={handleDeleteContract}
      />
    </div>
  );
}
