// import { createCipheriv, randomBytes, createDecipheriv, scryptSync } from "crypto";

// function encrypt(password: string, data: string): string {
//     const salt = randomBytes(32);
//     const key = scryptSync(password, salt, 32); // Use scrypt to derive a key from the password

//     const iv = randomBytes(16);
//     const cipher = createCipheriv("aes-256-gcm", key, iv);
//     let encrypted = cipher.update(data, 'utf8', 'hex');
//     encrypted += cipher.final('hex');
//     const tag = cipher.getAuthTag().toString('hex'); // Get the authentication tag

//     return `${iv.toString('hex')}:${encrypted}:${tag}:${salt.toString('hex')}`;
// }



// function decrypt(password: string, data: string): string {
//     const [iv, encrypted, tag, salt] = data.split(':').map(part => Buffer.from(part, 'hex'));
//     const key = scryptSync(password, salt, 32); // Use scrypt to derive a key from the password

//     const decipher = createDecipheriv("aes-256-gcm", key, iv);
//     decipher.setAuthTag(tag); // Set the authentication tag for decryption
//     let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
//     decrypted += decipher.final('utf8');

//     return decrypted;
// }