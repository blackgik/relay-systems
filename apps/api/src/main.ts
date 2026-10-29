import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // KYC uploads (ID photo + selfie) arrive as data URLs; the 100kb default is too small.
  app.useBodyParser('json', { limit: '12mb' });
  // The web app runs on a different origin; auth is bearer tokens, not cookies.
  // Matches the socket gateways' CORS policy.
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`relay api listening on ${port}`);
}

void bootstrap();
