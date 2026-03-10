import { NextApiRequest, NextApiResponse } from 'next';

// API endpoint to trigger sitemap submission to Google Search Console
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Submit sitemap to Google
    const googleSubmissionUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent('https://whentobuybtc.xyz/api/sitemap.xml')}`;
    
    const response = await fetch(googleSubmissionUrl, { method: 'GET' });
    
    if (response.ok) {
      res.status(200).json({ 
        message: 'Sitemap submitted successfully to Google',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to submit sitemap to Google',
        status: response.status
      });
    }
  } catch (error) {
    console.error('Sitemap submission error:', error);
    res.status(500).json({ 
      message: 'Error submitting sitemap',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}