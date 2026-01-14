import { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { queryContracts } from '../../services/anthropicService';

export default function AIQuery({ contracts }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleQuery(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await queryContracts(query, contracts);
      
      if (response.success) {
        setResult(response.result);
      } else {
        setResult({
          answer: `Error: ${response.error}`,
          relevantContracts: [],
          observations: []
        });
      }
    } catch (error) {
      console.error('Query error:', error);
      setResult({
        answer: 'An error occurred while processing your query.',
        relevantContracts: [],
        observations: []
      });
    } finally {
      setLoading(false);
    }
  }

  const exampleQueries = [
    'What vendor contracts expire in 2027?',
    'Show me all contracts with auto-renewal clauses',
    'Which contracts need 90-day cancellation notice?',
    'What high-risk customer contracts are coming up for renewal?'
  ];

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">AI Contract Query</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Ask questions about your contracts. The AI will search across all contract metadata to provide answers.
      </p>

      <form onSubmit={handleQuery} className="mb-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your contracts..."
              className="input-field pl-10"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Example queries */}
      {!result && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Example queries:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Answer */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Answer:</h3>
            <p className="text-gray-700">{result.answer}</p>
          </div>

          {/* Relevant Contracts */}
          {result.relevantContracts && result.relevantContracts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Relevant Contracts:</h3>
              <div className="space-y-2">
                {result.relevantContracts.map((contract, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-gray-900">{contract.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{contract.reason}</p>
                    <p className="text-xs text-gray-500">{contract.keyDetails}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          {result.observations && result.observations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Observations:</h3>
              <ul className="list-disc list-inside space-y-1">
                {result.observations.map((obs, index) => (
                  <li key={index} className="text-sm text-gray-700">{obs}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
