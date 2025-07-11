const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER = {
  userAccount: 'zou123',
  password: '123456zjl'
};

async function testQuickToken() {
  console.log('🧪 开始测试5分钟Token过期...\n');

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

    // 3. 等待6分钟让token过期
    console.log('3️⃣ 等待6分钟让token过期...');
    console.log('⏰ 开始等待...');
    
    // 为了快速测试，我们可以直接等待6分钟
    // 在实际测试中，你可以注释掉这个等待，手动等待6分钟
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000)); // 6分钟
    
    console.log('⏰ 等待完成，token应该已过期\n');

    // 4. 尝试使用过期的access_token（应该失败）
    console.log('4️⃣ 尝试使用过期的access_token...');
    try {
      await axios.get(`${BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      console.log('❌ 过期的access_token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 过期的access_token已失效，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

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

    } catch (error) {
      console.log('❌ 刷新token失败:', error.response?.data?.message || error.message);
    }

    console.log('🎉 5分钟Token过期测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testQuickToken(); 