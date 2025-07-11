const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  userAccount: 'zou123',
  password: '123456zjl'
};

// 配置测试参数
const CONFIG = {
  waitTime: 10 * 1000, // 等待时间（毫秒）- 10秒用于快速测试
  // 你可以修改这个值：
  // 10 * 1000 = 10秒（快速测试）
  // 60 * 1000 = 1分钟
  // 300 * 1000 = 5分钟
  // 360 * 1000 = 6分钟（确保过期）
};

async function testTokenExpiry() {
  console.log('🧪 开始测试Token过期...\n');
  console.log(`⏰ 配置的等待时间: ${CONFIG.waitTime / 1000}秒\n`);

  try {
    // 1. 用户登录
    console.log('1️⃣ 用户登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const { access_token, refresh_token } = loginResponse.data.data;
    console.log('✅ 登录成功');
    console.log('Access Token:', access_token.substring(0, 50) + '...');
    console.log('过期时间: 5分钟\n');

    // 2. 立即使用access_token访问接口
    console.log('2️⃣ 立即使用access_token访问接口...');
    const sessionResponse = await axios.get(`${BASE_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('✅ access_token访问成功\n');

    // 3. 等待指定时间
    console.log(`3️⃣ 等待${CONFIG.waitTime / 1000}秒...`);
    console.log('⏰ 开始等待...');
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.waitTime));
    
    console.log('⏰ 等待完成\n');

    // 4. 尝试使用access_token（可能已过期）
    console.log('4️⃣ 尝试使用access_token...');
    try {
      await axios.get(`${BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      console.log('✅ access_token仍然有效');
      console.log('💡 提示: 如果token仍然有效，可以增加等待时间\n');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ access_token已过期，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
        
        // 5. 使用refresh_token获取新的access_token
        console.log('5️⃣ 使用refresh_token获取新的access_token...');
        try {
          const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh_token
          });
          const newTokens = refreshResponse.data.data;
          console.log('✅ 刷新成功');
          console.log('新Access Token:', newTokens.access_token.substring(0, 50) + '...');
          console.log('新过期时间: 5分钟\n');

          // 6. 使用新的access_token访问接口
          console.log('6️⃣ 使用新的access_token访问接口...');
          const newSessionResponse = await axios.get(`${BASE_URL}/auth/session`, {
            headers: { Authorization: `Bearer ${newTokens.access_token}` }
          });
          console.log('✅ 新access_token访问成功\n');

        } catch (refreshError) {
          console.log('❌ 刷新token失败:', refreshError.response?.data?.message || refreshError.message);
        }
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    console.log('🎉 Token过期测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testTokenExpiry(); 