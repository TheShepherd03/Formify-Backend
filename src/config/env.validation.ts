import { Logger } from '@nestjs/common';

export function validateEnv(): void {
  const logger = new Logger('EnvironmentValidator');
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    logger.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.warn('Application may not function correctly without these variables.');
    
    // For production, you might want to throw an error instead
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables for production: ${missingEnvVars.join(', ')}`
      );
    }
  } else {
    logger.log('All required environment variables are set');
  }
}
