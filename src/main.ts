import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  // Validate environment variables before starting the application
  validateEnv();
  
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Get port from configuration with fallback to 3000
  const port = configService.get<number>('port') || 3000;
  
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  }));
  
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Application is not running in production mode');
  }
}
bootstrap();
