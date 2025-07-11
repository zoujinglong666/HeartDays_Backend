# Token过期测试指南

## 当前配置

为了便于测试，我们已经将Access Token的有效期设置为**5分钟**：

- **Access Token**: 5分钟过期
- **Refresh Token**: 7天过期
- **Session Token**: 7天过期

## 测试方法

### 1. 快速测试（推荐）

运行可配置的测试脚本：

```bash
node test-token-expiry.js
```

这个脚本默认等待10秒，你可以修改脚本中的`CONFIG.waitTime`值：

```javascript
const CONFIG = {
  waitTime: 10 * 1000, // 修改这个值
  // 10 * 1000 = 10秒（快速测试）
  // 60 * 1000 = 1分钟
  // 300 * 1000 = 5分钟
  // 360 * 1000 = 6分钟（确保过期）
};
```

### 2. 手动测试

#### 步骤1: 登录获取token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userAccount": "zou123", "password": "123456zjl"}'
```

#### 步骤2: 立即测试token
```bash
curl -X GET http://localhost:3000/auth/session \
  -H "Authorization: Bearer <access_token>"
```

#### 步骤3: 等待5分钟后再次测试
```bash
# 等待5分钟后，再次使用相同的token
curl -X GET http://localhost:3000/auth/session \
  -H "Authorization: Bearer <access_token>"
```

应该收到401错误，表示token已过期。

#### 步骤4: 使用refresh_token刷新
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

### 3. 完整测试脚本

运行完整的双token测试：

```bash
node test-refresh-token.js
```

## 测试场景

### 场景1: Token正常使用
1. 登录获取token
2. 立即使用token访问接口
3. 应该成功访问

### 场景2: Token过期
1. 登录获取token
2. 等待5分钟
3. 使用token访问接口
4. 应该收到401错误

### 场景3: Token刷新
1. 登录获取token
2. 等待5分钟让token过期
3. 使用refresh_token获取新token
4. 使用新token访问接口
5. 应该成功访问

### 场景4: 单设备登录
1. 在设备A登录
2. 在设备B登录相同账号
3. 设备A的token应该立即失效

## 验证方法

### 1. 检查Redis数据
```bash
# 查看所有token
redis-cli keys "token:*"
redis-cli keys "refresh_token:*"
redis-cli keys "session:*"

# 查看具体内容
redis-cli get "session:userId"
```

### 2. 检查JWT过期时间
```javascript
// 在浏览器控制台中解码JWT
const token = "your-access-token";
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('过期时间:', new Date(payload.exp * 1000));
```

## 恢复生产配置

测试完成后，如果需要恢复生产配置，请修改以下文件：

### 1. 修改JWT过期时间
```typescript
// src/config/configuration.ts
jwt: {
  secret: process.env.JWT_SECRET || 'jwt-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '2h', // 恢复为2小时
},
```

### 2. 修改Access Token过期时间
```typescript
// src/auth/auth.service.ts
expires_in: 2 * 60 * 60, // 恢复为2小时
```

### 3. 修改Redis存储时间
```typescript
// src/auth/session.service.ts
}, 2 * 60 * 60); // 恢复为2小时
```

## 常见问题

### Q: Token没有过期怎么办？
A: 检查以下几点：
1. 确认JWT配置中的`expiresIn`设置为`5m`
2. 确认AuthService中的`expires_in`设置为`5 * 60`
3. 确认Redis存储时间设置为`5 * 60`
4. 重启应用服务器

### Q: 如何快速测试？
A: 可以临时将过期时间设置得更短：
- JWT: `1m` (1分钟)
- Redis: `60` (60秒)
- 测试脚本等待时间: `70 * 1000` (70秒)

### Q: 测试完成后如何恢复？
A: 按照"恢复生产配置"部分的说明修改相关文件，然后重启应用。

## 测试建议

1. **开发阶段**: 使用5分钟过期时间，便于快速测试
2. **测试阶段**: 使用1分钟过期时间，快速验证功能
3. **生产环境**: 使用2小时过期时间，平衡安全性和用户体验

## 监控和日志

### 1. 查看应用日志
```bash
# 查看NestJS应用日志
npm run start:dev
```

### 2. 查看Redis日志
```bash
# 查看Redis连接和操作
redis-cli monitor
```

### 3. 检查错误响应
```json
{
  "code": 401,
  "message": "认证令牌无效或已过期，请重新登录",
  "data": null
}
```

这样你就可以方便地测试token过期和刷新功能了！ 