import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局响应转换拦截器 - 确保所有响应都经过这个拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS 配置
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // Swagger 文档配置
  const config = new DocumentBuilder()
    .setTitle('Heart Days API')
    .setDescription('Heart Days 后端 API 文档')
    .setVersion('1.0')
    .addTag('auth', '认证相关')
    .addTag('users', '用户管理')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入 JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for references
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Heart Days API 文档',
  });

  const port = configService.get<number>('port') || 3000;
  // 👇 绑定所有 IP 地址，便于局域网设备访问
  await app.listen(port, '0.0.0.0');

  const localIP = getLocalIP();
  console.log(`🚀 Server running on:`);
  console.log(`- Local:   http://localhost:${port}/api/v1`);
  console.log(`- Network: http://${localIP}:${port}/api/v1`);
  console.log(`- Docs:    http://localhost:${port}/api/docs`);
  console.log(`- Docs:    http://${localIP}:${port}/api/docs`);
}
bootstrap();
