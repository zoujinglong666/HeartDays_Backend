const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// 模拟PasswordUtils类
class PasswordUtils {
  static encryptPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }

  static async verifyPassword(inputPassword, hashedPassword) {
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

  static isBcryptHash(hash) {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }

  static isSha256Hash(hash) {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }
}

// 测试函数
async function testPasswordMigration() {
  const testPassword = '123456';
  
  console.log('=== 密码迁移测试 ===');
  console.log(`测试密码: ${testPassword}`);
  
  // 1. 测试bcrypt格式（旧格式）
  console.log('\n1. 测试bcrypt格式:');
  const bcryptHash = await bcrypt.hash(testPassword, 10);
  console.log(`bcrypt哈希: ${bcryptHash}`);
  console.log(`是否为bcrypt格式: ${PasswordUtils.isBcryptHash(bcryptHash)}`);
  
  const bcryptResult = await PasswordUtils.verifyPassword(testPassword, bcryptHash);
  console.log(`bcrypt验证结果: ${bcryptResult}`);
  
  // 2. 测试SHA256格式（新格式）
  console.log('\n2. 测试SHA256格式:');
  const sha256Hash = PasswordUtils.encryptPassword(testPassword);
  console.log(`SHA256哈希: ${sha256Hash}`);
  console.log(`是否为SHA256格式: ${PasswordUtils.isSha256Hash(sha256Hash)}`);
  
  const sha256Result = await PasswordUtils.verifyPassword(testPassword, sha256Hash);
  console.log(`SHA256验证结果: ${sha256Result}`);
  
  // 3. 测试错误密码
  console.log('\n3. 测试错误密码:');
  const wrongPassword = 'wrongpassword';
  const wrongBcryptResult = await PasswordUtils.verifyPassword(wrongPassword, bcryptHash);
  const wrongSha256Result = await PasswordUtils.verifyPassword(wrongPassword, sha256Hash);
  console.log(`错误密码bcrypt验证: ${wrongBcryptResult}`);
  console.log(`错误密码SHA256验证: ${wrongSha256Result}`);
  
  // 4. 测试前端加密的密码
  console.log('\n4. 测试前端加密的密码:');
  const frontendPassword = '123456';
  const frontendHash = PasswordUtils.encryptPassword(frontendPassword);
  console.log(`前端密码: ${frontendPassword}`);
  console.log(`前端加密结果: ${frontendHash}`);
  
  const frontendResult = await PasswordUtils.verifyPassword(frontendPassword, frontendHash);
  console.log(`前端密码验证结果: ${frontendResult}`);
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testPasswordMigration().catch(console.error); 