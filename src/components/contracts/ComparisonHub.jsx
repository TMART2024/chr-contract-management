import { useState, useCallback } from 'react';
import { X, Loader2, GitCompare, Upload, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { fileToBase64, formatFileSize, isValidFileType } from '../../utils/helpers';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export default function ComparisonHub({ isOpen, onClose, existingContracts = [] }) {
  const [mode, setMode] = useState(null); // 'existing', 'proposals', 'renewal'
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [comparisonType, setComparisonType] = useState('terms');

  // Mode 1: Compare Existing Contracts
  const [selectedExisting, setSelectedExisting] = useState([]);

  // Mode 2: Compare New Proposals
  const [proposalFiles, setProposalFiles] = useState([]);

  // Mode 3: Compare New vs Existing
  const [selectedContract, setSelectedContract] = useState(null);
  const [newProposalFile, setNewProposalFile] = useState(null);

  const onDropProposals = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter(f => isValidFileType(f));
    setProposalFiles(prev => [...prev, ...validFiles]);
  }, []);

  const onDropRenewal = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (isValidFileType(file)) {
        setNewProposalFile(file);
      }
    }
  }, []);

  const { getRootProps: getProposalsProps, getInputProps: getProposalsInput } = useDropzone({
    onDrop: onDropProposals,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const { getRootProps: getRenewalProps, getInputProps: getRenewalInput } = useDropzone({
    onDrop: onDropRenewal,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  function resetState() {
    setMode(null);
    setComparison(null);
    setSelectedExisting([]);
    setProposalFiles([]);
    setSelectedContract(null);
    setNewProposalFile(null);
  }

  function toggleExistingContract(contractId) {
    setSelectedExisting(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  }

  function removeProposalFile(index) {
    setProposalFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCompare() {
    setComparing(true);
    setComparison(null);

    try {
      let result;
      
      if (mode === 'existing') {
        result = await compareExistingContracts();
      } else if (mode === 'proposals') {
        result = await compareProposals();
      } else if (mode === 'renewal') {
        result = await compareRenewal();
      }

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

  async function compareExistingContracts() {
    const contracts = existingContracts.filter(c => selectedExisting.includes(c.id));
    
    const contractData = await Promise.all(
      contracts.map(async (contract) => {
        if (contract.documentUrl) {
          try {
            const response = await fetch(contract.documentUrl);
            const blob = await response.blob();
            const base64 = await fileToBase64(blob);
            return {
              name: contract.name,
              type: contract.type,
              hasDocument: true,
              base64: base64
            };
          } catch (error) {
            return {
              name: contract.name,
              type: contract.type,
              hasDocument: false,
              metadata: getContractMetadata(contract)
            };
          }
        }
        return {
          name: contract.name,
          type: contract.type,
          hasDocument: false,
          metadata: getContractMetadata(contract)
        };
      })
    );

    return await performComparison(contractData, comparisonType, 'existing');
  }

  async function compareProposals() {
    const contractData = await Promise.all(
      proposalFiles.map(async (file, index) => {
        const base64 = await fileToBase64(file);
        return {
          name: file.name.replace('.pdf', ''),
          type: 'proposal',
          hasDocument: true,
          base64: base64,
          isProposal: true
        };
      })
    );

    return await performComparison(contractData, comparisonType, 'proposals');
  }

  async function compareRenewal() {
    const existingContract = existingContracts.find(c => c.id === selectedContract);
    const contractData = [];

    // Existing contract
    if (existingContract.documentUrl) {
      try {
        const response = await fetch(existingContract.documentUrl);
        const blob = await response.blob();
        const base64 = await fileToBase64(blob);
        contractData.push({
          name: `${existingContract.name} (Current)`,
          type: 'existing',
          hasDocument: true,
          base64: base64
        });
      } catch (error) {
        contractData.push({
          name: `${existingContract.name} (Current)`,
          type: 'existing',
          hasDocument: false,
          metadata: getContractMetadata(existingContract)
        });
      }
    } else {
      contractData.push({
        name: `${existingContract.name} (Current)`,
        type: 'existing',
        hasDocument: false,
        metadata: getContractMetadata(existingContract)
      });
    }

    // New proposal
    const proposalBase64 = await fileToBase64(newProposalFile);
    contractData.push({
      name: `${newProposalFile.name.replace('.pdf', '')} (Proposed)`,
      type: 'proposal',
      hasDocument: true,
      base64: proposalBase64,
      isProposal: true
    });

    return await performComparison(contractData, comparisonType, 'renewal');
  }

  function getContractMetadata(contract) {
    return {
      startDate: contract.startDate?.toDate?.()?.toISOString(),
      endDate: contract.endDate?.toDate?.()?.toISOString(),
      autoRenewal: contract.autoRenewal,
      autoRenewalPeriod: contract.autoRenewalPeriod,
      cancellationNoticeDays: contract.cancellationNoticeDays,
      riskLevel: contract.riskLevel,
      assessmentSummary: contract.assessmentSummary
    };
  }

  async function performComparison(contractData, type, mode) {
    const prompts = {
      terms: `Compare these contracts focusing on:
- Key terms and conditions
- Payment terms and pricing
- Contract duration and renewal terms
- Cancellation and termination clauses
- Any significant differences in obligations
${mode === 'proposals' ? '- Recommend which proposal offers the best value' : ''}
${mode === 'renewal' ? '- Is the new proposal better or worse than the existing contract?' : ''}`,
      
      risks: `Compare these contracts focusing on risk factors:
- Liability limitations and indemnification
- Insurance requirements
- Warranty provisions
- Dispute resolution mechanisms
- Any concerning or unfavorable clauses
${mode === 'renewal' ? '- Does the new proposal increase or decrease risk exposure?' : ''}`,
      
      pricing: `Compare these contracts focusing on financial terms:
- Pricing structure and rates
- Payment terms and schedules
- Price increase provisions
- Additional fees or charges
- Cost comparison and value analysis
${mode === 'renewal' ? '- Is the new pricing better, worse, or comparable?' : ''}`,
      
      favorable: `Analyze which contract is most favorable to CHR Solutions:
- Better terms and conditions
- Lower risk exposure
- More flexible cancellation
- Better pricing
- Overall recommendation
${mode === 'renewal' ? '- Should CHR accept the renewal or negotiate/seek alternatives?' : ''}`
    };

    const prompt = `You are a legal contract analyst for CHR Solutions comparing ${mode === 'proposals' ? 'new vendor proposals' : mode === 'renewal' ? 'a renewal proposal against the existing contract' : 'existing contracts'}.

${prompts[type]}

Contracts to compare:
${contractData.map((c, i) => `
Contract ${i + 1}: ${c.name}
${c.hasDocument ? '[Full PDF document provided for analysis]' : `Metadata: ${JSON.stringify(c.metadata, null, 2)}`}
`).join('\n')}

Provide a comprehensive comparison in JSON format:
{
  "summary": "Overall comparison summary with clear recommendation",
  "contracts": [
    {
      "name": "Contract name",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "keyTerms": ["term 1", "term 2"],
      "score": "1-10 rating based on favorability to CHR"
    }
  ],
  "keyDifferences": [
    {
      "category": "category name",
      "description": "detailed description of differences",
      "impact": "low|medium|high",
      "favorsBuyer": true/false
    }
  ],
  "recommendation": "${mode === 'renewal' ? 'Accept renewal, negotiate changes, or seek alternatives' : 'Which contract is best for CHR and why'}",
  "concerns": ["concern 1", "concern 2"],
  "actionItems": ["action 1", "action 2"]
}`;

    try {
      const messages = [{
        role: 'user',
        content: []
      }];

      // Add documents
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
            <h2 className="text-2xl font-bold text-gray-900">Contract Comparison Hub</h2>
          </div>
          <button onClick={() => { resetState(); onClose(); }} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          {!mode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setMode('existing')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <GitCompare className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Compare Existing Contracts
                </h3>
                <p className="text-sm text-gray-600">
                  Compare contracts already in your database to find the best terms
                </p>
              </button>

              <button
                onClick={() => setMode('proposals')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <Upload className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Compare New Proposals
                </h3>
                <p className="text-sm text-gray-600">
                  Upload multiple vendor proposals and compare before choosing
                </p>
              </button>

              <button
                onClick={() => setMode('renewal')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <FileText className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Compare Renewal vs Current
                </h3>
                <p className="text-sm text-gray-600">
                  Compare a renewal proposal against your existing contract
                </p>
              </button>
            </div>
          )}

          {/* Mode: Compare Existing Contracts */}
          {mode === 'existing' && !comparison && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Compare Existing Contracts</h3>
                <button onClick={() => setMode(null)} className="text-sm text-gray-600 hover:text-gray-900">
                  ← Back to modes
                </button>
              </div>

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

              <div>
                <label className="label">
                  Select Contracts (minimum 2, selected: {selectedExisting.length})
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {existingContracts.map(contract => (
                    <label
                      key={contract.id}
                      className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedExisting.includes(contract.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExisting.includes(contract.id)}
                        onChange={() => toggleExistingContract(contract.id)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{contract.name}</h4>
                        <p className="text-sm text-gray-600">
                          {contract.type === 'vendor' ? 'Vendor' : 'Customer'} • 
                          {contract.contractType && ` ${contract.contractType.toUpperCase()}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCompare}
                disabled={selectedExisting.length < 2 || comparing}
                className="btn-primary w-full"
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Comparing...
                  </>
                ) : (
                  'Compare Selected Contracts'
                )}
              </button>
            </>
          )}

          {/* Mode: Compare New Proposals */}
          {mode === 'proposals' && !comparison && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Compare New Proposals</h3>
                <button onClick={() => setMode(null)} className="text-sm text-gray-600 hover:text-gray-900">
                  ← Back to modes
                </button>
              </div>

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
                  <option value="favorable">Best Overall Value</option>
                </select>
              </div>

              <div>
                <label className="label">Upload Proposal PDFs (minimum 2)</label>
                <div
                  {...getProposalsProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                >
                  <input {...getProposalsInput()} />
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">
                    Drag and drop PDFs here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Upload multiple proposals to compare</p>
                </div>
              </div>

              {proposalFiles.length > 0 && (
                <div>
                  <label className="label">Uploaded Proposals ({proposalFiles.length})</label>
                  <div className="space-y-2">
                    {proposalFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeProposalFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleCompare}
                disabled={proposalFiles.length < 2 || comparing}
                className="btn-primary w-full"
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Comparing...
                  </>
                ) : (
                  'Compare Proposals'
                )}
              </button>
            </>
          )}

          {/* Mode: Compare Renewal */}
          {mode === 'renewal' && !comparison && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Compare Renewal vs Current Contract</h3>
                <button onClick={() => setMode(null)} className="text-sm text-gray-600 hover:text-gray-900">
                  ← Back to modes
                </button>
              </div>

              <div>
                <label className="label">Comparison Focus</label>
                <select
                  value={comparisonType}
                  onChange={(e) => setComparisonType(e.target.value)}
                  className="input-field"
                >
                  <option value="terms">Terms & Conditions</option>
                  <option value="risks">Risk Analysis</option>
                  <option value="pricing">Pricing Comparison</option>
                  <option value="favorable">Should We Renew?</option>
                </select>
              </div>

              <div>
                <label className="label">Select Current Contract</label>
                <select
                  value={selectedContract || ''}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a contract...</option>
                  {existingContracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.name} ({contract.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Upload Renewal Proposal PDF</label>
                <div
                  {...getRenewalProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                >
                  <input {...getRenewalInput()} />
                  {newProposalFile ? (
                    <div>
                      <FileText className="w-12 h-12 mx-auto text-primary-600 mb-4" />
                      <p className="text-sm font-medium text-gray-900">{newProposalFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(newProposalFile.size)}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600">
                        Drag and drop renewal PDF here, or click to select
                      </p>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleCompare}
                disabled={!selectedContract || !newProposalFile || comparing}
                className="btn-primary w-full"
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Comparing...
                  </>
                ) : (
                  'Compare Renewal'
                )}
              </button>
            </>
          )}

          {/* Comparison Results */}
          {comparison && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Comparison Results</h3>
                <button onClick={() => setComparison(null)} className="text-sm text-primary-600 hover:text-primary-800">
                  ← New Comparison
                </button>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                <p className="text-blue-800">{comparison.summary}</p>
              </div>

              {/* Individual Contracts */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contract Analysis</h3>
                <div className="space-y-4">
                  {comparison.contracts?.map((contract, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{contract.name}</h4>
                        {contract.score && (
                          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                            Score: {contract.score}/10
                          </span>
                        )}
                      </div>
                      
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
                          <div className="flex items-center space-x-2">
                            {diff.favorsBuyer !== undefined && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                diff.favorsBuyer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {diff.favorsBuyer ? '✓ Favors CHR' : '✗ Favors Vendor'}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              diff.impact === 'high' ? 'bg-red-100 text-red-700' :
                              diff.impact === 'medium' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {diff.impact} impact
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{diff.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Recommendation</h3>
                <p className="text-green-800 whitespace-pre-line">{comparison.recommendation}</p>
              </div>

              {/* Action Items */}
              {comparison.actionItems && comparison.actionItems.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Action Items</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {comparison.actionItems.map((action, i) => (
                      <li key={i} className="text-sm text-purple-800">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {comparison.concerns && comparison.concerns.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Points of Concern</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {comparison.concerns.map((concern, i) => (
                      <li key={i} className="text-sm text-yellow-800">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => { resetState(); onClose(); }} className="btn-primary w-full">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
