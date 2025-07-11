import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class EncryptUtils {
  private static algorithm = 'aes-256-cbc';

  /**
   * 派生密钥（key）长度为32字节
   */
  private static deriveKey(secret: string): Buffer {
    return createHash('sha256').update(secret).digest();
  }

  /**
   * AES 加密
   */
  static encrypt(text: string, secret: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const key = this.deriveKey(secret);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * AES 解密
   */
  static decrypt(encrypted: string, ivHex: string, secret: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const key = this.deriveKey(secret);
    const decipher = createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
