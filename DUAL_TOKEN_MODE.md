# 双Token模式实现

## 功能概述

本项目已实现完整的双Token模式（Access Token + Refresh Token），类似微信的登录机制。用户无需频繁登录，通过刷新令牌可以自动获取新的访问令牌。

## 核心特性

### 🔐 双Token机制
- **Access Token**: 短期访问令牌（2小时有效期）
- **Refresh Token**: 长期刷新令牌（7天有效期）
- **Session Token**: 会话令牌（用于单设备登录）

### 🚀 自动刷新
- **无感刷新**: 前端可自动使用refresh_token获取新的access_token
- **安全机制**: 每次刷新都会生成新的refresh_token，旧token立即失效
- **单设备登录**: 新设备登录时，旧设备的所有token立即失效

### 📱 用户体验
- **长期登录**: 用户7天内无需重新输入密码
- **自动续期**: 前端可自动处理token刷新
- **安全退出**: 支持手动登出，清除所有token

## Token生命周期

### Access Token
- **有效期**: 2小时
- **用途**: 访问受保护的API接口
- **存储**: 前端内存或安全存储
- **刷新**: 过期后使用refresh_token获取新的access_token

### Refresh Token
- **有效期**: 7天
- **用途**: 获取新的access_token
- **存储**: 前端安全存储（localStorage/sessionStorage）
- **安全**: 每次使用后立即失效，生成新的refresh_token

### Session Token
- **有效期**: 7天（与refresh_token同步）
- **用途**: 单设备登录控制
- **存储**: Redis服务器
- **验证**: 每次API请求时验证

## API接口

### 登录接口
```http
POST /auth/login
Content-Type: application/json

{
  "userAccount": "用户名",
  "password": "密码"
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
    "session_token": "660e8400-e29b-41d4-a716-446655440001",
    "expires_in": 7200,
    "refresh_expires_in": 604800,
    "user": {
      "id": "uuid",
      "name": "用户名",
      "userAccount": "账号",
      "email": "邮箱",
      "roles": ["user"],
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "gender": 1
    }
  }
}
```

### 刷新Token接口
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "770e8400-e29b-41d4-a716-446655440002",
    "session_token": "880e8400-e29b-41d4-a716-446655440003",
    "expires_in": 7200,
    "refresh_expires_in": 604800
  }
}
```

### 登出接口
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

## Redis数据结构

### 会话存储
```
session:{userId} -> {
  sessionToken: "uuid",
  refreshToken: "uuid",
  deviceInfo: {...},
  createdAt: "2024-01-01T12:00:00.000Z"
}
```

### 访问令牌映射
```
token:{sessionToken} -> {
  userId: "uuid",
  sessionToken: "uuid",
  refreshToken: "uuid"
}
```

### 刷新令牌映射
```
refresh_token:{refreshToken} -> {
  userId: "uuid",
  sessionToken: "uuid",
  refreshToken: "uuid"
}
```

## 前端集成

### 1. Token存储
```javascript
// 登录成功后保存token
const response = await login(credentials);
localStorage.setItem('access_token', response.data.access_token);
localStorage.setItem('refresh_token', response.data.refresh_token);
localStorage.setItem('session_token', response.data.session_token);
```

### 2. 请求拦截器
```javascript
// 添加认证头
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. 响应拦截器（自动刷新）
```javascript
// 处理token过期和自动刷新
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 尝试刷新token
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/auth/refresh', {
          refresh_token: refreshToken
        });
        
        // 更新本地存储的token
        localStorage.setItem('access_token', response.data.data.access_token);
        localStorage.setItem('refresh_token', response.data.data.refresh_token);
        localStorage.setItem('session_token', response.data.data.session_token);
        
        // 重试原始请求
        originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除本地存储并跳转到登录页
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('session_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### 4. 定期检查Token
```javascript
// 定期检查token是否即将过期
setInterval(async () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      
      // 如果token在5分钟内过期，主动刷新
      if (expiresAt - now < 5 * 60 * 1000) {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/auth/refresh', {
          refresh_token: refreshToken
        });
        
        localStorage.setItem('access_token', response.data.data.access_token);
        localStorage.setItem('refresh_token', response.data.data.refresh_token);
        localStorage.setItem('session_token', response.data.data.session_token);
      }
    } catch (error) {
      console.error('Token检查失败:', error);
    }
  }
}, 60000); // 每分钟检查一次
```

## 安全机制

### 1. Token轮换
- 每次刷新都会生成新的refresh_token
- 旧的refresh_token立即失效
- 防止refresh_token被盗用

### 2. 单设备登录
- 新设备登录时，旧设备的所有token立即失效
- 确保账号安全

### 3. 会话验证
- 每次API请求都验证session_token
- 确保token与设备会话一致

### 4. 自动过期
- Access Token: 2小时自动过期
- Refresh Token: 7天自动过期
- 减少长期安全风险

## 错误处理

### 常见错误码
- `401 Unauthorized`: Access Token过期或无效
- `401 Unauthorized`: Refresh Token过期或无效
- `401 Unauthorized`: 会话已失效，需要重新登录

### 错误响应示例
```json
{
  "code": 401,
  "message": "刷新令牌无效或已过期",
  "data": null
}
```

## 测试方法

### 1. 手动测试
```bash
# 1. 登录获取token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userAccount": "zou123", "password": "123456zjl"}'

# 2. 使用access_token访问接口
curl -X GET http://localhost:3000/auth/session \
  -H "Authorization: Bearer <access_token>"

# 3. 刷新token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

### 2. 自动化测试
```bash
node test-refresh-token.js
```

### 3. Redis检查
```bash
# 查看所有token
redis-cli keys "token:*"
redis-cli keys "refresh_token:*"
redis-cli keys "session:*"

# 查看具体内容
redis-cli get "session:userId"
```

## 配置说明

### 环境变量
```env
# JWT配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=2h  # Access Token过期时间

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Token配置
- **Access Token**: 2小时过期
- **Refresh Token**: 7天过期
- **Session Token**: 7天过期（与refresh_token同步）

## 最佳实践

### 1. 前端实现
- 使用HTTPS传输token
- 安全存储refresh_token
- 实现自动刷新机制
- 处理网络错误和重试

### 2. 安全建议
- 定期清理过期的token
- 监控异常的token使用
- 记录token刷新日志
- 考虑添加设备指纹验证

### 3. 性能优化
- 使用Redis缓存token
- 实现token预刷新
- 优化token验证性能

## 总结

双Token模式提供了：

✅ **用户体验**: 7天内无需重新登录  
✅ **安全性**: Token轮换和单设备登录  
✅ **可靠性**: 自动刷新和错误处理  
✅ **可扩展性**: 支持多设备管理  
✅ **监控性**: 完整的token生命周期管理  

该功能大大提升了用户体验，同时保证了系统安全性。 