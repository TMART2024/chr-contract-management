import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getContracts } from '../services/contractService';
import { getMonthLabels, groupContractsByMonth, formatDate } from '../utils/helpers';

export default function Calendar() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('all');
  const [groupedContracts, setGroupedContracts] = useState([]);

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    if (contracts.length > 0) {
      const filtered = filterType === 'all' 
        ? contracts 
        : contracts.filter(c => c.type === filterType);
      
      const grouped = groupContractsByMonth(filtered, selectedYear);
      setGroupedContracts(grouped);
    }
  }, [contracts, selectedYear, filterType]);

  async function loadContracts() {
    setLoading(true);
    try {
      const result = await getContracts({ status: 'active' });
      if (result.success) {
        setContracts(result.contracts);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  const monthLabels = getMonthLabels(selectedYear);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Calendar</h1>
        <p className="text-gray-600">
          View contract expirations and renewals by month
        </p>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          {/* Year Selector */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{selectedYear}</h2>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Contracts</option>
              <option value="vendor">Vendor Only</option>
              <option value="customer">Customer Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthLabels.map((month, index) => {
          const monthContracts = groupedContracts[index] || [];
          
          return (
            <div key={month} className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                {month}
              </h3>

              {monthContracts.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4">No expirations</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {monthContracts.map((contract) => {
                    const endDate = contract.endDate?.toDate?.() || new Date(contract.endDate);
                    const daysUntil = Math.floor((endDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div
                        key={contract.id}
                        className={`p-3 rounded-lg border ${
                          contract.type === 'vendor'
                            ? 'border-purple-200 bg-purple-50'
                            : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 flex-1">
                            {contract.name}
                          </h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              contract.type === 'vendor'
                                ? 'bg-purple-200 text-purple-800'
                                : 'bg-green-200 text-green-800'
                            }`}
                          >
                            {contract.type}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1">
                          Expires: {formatDate(contract.endDate, 'MMM d')}
                        </p>
                        
                        {contract.autoRenewal && (
                          <div className="flex items-center text-xs text-orange-600 mb-1">
                            <span className="font-medium">Auto-renews</span>
                            <span className="mx-1">•</span>
                            <span>{contract.autoRenewalPeriod} year(s)</span>
                          </div>
                        )}
                        
                        {contract.cancellationNoticeDays && (
                          <p className="text-xs text-gray-500">
                            {contract.cancellationNoticeDays} day notice required
                          </p>
                        )}
                        
                        {daysUntil >= 0 && daysUntil <= 90 && (
                          <div
                            className={`mt-2 pt-2 border-t text-xs font-medium ${
                              daysUntil <= 30
                                ? 'border-red-200 text-red-700'
                                : daysUntil <= 60
                                ? 'border-orange-200 text-orange-700'
                                : 'border-yellow-200 text-yellow-700'
                            }`}
                          >
                            {daysUntil} days remaining
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedYear} Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-900">
              {groupedContracts.flat().length}
            </p>
            <p className="text-sm text-blue-700">Total Expirations</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-900">
              {groupedContracts.flat().filter(c => c.type === 'vendor').length}
            </p>
            <p className="text-sm text-purple-700">Vendor Contracts</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-900">
              {groupedContracts.flat().filter(c => c.type === 'customer').length}
            </p>
            <p className="text-sm text-green-700">Customer Contracts</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-900">
              {groupedContracts.flat().filter(c => c.autoRenewal).length}
            </p>
            <p className="text-sm text-orange-700">Auto-Renewals</p>
          </div>
        </div>
      </div>
    </div>
  );
}
