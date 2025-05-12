# Formify Backend Deployment Guide

This guide explains how to deploy the Formify backend to production environments while properly handling environment variables.

## Environment Variables

The Formify backend requires the following environment variables to function properly:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | URL of your Supabase project | Yes |
| `SUPABASE_KEY` | Anon key for your Supabase project | Yes |
| `JWT_SECRET` | Secret key for JWT token signing/verification | Yes |
| `PORT` | Port on which the server will run (defaults to 3000) | No |
| `JWT_EXPIRES_IN` | JWT token expiration time (defaults to 7d) | No |

## Deployment Options

### Option 1: Using Environment Variables Directly

Most hosting platforms (Heroku, Vercel, Netlify, etc.) allow you to set environment variables through their dashboard or CLI.

1. Copy the variables from your local `.env` file
2. Set them in your hosting platform's environment variables section
3. Deploy your application

### Option 2: Using a .env File in Production

If your hosting solution supports reading from `.env` files:

1. Create a `.env` file in the production environment
2. Add all required environment variables to this file
3. Make sure the file is not publicly accessible

Example `.env` file content:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
JWT_SECRET=your-secure-jwt-secret
PORT=3000
```

### Option 3: Using Docker

If deploying with Docker:

1. Build your Docker image
2. Pass environment variables when running the container:

```bash
docker run -p 3000:3000 \\
  -e SUPABASE_URL=https://your-project.supabase.co \\
  -e SUPABASE_KEY=your-supabase-anon-key \\
  -e JWT_SECRET=your-secure-jwt-secret \\
  formify-backend
```

## Verifying Deployment

After deployment, you can verify that your environment variables are correctly set by:

1. Checking the application logs for any environment validation warnings
2. Testing the API endpoints to ensure they can connect to Supabase
3. Verifying JWT authentication is working properly

## Security Considerations

- Never commit `.env` files to your repository
- Use strong, unique values for `JWT_SECRET`
- Consider rotating your Supabase keys periodically
- In production, set `NODE_ENV=production` to enable stricter validation
