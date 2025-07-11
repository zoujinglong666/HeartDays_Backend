import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export class PasswordUtils {
  /**
   * 对密码进行SHA256加密（与前端保持一致）
   */
  static encryptPassword(password: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }

  /**
   * 验证前端传来的加密密码（前端已经SHA256加密，后端直接比较）
   */
  static verifyFrontendPassword(frontendEncryptedPassword: string, storedPassword: string): boolean {
    // 前端传来的密码已经是SHA256加密的，直接与存储的密码比较
    return frontendEncryptedPassword === storedPassword;
  }

  /**
   * 验证密码（兼容bcrypt和SHA256两种格式）
   */
  static async verifyPassword(inputPassword: string, hashedPassword: string): Promise<boolean> {
    // 首先尝试SHA256验证（新格式）
    const inputHash = this.encryptPassword(inputPassword);
    if (inputHash === hashedPassword) {
      return true;
    }

    // 如果SHA256验证失败，尝试bcrypt验证（旧格式）
    try {
      return await bcrypt.compare(inputPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证密码（同步版本，用于兼容旧代码）
   */
  static verifyPasswordSync(inputPassword: string, hashedPassword: string): boolean {
    const inputHash = this.encryptPassword(inputPassword);
    return inputHash === hashedPassword;
  }

  /**
   * 生成随机盐值（可选，用于增强安全性）
   */
  static generateSalt(): string {
    const random = Date.now().toString();
    const hash = crypto.createHash('sha256');
    hash.update(random);
    return hash.digest('hex').substring(0, 16); // 取前16位作为盐值
  }

  /**
   * 使用盐值加密密码（更安全的方式）
   */
  static encryptPasswordWithSalt(password: string, salt: string): string {
    const saltedPassword = password + salt;
    const hash = crypto.createHash('sha256');
    hash.update(saltedPassword);
    return hash.digest('hex');
  }

  /**
   * 判断密码是否为bcrypt格式
   */
  static isBcryptHash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }

  /**
   * 判断密码是否为SHA256格式
   */
  static isSha256Hash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }
} 