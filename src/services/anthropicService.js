// Use serverless function to avoid CORS issues
const ANTHROPIC_API_URL = '/api/anthropic';

/**
 * Analyze a contract document using Claude AI
 * @param {string} base64Document - Base64 encoded document
 * @param {string[]} criteria - Specific things to look for in the contract
 * @param {string} fileType - File type ('pdf' or 'docx')
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeContract(base64Document, criteria = [], fileType = 'pdf') {
  const defaultCriteria = [
    'auto-renewal clauses and terms',
    'cancellation notice requirements',
    'liability limitations',
    'payment terms and conditions',
    'concerning or unusual clauses',
    'jurisdiction and governing law'
  ];

  const assessmentCriteria = criteria.length > 0 ? criteria : defaultCriteria;
  
  // Extract text from document based on file type
  let contractText;
  try {
    const endpoint = fileType === 'docx' ? '/api/extract-docx-text' : '/api/extract-pdf-text';
    const bodyKey = fileType === 'docx' ? 'docxBase64' : 'pdfBase64';
    
    const extractResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [bodyKey]: base64Document })
    });

    if (!extractResponse.ok) {
      throw new Error(`Failed to extract text from ${fileType.toUpperCase()}`);
    }

    const extractData = await extractResponse.json();
    contractText = extractData.text;

    if (!contractText || contractText.trim().length === 0) {
      throw new Error(`No text could be extracted from the ${fileType.toUpperCase()}`);
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text from ${fileType.toUpperCase()}: ` + error.message);
  }
  
  const prompt = `You are a legal contract analyst. I need you to carefully review this contract document and provide a comprehensive assessment.

Please analyze the document for the following:
${assessmentCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide your analysis in the following JSON format:
{
  "summary": "Brief 2-3 sentence overall summary of the contract",
  "riskLevel": "low|medium|high",
  "findings": [
    {
      "type": "concern|warning|info",
      "category": "auto-renewal|cancellation|liability|pricing|other",
      "description": "Clear description of the finding",
      "severity": "low|medium|high",
      "excerpt": "Relevant quote from the contract",
      "recommendation": "What action should be taken"
    }
  ],
  "keyTerms": {
    "autoRenewal": "Yes/No and details",
    "renewalPeriod": "Duration if auto-renew exists",
    "cancellationNotice": "Number of days and any special requirements",
    "paymentTerms": "Net 30, Net 60, etc.",
    "liabilityLimits": "Any liability caps or exclusions",
    "jurisdiction": "Which state/country law governs"
  }
}

Focus especially on identifying any concerning clauses that might be disadvantageous, such as:
- Unusually long auto-renewal periods
- Short cancellation notice windows
- Broad liability waivers
- Automatic price increases
- One-sided termination rights
- Unusual jurisdiction clauses

Be thorough but concise. Flag anything that seems sketchy or could cause problems down the road.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${prompt}

CONTRACT TEXT:
${contractText}`
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const textContent = data.content.find(c => c.type === 'text')?.text;
    
    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      analysis,
      modelUsed: 'claude-sonnet-4-20250514',
      assessmentCriteria
    };

  } catch (error) {
    console.error('Contract analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ask a question across all contracts using their metadata
 * @param {string} query - User's question
 * @param {Array} contracts - Array of contract objects with metadata
 * @returns {Promise<Object>} Query response
 */
export async function queryContracts(query, contracts) {
  // Prepare contract metadata for Claude
  const contractData = contracts.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    contractType: c.contractType,
    startDate: c.startDate?.toDate?.()?.toISOString() || c.startDate,
    endDate: c.endDate?.toDate?.()?.toISOString() || c.endDate,
    renewalDate: c.renewalDate?.toDate?.()?.toISOString() || c.renewalDate,
    autoRenewal: c.autoRenewal,
    autoRenewalPeriod: c.autoRenewalPeriod,
    cancellationNoticeDays: c.cancellationNoticeDays,
    status: c.status,
    riskLevel: c.riskLevel,
    assessmentSummary: c.assessmentSummary,
    serviceType: c.serviceType,
    tags: c.tags
  }));

  const prompt = `You are a contract management assistant. I have a database of contracts and need you to answer questions about them.

Here is the contract data:
${JSON.stringify(contractData, null, 2)}

User question: ${query}

Please analyze the contracts and provide:
1. A direct answer to the question
2. A list of relevant contracts with key details
3. Any important observations or warnings

Format your response as JSON:
{
  "answer": "Direct answer to the question",
  "relevantContracts": [
    {
      "id": "contract id",
      "name": "contract name",
      "reason": "why this contract is relevant",
      "keyDetails": "important details to note"
    }
  ],
  "observations": ["any important patterns or concerns"]
}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to query contracts');
    }

    const data = await response.json();
    const textContent = data.content.find(c => c.type === 'text')?.text;
    
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse response');
    }

    return {
      success: true,
      result: JSON.parse(jsonMatch[0])
    };

  } catch (error) {
    console.error('Contract query error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
