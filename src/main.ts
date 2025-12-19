import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ ||= 'America/Lima';
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin:
      corsOrigins.length === 0 || corsOrigins.includes('*') ? true : corsOrigins,
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
