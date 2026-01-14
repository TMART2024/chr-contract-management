import { useState } from 'react';
import { FileText, Calendar, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react';
import { formatDate, daysUntil, getUrgencyLevel, getUrgencyColor, getRiskColor } from '../../utils/helpers';

export default function ContractList({ contracts, onViewContract, onDeleteContract, type }) {
  const [sortBy, setSortBy] = useState('endDate');
  const [sortOrder, setSortOrder] = useState('asc');

  const sortedContracts = [...contracts].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'endDate':
        aVal = a.endDate?.toDate?.() || new Date(a.endDate);
        bVal = b.endDate?.toDate?.() || new Date(b.endDate);
        break;
      case 'risk':
        const riskOrder = { high: 3, medium: 2, low: 1 };
        aVal = riskOrder[a.riskLevel] || 0;
        bVal = riskOrder[b.riskLevel] || 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(field) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="card text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
        <p className="text-gray-500">
          {type === 'vendor' 
            ? 'Upload your first vendor contract to get started' 
            : 'Add your first customer contract to begin tracking'}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {sortBy === 'name' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              {type === 'customer' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th
                onClick={() => toggleSort('endDate')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>End Date</span>
                  {sortBy === 'endDate' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Until Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auto-Renewal
              </th>
              <th
                onClick={() => toggleSort('risk')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>Risk</span>
                  {sortBy === 'risk' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedContracts.map((contract) => {
              const daysRemaining = daysUntil(contract.endDate);
              const urgency = getUrgencyLevel(daysRemaining);
              const urgencyColor = getUrgencyColor(urgency);

              return (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.name}</div>
                        {contract.assessmentSummary && (
                          <div className="text-xs text-gray-500 mt-1">
                            {contract.assessmentSummary.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {type === 'customer' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {contract.contractType?.toUpperCase()}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {formatDate(contract.startDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {formatDate(contract.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${urgencyColor}`}>
                      {daysRemaining < 0 ? 'Expired' : `${daysRemaining} days`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contract.autoRenewal ? (
                      <div className="flex items-center text-orange-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="text-sm">
                          {contract.autoRenewalPeriod} yr{contract.autoRenewalPeriod > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contract.assessed ? (
                      <span className={`text-sm font-medium ${getRiskColor(contract.riskLevel)}`}>
                        {contract.riskLevel?.toUpperCase() || 'N/A'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Not assessed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onViewContract(contract)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {onDeleteContract && (
                        <button
                          onClick={() => onDeleteContract(contract.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete contract"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
