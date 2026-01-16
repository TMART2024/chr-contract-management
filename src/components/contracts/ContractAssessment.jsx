import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { analyzeContract } from '../../services/anthropicService';
import { fileToBase64, formatFileSize, isValidFileType } from '../../utils/helpers';

export default function ContractAssessment({ isOpen, onClose, onAssessmentComplete }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [criteria, setCriteria] = useState([
    'auto-renewal clauses',
    'cancellation notice requirements',
    'liability limitations',
    'concerning clauses'
  ]);
  const [newCriterion, setNewCriterion] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      if (isValidFileType(uploadedFile)) {
        setFile(uploadedFile);
        setAssessment(null);
      } else {
        alert('Please upload a PDF or Word document (.docx)');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  async function handleAnalyze() {
    if (!file) return;

    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      const fileType = file.type.includes('word') || file.name.endsWith('.docx') ? 'docx' : 'pdf';
      const result = await analyzeContract(base64, criteria, fileType);

      if (result.success) {
        setAssessment(result.analysis);
      } else {
        alert(`Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze contract');
    } finally {
      setAnalyzing(false);
    }
  }

  function addCriterion() {
    if (newCriterion.trim() && !criteria.includes(newCriterion.trim())) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  }

  function removeCriterion(index) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  function handleComplete() {
    if (assessment) {
      onAssessmentComplete({
        file,
        assessment,
        criteria
      });
      handleClose();
    }
  }

  function handleClose() {
    setFile(null);
    setAssessment(null);
    setAnalyzing(false);
    onClose();
  }

  if (!isOpen) return null;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Assess Contract</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          {!assessment && (
            <>
              <div>
                <label className="label">Upload Contract Document (PDF)</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  {file ? (
                    <div>
                      <FileText className="w-8 h-8 mx-auto text-primary-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Drag and drop a PDF here, or click to select
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                    </>
                  )}
                </div>
              </div>

              {/* Assessment Criteria */}
              <div>
                <label className="label">Assessment Criteria</label>
                <p className="text-sm text-gray-500 mb-3">
                  Specify what you want the AI to look for in this contract
                </p>
                
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCriterion()}
                    placeholder="Add assessment criterion..."
                    className="input-field flex-1"
                  />
                  <button onClick={addCriterion} className="btn-secondary">
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {criteria.map((criterion, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-primary-100 text-primary-800 px-3 py-1 rounded-full"
                    >
                      <span className="text-sm">{criterion}</span>
                      <button
                        onClick={() => removeCriterion(index)}
                        className="hover:bg-primary-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!file || analyzing}
                className="btn-primary w-full"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Analyzing Contract...
                  </>
                ) : (
                  'Analyze Contract'
                )}
              </button>
            </>
          )}

          {/* Assessment Results */}
          {assessment && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-gray-700">{assessment.summary}</p>
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Risk Level:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      assessment.riskLevel === 'high'
                        ? 'bg-red-100 text-red-800'
                        : assessment.riskLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {assessment.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Findings */}
              {assessment.findings && assessment.findings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Findings</h3>
                  <div className="space-y-3">
                    {assessment.findings.map((finding, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(finding.severity)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {finding.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  finding.severity === 'high'
                                    ? 'bg-red-100 text-red-700'
                                    : finding.severity === 'medium'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {finding.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{finding.description}</p>
                            {finding.excerpt && (
                              <div className="bg-gray-50 rounded p-2 mb-2">
                                <p className="text-xs text-gray-600 italic">"{finding.excerpt}"</p>
                              </div>
                            )}
                            {finding.recommendation && (
                              <p className="text-sm text-primary-700">
                                <strong>Recommendation:</strong> {finding.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Terms */}
              {assessment.keyTerms && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Key Terms</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(assessment.keyTerms).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-900">{value || 'Not specified'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button onClick={handleComplete} className="btn-primary flex-1">
                  <CheckCircle className="w-5 h-5 mr-2 inline" />
                  Accept and Continue
                </button>
                <button onClick={() => setAssessment(null)} className="btn-secondary">
                  Re-analyze
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
