import crypto from 'crypto';

function encryptWithPublicKey(publicKey: string, data: string): string {
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
}

export default encryptWithPublicKey;