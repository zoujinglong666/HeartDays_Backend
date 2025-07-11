const crypto = require('crypto');

// 模拟前端密码加密
function frontendEncryptPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

// 模拟后端密码工具
class PasswordUtils {
  static encryptPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }

  static verifyFrontendPassword(frontendEncryptedPassword, storedPassword) {
    // 前端传来的密码已经是SHA256加密的，直接与存储的密码比较
    return frontendEncryptedPassword === storedPassword;
  }
}

// 测试函数
function testFrontendPasswordFlow() {
  const originalPassword = '123456';
  
  console.log('=== 前端密码加密流程测试 ===');
  console.log(`原始密码: ${originalPassword}`);
  
  // 1. 前端加密密码
  const frontendEncrypted = frontendEncryptPassword(originalPassword);
  console.log(`前端加密后: ${frontendEncrypted}`);
  
  // 2. 后端存储密码（假设注册时前端传来的是明文）
  const backendStored = PasswordUtils.encryptPassword(originalPassword);
  console.log(`后端存储的密码: ${backendStored}`);
  
  // 3. 登录时前端再次加密密码
  const loginEncrypted = frontendEncryptPassword(originalPassword);
  console.log(`登录时前端加密: ${loginEncrypted}`);
  
  // 4. 后端验证
  const isValid = PasswordUtils.verifyFrontendPassword(loginEncrypted, backendStored);
  console.log(`验证结果: ${isValid}`);
  
  // 5. 测试错误密码
  const wrongPassword = 'wrongpassword';
  const wrongEncrypted = frontendEncryptPassword(wrongPassword);
  console.log(`错误密码加密: ${wrongEncrypted}`);
  const wrongValid = PasswordUtils.verifyFrontendPassword(wrongEncrypted, backendStored);
  console.log(`错误密码验证结果: ${wrongValid}`);
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testFrontendPasswordFlow(); 