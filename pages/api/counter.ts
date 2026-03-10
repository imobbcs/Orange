import { NextApiRequest, NextApiResponse } from 'next';
import { VisitorData } from '../../types';
import { storage } from '../../server/storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VisitorData | { error: string }>
) {
  try {
    if (req.method === 'GET') {
      const data = await storage.getVisitorCount();
      res.status(200).json(data);
    } else if (req.method === 'POST') {
      const newData = await storage.incrementVisitorCount();
      res.status(200).json(newData);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling visitor counter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
