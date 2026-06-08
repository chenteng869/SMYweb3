import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('WOPC 创业家 管理后台 API')
    .setDescription('WOPC 创业家 - 全球创业家服务平台 后台管理 API\n\n包含 17 大模块:Dashboard / 用户 / 公司 / 银行 / 支付 / 税务 / 法务 / AI / 视频 / 媒体 / 文档 / DLC / DVSF / 订单 / 通知 / DID / 系统')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addTag('🔐 认证管理')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 WOPC API 运行在 http://localhost:${port}`);
  console.log(`📚 Swagger 文档: http://localhost:${port}/api-docs`);
}
bootstrap();
