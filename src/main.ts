import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Inline environment validation function
function validateEnvironment(): void {
  const logger = new Logger('EnvironmentValidator');
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    logger.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.warn('Application may not function correctly without these variables.');
    
    // For production, throw an error instead
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables for production: ${missingEnvVars.join(', ')}`
      );
    }
  } else {
    logger.log('All required environment variables are set');
  }
}

async function bootstrap() {
  // Validate environment variables before starting the application
  validateEnvironment();
  
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
