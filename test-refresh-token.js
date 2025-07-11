const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER = {
  userAccount: 'zou123',
  password: '123456zjl'
};

async function testRefreshToken() {
  console.log('🧪 开始测试双Token模式...\n');

  try {
    // 1. 用户登录
    console.log('1️⃣ 用户登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const { access_token, refresh_token, session_token } = loginResponse.data.data;
    console.log('✅ 登录成功');
    console.log('Access Token:', access_token.substring(0, 50) + '...');
    console.log('Refresh Token:', refresh_token.substring(0, 50) + '...\n');

    // 2. 使用access_token访问受保护的接口
    console.log('2️⃣ 使用access_token访问接口...');
    const sessionResponse = await axios.get(`${BASE_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('✅ access_token访问成功\n');

    // 3. 刷新access_token
    console.log('3️⃣ 刷新access_token...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refresh_token
    });
    const newTokens = refreshResponse.data.data;
    console.log('✅ 刷新成功');
    console.log('新Access Token:', newTokens.access_token.substring(0, 50) + '...');
    console.log('新Refresh Token:', newTokens.refresh_token.substring(0, 50) + '...\n');

    // 4. 使用新的access_token访问接口
    console.log('4️⃣ 使用新的access_token访问接口...');
    const newSessionResponse = await axios.get(`${BASE_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${newTokens.access_token}` }
    });
    console.log('✅ 新access_token访问成功\n');

    // 5. 尝试使用旧的access_token（应该失败）
    console.log('5️⃣ 尝试使用旧的access_token...');
    try {
      await axios.get(`${BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      console.log('❌ 旧access_token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 旧access_token已失效，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    // 6. 尝试使用旧的refresh_token（应该失败）
    console.log('6️⃣ 尝试使用旧的refresh_token...');
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refresh_token
      });
      console.log('❌ 旧refresh_token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 旧refresh_token已失效，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    // 7. 测试单设备登录
    console.log('7️⃣ 测试单设备登录...');
    const loginResponse2 = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    console.log('✅ 新设备登录成功\n');

    // 8. 尝试使用之前的refresh_token（应该失败）
    console.log('8️⃣ 尝试使用之前设备的refresh_token...');
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: newTokens.refresh_token
      });
      console.log('❌ 旧设备的refresh_token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 旧设备的refresh_token已失效，符合单设备登录预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    console.log('🎉 双Token模式测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testRefreshToken(); 