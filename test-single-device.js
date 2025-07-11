const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER = {
  userAccount: 'zou123',
  password: '123456zjl'
};

async function testSingleDeviceLogin() {
  console.log('🧪 开始测试单设备登录功能...\n');

  try {
    // 1. 首次登录
    console.log('1️⃣ 首次登录...');
    const loginResponse1 = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token1 = loginResponse1.data.data.access_token;
    console.log('✅ 首次登录成功');
    console.log('Token:', token1.substring(0, 50) + '...\n');

    // 2. 使用第一个token访问受保护的接口
    console.log('2️⃣ 使用第一个token访问接口...');
    const sessionResponse1 = await axios.get(`${BASE_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✅ 第一个token访问成功');
    console.log('会话信息:', JSON.stringify(sessionResponse1.data.data.session, null, 2), '\n');

    // 3. 在新设备登录（模拟）
    console.log('3️⃣ 在新设备登录...');
    const loginResponse2 = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token2 = loginResponse2.data.data.access_token;
    console.log('✅ 新设备登录成功');
    console.log('新Token:', token2.substring(0, 50) + '...\n');

    // 4. 尝试使用旧token访问接口（应该失败）
    console.log('4️⃣ 尝试使用旧token访问接口...');
    try {
      await axios.get(`${BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      console.log('❌ 旧token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 旧token已失效，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    // 5. 使用新token访问接口
    console.log('5️⃣ 使用新token访问接口...');
    const sessionResponse2 = await axios.get(`${BASE_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    console.log('✅ 新token访问成功');
    console.log('新会话信息:', JSON.stringify(sessionResponse2.data.data.session, null, 2), '\n');

    // 6. 登出测试
    console.log('6️⃣ 测试登出功能...');
    await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    console.log('✅ 登出成功\n');

    // 7. 尝试使用已登出的token访问接口
    console.log('7️⃣ 尝试使用已登出的token访问接口...');
    try {
      await axios.get(`${BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      console.log('❌ 已登出的token仍然有效，测试失败');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 已登出的token已失效，符合预期');
        console.log('错误信息:', error.response.data.message, '\n');
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }

    console.log('🎉 单设备登录功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testSingleDeviceLogin(); 