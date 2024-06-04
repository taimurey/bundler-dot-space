import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SendBundle } from './bundle-sender';

export interface BundleData {
    blockengine: string;
    txns: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'POST') {
        // Check if the request body is empty
        if (Object.keys(req.body).length === 0) {
            res.status(405).json({ error: 'Not Allowed' });
            return;
        }

        const data: BundleData = req.body;
        console.log(data);

        // Check if any data is empty
        if (Object.values(data).some(value => value === '')) {
            res.status(400).json({ error: 'Please fill all the details' });
            return;
        }

        try {
            await SendBundle(data);
            res.status(200).json({ message: 'Bundle sent successfully' });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({ error: `Failed to send bundle: ${error.message}` });
        }
    } else {
        res.status(405).json({ error: 'Only POST requests are allowed' });
    }
}