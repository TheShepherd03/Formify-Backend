const configuration = () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  database: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-jwt-secret-do-not-use-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

});

export default configuration;
