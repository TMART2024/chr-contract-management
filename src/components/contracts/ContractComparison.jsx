import { useState } from 'react';
import { X, Loader2, GitCompare, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export default function ContractComparison({ isOpen, onClose, contracts }) {
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [comparisonType, setComparisonType] = useState('terms');

  function toggleContract(contractId) {
    setSelectedContracts(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  }

  async function handleCompare() {
    if (selectedContracts.length < 2) {
      alert('Please select at least 2 contracts to compare');
      return;
    }

    setComparing(true);
    setComparison(null);

    try {
      const selectedContractData = contracts.filter(c => selectedContracts.includes(c.id));
      
      // Fetch the actual documents from storage if available
      const contractTexts = await Promise.all(
        selectedContractData.map(async (contract) => {
          if (contract.documentUrl) {
            try {
              const response = await fetch(contract.documentUrl);
              const blob = await response.blob();
              const base64 = await blobToBase64(blob);
              return {
                id: contract.id,
                name: contract.name,
                type: contract.type,
                hasDocument: true,
                base64: base64
              };
            } catch (error) {
              console.error('Error fetching document:', error);
              return {
                id: contract.id,
                name: contract.name,
                type: contract.type,
                hasDocument: false,
                metadata: {
                  startDate: contract.startDate?.toDate?.()?.toISOString(),
                  endDate: contract.endDate?.toDate?.()?.toISOString(),
                  autoRenewal: contract.autoRenewal,
                  cancellationNoticeDays: contract.cancellationNoticeDays,
                  assessmentSummary: contract.assessmentSummary
                }
              };
            }
          } else {
            return {
              id: contract.id,
              name: contract.name,
              type: contract.type,
              hasDocument: false,
              metadata: {
                startDate: contract.startDate?.toDate?.()?.toISOString(),
                endDate: contract.endDate?.toDate?.()?.toISOString(),
                autoRenewal: contract.autoRenewal,
                cancellationNoticeDays: contract.cancellationNoticeDays,
                assessmentSummary: contract.assessmentSummary
              }
            };
          }
        })
      );

      const result = await compareContracts(contractTexts, comparisonType);
      
      if (result.success) {
        setComparison(result.comparison);
      } else {
        alert(`Comparison failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Comparison error:', error);
      alert('Failed to compare contracts');
    } finally {
      setComparing(false);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function compareContracts(contractData, type) {
    const prompts = {
      terms: `Compare these contracts focusing on:
- Key terms and conditions
- Payment terms and pricing
- Contract duration and renewal terms
- Cancellation and termination clauses
- Any significant differences in obligations`,
      
      risks: `Compare these contracts focusing on risk factors:
- Liability limitations and indemnification
- Insurance requirements
- Warranty provisions
- Dispute resolution mechanisms
- Any concerning or unfavorable clauses`,
      
      pricing: `Compare these contracts focusing on financial terms:
- Pricing structure and rates
- Payment terms and schedules
- Price increase provisions
- Additional fees or charges
- Cost comparison and value analysis`,
      
      favorable: `Analyze which contract is more favorable to CHR Solutions:
- Better terms and conditions
- Lower risk exposure
- More flexible cancellation
- Better pricing
- Overall recommendation`
    };

    const prompt = `You are a legal contract analyst comparing multiple contracts. 

${prompts[type]}

Contracts to compare:
${contractData.map((c, i) => `
Contract ${i + 1}: ${c.name} (${c.type})
${c.hasDocument ? '[Full document provided]' : `Metadata: ${JSON.stringify(c.metadata, null, 2)}`}
`).join('\n')}

Provide a comprehensive comparison in JSON format:
{
  "summary": "Overall comparison summary",
  "contracts": [
    {
      "name": "Contract name",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "keyTerms": ["term 1", "term 2"]
    }
  ],
  "keyDifferences": [
    {
      "category": "category name",
      "description": "detailed description of differences",
      "impact": "low|medium|high"
    }
  ],
  "recommendation": "Which contract is better and why",
  "concerns": ["concern 1", "concern 2"]
}`;

    try {
      const messages = [{
        role: 'user',
        content: []
      }];

      // Add documents if available
      contractData.forEach(contract => {
        if (contract.hasDocument) {
          messages[0].content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: contract.base64
            }
          });
        }
      });

      // Add the text prompt
      messages[0].content.push({
        type: 'text',
        text: prompt
      });

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const textContent = data.content.find(c => c.type === 'text')?.text;
      
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }

      return {
        success: true,
        comparison: JSON.parse(jsonMatch[0])
      };

    } catch (error) {
      console.error('Comparison error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <GitCompare className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Compare Contracts</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!comparison && (
            <>
              {/* Comparison Type */}
              <div>
                <label className="label">Comparison Focus</label>
                <select
                  value={comparisonType}
                  onChange={(e) => setComparisonType(e.target.value)}
                  className="input-field"
                >
                  <option value="terms">Terms & Conditions</option>
                  <option value="risks">Risk Analysis</option>
                  <option value="pricing">Pricing & Financial Terms</option>
                  <option value="favorable">Most Favorable Contract</option>
                </select>
              </div>

              {/* Contract Selection */}
              <div>
                <label className="label">
                  Select Contracts to Compare (minimum 2, selected: {selectedContracts.length})
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {contracts.map(contract => (
                    <label
                      key={contract.id}
                      className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedContracts.includes(contract.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(contract.id)}
                        onChange={() => toggleContract(contract.id)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{contract.name}</h4>
                        <p className="text-sm text-gray-600">
                          {contract.type === 'vendor' ? 'Vendor' : 'Customer'} • 
                          {contract.contractType && ` ${contract.contractType.toUpperCase()} •`}
                          {contract.documentUrl ? ' Has document' : ' Metadata only'}
                        </p>
                        {contract.assessmentSummary && (
                          <p className="text-xs text-gray-500 mt-1">
                            {contract.assessmentSummary.substring(0, 80)}...
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Compare Button */}
              <button
                onClick={handleCompare}
                disabled={selectedContracts.length < 2 || comparing}
                className="btn-primary w-full"
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Comparing Contracts...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-5 h-5 mr-2 inline" />
                    Compare Selected Contracts
                  </>
                )}
              </button>
            </>
          )}

          {/* Comparison Results */}
          {comparison && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Comparison Summary</h3>
                <p className="text-blue-800">{comparison.summary}</p>
              </div>

              {/* Individual Contracts */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contract Analysis</h3>
                <div className="space-y-4">
                  {comparison.contracts?.map((contract, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{contract.name}</h4>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2">Strengths:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {contract.strengths?.map((strength, i) => (
                              <li key={i} className="text-sm text-gray-700">{strength}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-2">Weaknesses:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {contract.weaknesses?.map((weakness, i) => (
                              <li key={i} className="text-sm text-gray-700">{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {contract.keyTerms && contract.keyTerms.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Key Terms:</p>
                          <div className="flex flex-wrap gap-2">
                            {contract.keyTerms.map((term, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Differences */}
              {comparison.keyDifferences && comparison.keyDifferences.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Key Differences</h3>
                  <div className="space-y-3">
                    {comparison.keyDifferences.map((diff, index) => (
                      <div key={index} className="border-l-4 pl-4 py-2" style={{
                        borderColor: diff.impact === 'high' ? '#ef4444' : diff.impact === 'medium' ? '#f59e0b' : '#10b981'
                      }}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900">{diff.category}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            diff.impact === 'high' ? 'bg-red-100 text-red-700' :
                            diff.impact === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {diff.impact} impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{diff.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Recommendation
                </h3>
                <p className="text-green-800">{comparison.recommendation}</p>
              </div>

              {/* Concerns */}
              {comparison.concerns && comparison.concerns.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Points of Concern
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {comparison.concerns.map((concern, i) => (
                      <li key={i} className="text-sm text-yellow-800">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setComparison(null)}
                  className="btn-secondary flex-1"
                >
                  Compare Different Contracts
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary flex-1"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
