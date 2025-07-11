# 单设备登录功能实现

## 功能概述

本项目已实现完整的单设备登录功能，确保用户只能在一个设备上保持登录状态。当用户在新设备登录时，旧设备的会话将自动失效，强制用户重新登录。

## 核心特性

### 🔐 会话管理
- **唯一会话**: 每个用户只能有一个有效会话
- **自动过期**: 会话24小时后自动过期
- **即时失效**: 新设备登录时旧会话立即失效
- **Redis存储**: 使用Redis存储会话信息，高性能且可靠

### 📱 设备信息记录
- **设备识别**: 自动识别设备类型（桌面、移动、平板）
- **操作系统**: 记录操作系统信息
- **浏览器**: 记录浏览器类型
- **IP地址**: 记录登录IP地址
- **时间戳**: 记录登录时间

### 🛡️ 安全机制
- **JWT + 会话令牌**: 双重验证机制
- **设备指纹**: 记录设备特征信息
- **强制登出**: 新设备登录时强制旧设备登出
- **错误处理**: 完善的错误提示和处理

## 技术实现

### 1. 会话服务 (SessionService)
```typescript
// 核心方法
- generateSessionToken(): 生成唯一会话令牌
- storeUserSession(): 存储用户会话信息
- validateSessionToken(): 验证会话令牌
- invalidateSession(): 使会话失效
- forceLogoutOtherDevices(): 强制其他设备登出
```

### 2. 认证服务 (AuthService)
```typescript
// 增强的登录方法
- login(): 支持设备信息记录和单设备登录
- logout(): 用户登出功能
- validateSession(): 验证会话有效性
```

### 3. JWT策略 (JwtStrategy)
```typescript
// 会话验证
- validate(): 验证JWT时同时验证会话有效性
- 自动检查会话是否在Redis中存在
```

### 4. 认证守卫 (AuthGuard)
```typescript
// 请求拦截
- canActivate(): 拦截所有请求，验证会话
- 自动检查会话令牌有效性
```

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
    "session_token": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": 1,
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

### 登出接口
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 获取会话信息
```http
GET /auth/session
Authorization: Bearer <access_token>
```

**响应示例:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "session": {
      "sessionToken": "550e8400-e29b-41d4-a716-446655440000",
      "deviceInfo": {
        "userAgent": "Mozilla/5.0...",
        "ip": "127.0.0.1",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "deviceType": "desktop",
        "os": "Windows",
        "browser": "Chrome"
      },
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

## Redis数据结构

### 会话存储
```
session:{userId} -> {
  sessionToken: "uuid",
  deviceInfo: {...},
  createdAt: "2024-01-01T12:00:00.000Z"
}
```

### 令牌映射
```
token:{sessionToken} -> {
  userId: 1,
  sessionToken: "uuid"
}
```

### 在线状态
```
online:user:{userId} -> "1" (10分钟过期)
```

## 使用流程

### 1. 用户登录
1. 用户提供账号密码
2. 系统验证用户身份
3. 生成唯一会话令牌
4. 强制其他设备登出
5. 存储新会话信息
6. 返回JWT令牌和会话令牌

### 2. 请求验证
1. 客户端发送请求时携带JWT令牌
2. 服务器验证JWT有效性
3. 检查会话令牌是否在Redis中存在
4. 验证会话是否属于当前用户
5. 更新用户在线状态

### 3. 新设备登录
1. 用户在新设备登录
2. 系统生成新的会话令牌
3. 删除旧会话信息
4. 旧设备下次请求时收到"会话已失效"错误

## 错误处理

### 常见错误码
- `401 Unauthorized`: 会话已失效，需要重新登录
- `401 Unauthorized`: 无效的会话令牌
- `401 Unauthorized`: 认证令牌无效或已过期

### 错误响应示例
```json
{
  "code": 401,
  "message": "会话已失效，请重新登录",
  "data": null
}
```

## 前端集成

### 1. 登录处理
```javascript
// 登录成功后保存令牌
const response = await login(credentials);
localStorage.setItem('access_token', response.data.access_token);
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

### 3. 响应拦截器
```javascript
// 处理会话失效
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('session_token');
      // 跳转到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 测试方法

### 1. 手动测试
1. 使用Postman或浏览器登录
2. 复制access_token
3. 在新标签页或设备中再次登录
4. 使用旧token访问接口，应该收到401错误

### 2. 自动化测试
运行提供的测试脚本：
```bash
node test-single-device.js
```

### 3. Redis检查
```bash
# 查看会话信息
redis-cli keys "session:*"
redis-cli keys "token:*"

# 查看具体会话内容
redis-cli get "session:1"
```

## 配置说明

### 环境变量
```env
# JWT配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 会话配置
- **过期时间**: 24小时
- **在线状态**: 10分钟
- **设备信息**: 自动解析

## 安全建议

1. **定期清理**: 定期清理过期的会话数据
2. **监控异常**: 监控异常的登录行为
3. **日志记录**: 记录所有登录和登出事件
4. **IP限制**: 可考虑添加IP白名单功能
5. **设备验证**: 可考虑添加设备指纹验证

## 扩展功能

### 1. 多设备管理
- 显示用户所有登录设备
- 允许用户手动登出特定设备
- 设备信任机制

### 2. 安全增强
- 登录地理位置记录
- 异常登录检测
- 二次验证支持

### 3. 用户体验
- 登录设备列表
- 设备信息展示
- 登录历史记录

## 总结

单设备登录功能已完整实现，提供了：

✅ **安全性**: 确保用户只能在一个设备登录  
✅ **可靠性**: 使用Redis存储，高性能且可靠  
✅ **用户体验**: 清晰的错误提示和处理  
✅ **可扩展性**: 模块化设计，易于扩展  
✅ **监控性**: 完整的设备信息记录  

该功能可以有效防止账号被盗用，提升系统安全性。 