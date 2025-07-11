import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export class SimpleEncryptor {
  private static algorithm = 'aes-256-cbc';

  private static getKey(secret: string): Buffer {
    return createHash('sha256').update(secret).digest();
  }

  static encrypt(text: string, secret: string): string {
    const iv = randomBytes(16);
    const key = this.getKey(secret);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + encrypted.toString('hex');
  }

  static decrypt(encryptedHex: string, secret: string): string {
    const iv = Buffer.from(encryptedHex.substring(0, 32), 'hex');
    const encrypted = Buffer.from(encryptedHex.substring(32), 'hex');
    const key = this.getKey(secret);
    const decipher = createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
