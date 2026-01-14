import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, GitCompare } from 'lucide-react';
import AIQuery from '../components/ai/AIQuery';
import DashboardStats from '../components/dashboard/DashboardStats';
import ComparisonHub from '../components/contracts/ComparisonHub';
import { getContracts, getContractStats } from '../services/contractService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load stats
      const statsResult = await getContractStats();
      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      // Load all contracts for AI query
      const contractsResult = await getContracts();
      if (contractsResult.success) {
        setContracts(contractsResult.contracts);
        
        // Filter expiring soon
        const expiring = contractsResult.contracts
          .filter(c => {
            const endDate = c.endDate?.toDate?.() || new Date(c.endDate);
            const daysUntil = Math.floor((endDate - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil <= 90 && daysUntil > 0 && c.status === 'active';
          })
          .sort((a, b) => {
            const aDate = a.endDate?.toDate?.() || new Date(a.endDate);
            const bDate = b.endDate?.toDate?.() || new Date(b.endDate);
            return aDate - bDate;
          })
          .slice(0, 5);
        
        setExpiringContracts(expiring);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Dashboard</h1>
          <p className="text-gray-600">
            Manage and track all your vendor and customer contracts in one place
          </p>
        </div>
        <button
          onClick={() => setShowComparison(true)}
          className="btn-primary"
        >
          <GitCompare className="w-5 h-5 mr-2 inline" />
          Compare Contracts
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mb-8">
        <DashboardStats stats={stats} />
      </div>

      {/* AI Query */}
      <div className="mb-8">
        <AIQuery contracts={contracts} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => navigate('/vendor-contracts')}
          className="card hover:shadow-lg transition-shadow text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Vendor Contracts</h3>
          <p className="text-sm text-gray-600 mb-4">
            Track and assess contracts with your vendors and suppliers
          </p>
          <div className="text-primary-600 font-medium">
            {stats?.vendor || 0} active contracts →
          </div>
        </button>

        <button
          onClick={() => navigate('/customer-contracts')}
          className="card hover:shadow-lg transition-shadow text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Customer Contracts</h3>
          <p className="text-sm text-gray-600 mb-4">
            Track service agreements, MSAs, and customer contracts
          </p>
          <div className="text-primary-600 font-medium">
            {stats?.customer || 0} active contracts →
          </div>
        </button>
      </div>

      {/* Expiring Soon */}
      {expiringContracts.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Expiring Soon (Next 90 Days)
          </h2>
          <div className="space-y-3">
            {expiringContracts.map((contract) => {
              const endDate = contract.endDate?.toDate?.() || new Date(contract.endDate);
              const daysRemaining = Math.floor((endDate - new Date()) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/${contract.type}-contracts`)}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{contract.name}</h4>
                    <p className="text-sm text-gray-600">
                      {contract.type === 'vendor' ? 'Vendor' : 'Customer'} • 
                      Expires {endDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        daysRemaining <= 30
                          ? 'bg-red-100 text-red-800'
                          : daysRemaining <= 60
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {daysRemaining} days
                    </div>
                    {contract.autoRenewal && (
                      <p className="text-xs text-orange-600 mt-1">Auto-renews</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Contract Comparison Modal */}
      <ComparisonHub
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        existingContracts={contracts}
      />
    </div>
  );
}
