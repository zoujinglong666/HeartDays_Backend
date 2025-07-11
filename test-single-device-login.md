# 单设备登录功能测试指南

## 功能概述

本项目已实现单设备登录功能，确保用户只能在一个设备上保持登录状态。当用户在新设备登录时，旧设备的会话将自动失效。

## 核心功能

### 1. 会话管理
- 使用Redis存储会话信息
- 每个用户只能有一个有效会话
- 会话令牌24小时自动过期

### 2. 设备信息记录
- 记录登录设备的详细信息
- 包括IP地址、用户代理、设备类型等
- 支持移动设备、桌面设备识别

### 3. 自动会话失效
- 新设备登录时自动使旧会话失效
- 旧设备访问API时返回"会话已失效"错误

## API接口

### 登录接口
```http
POST /auth/login
Content-Type: application/json

{
  "userAccount": "testuser",
  "password": "password123"
}
```

响应示例：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": 1,
    "name": "测试用户",
    "userAccount": "testuser",
    "email": "test@example.com",
    "roles": ["user"],
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "gender": 1
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

## 测试步骤

### 1. 首次登录
1. 使用用户账号登录
2. 获取access_token和session_token
3. 使用token访问需要认证的接口

### 2. 新设备登录测试
1. 在另一个设备或浏览器中使用相同账号登录
2. 获取新的access_token
3. 尝试使用旧的access_token访问接口
4. 应该收到"会话已失效"错误

### 3. 会话验证测试
1. 使用有效的access_token访问`/auth/session`
2. 查看当前会话的设备信息
3. 验证设备信息是否正确记录

### 4. 登出测试
1. 调用`/auth/logout`接口
2. 尝试使用已登出的token访问接口
3. 应该收到"会话已失效"错误

## Redis键结构

- `session:{userId}` - 存储用户会话信息
- `token:{sessionToken}` - 存储令牌到用户ID的映射
- `online:user:{userId}` - 记录用户在线状态

## 安全特性

1. **会话唯一性**: 每个用户只能有一个有效会话
2. **自动过期**: 会话24小时后自动过期
3. **设备信息记录**: 记录登录设备的详细信息
4. **即时失效**: 新设备登录时旧会话立即失效

## 错误处理

- `401 Unauthorized`: 会话已失效，需要重新登录
- `401 Unauthorized`: 无效的会话令牌
- `401 Unauthorized`: 认证令牌无效或已过期

## 前端集成建议

1. 在登录成功后保存access_token和session_token
2. 在请求拦截器中添加Authorization头
3. 在收到"会话已失效"错误时跳转到登录页面
4. 定期检查会话状态，必要时刷新token 