import pdf from 'pdf-parse/lib/pdf-parse.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Extract text from PDF
    const data = await pdf(pdfBuffer);

    // Return extracted text
    return res.status(200).json({
      text: data.text,
      pages: data.numpages,
      info: data.info
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract text from PDF',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow large PDFs
    },
  },
};
