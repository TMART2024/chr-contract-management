import mammoth from 'mammoth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { docxBase64 } = req.body;

    if (!docxBase64) {
      return res.status(400).json({ error: 'No document data provided' });
    }

    // Convert base64 to buffer
    const docxBuffer = Buffer.from(docxBase64, 'base64');

    // Extract text from Word document
    const result = await mammoth.extractRawText({ buffer: docxBuffer });

    // Return extracted text
    return res.status(200).json({
      text: result.value,
      messages: result.messages
    });

  } catch (error) {
    console.error('DOCX extraction error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract text from Word document',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
