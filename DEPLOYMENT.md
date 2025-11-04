# Deployment Guide for Careers Admin Frontend

## Overview
This guide explains how to deploy the Careers Admin Frontend using Docker and CapRover.

## Prerequisites
- Docker installed on the build machine
- CapRover instance configured
- Access to the CapRover dashboard

## Environment Variables

### Required Build-Time Variables
- `VITE_API_BASE_URL`: The base URL of the backend API (e.g., `https://trizencareersbackend.llp.trizenventures.com`)

### Example
```
VITE_API_BASE_URL=https://trizencareersbackend.llp.trizenventures.com
```

## Deployment Steps

### 1. Using CapRover (Recommended)

1. **Connect your repository** to CapRover
2. **Configure the app** in CapRover dashboard:
   - App Name: `careers-admin-frontend` (or your preferred name)
   - Has Dockerfile: Yes
   - Dockerfile Location: `careers-admin-frontend/Dockerfile`
3. **Set build arguments** in CapRover:
   - `VITE_API_BASE_URL`: Your backend API URL
4. **Deploy** by pushing to your connected branch

### 2. Manual Docker Build

```bash
# Navigate to the admin frontend directory
cd careers-admin-frontend

# Build the Docker image
docker build \
  --build-arg VITE_API_BASE_URL=https://trizencareersbackend.llp.trizenventures.com \
  -t careers-admin-frontend:latest .

# Run the container
docker run -d \
  -p 80:80 \
  --name careers-admin-frontend \
  careers-admin-frontend:latest
```

### 3. Using Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  admin-frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: https://trizencareersbackend.llp.trizenventures.com
    ports:
      - "80:80"
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## CapRover Configuration

### captain-definition.json
The `captain-definition` file is already configured with:
- Port: 80 (HTTP)
- Health check: `/health`
- Build arguments for environment variables

### Environment Variables in CapRover
Set the following in CapRover dashboard:
- `VITE_API_BASE_URL`: Backend API URL

## Build Process

1. **Build Stage**: Uses Node.js 18 Alpine to build the React application
   - Installs dependencies
   - Builds the production bundle using Vite
   - Environment variables are injected at build time

2. **Production Stage**: Uses Nginx Alpine to serve static files
   - Copies built files from builder stage
   - Configures Nginx with proper routing for SPA
   - Sets up security headers and caching

## Nginx Configuration

The `nginx.conf` includes:
- Client-side routing support (SPA routing)
- Gzip compression
- Security headers
- Static asset caching
- Health check endpoint

## Health Check

The application exposes a health check endpoint at `/health` that returns `200 OK`.

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Verify Node.js version (18+) is compatible
- Check Docker build logs for specific errors

### Application Not Loading
- Verify Nginx is running: `docker exec <container> nginx -t`
- Check Nginx logs: `docker logs <container>`
- Verify the build output is in `/usr/share/nginx/html`

### API Connection Issues
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration on backend
- Verify backend is accessible from the frontend domain

### Client-Side Routing Not Working
- Ensure Nginx configuration has `try_files $uri $uri/ /index.html;`
- Check that `error_page 404 /index.html;` is configured

## Production Checklist

- [ ] Set `VITE_API_BASE_URL` to production backend URL
- [ ] Verify CORS is configured on backend for admin frontend domain
- [ ] Test all admin panel features
- [ ] Verify health check endpoint is working
- [ ] Set up SSL/TLS certificate (handled by CapRover)
- [ ] Configure domain in CapRover
- [ ] Test authentication flow
- [ ] Verify application viewing and status updates work

## Security Notes

- The application uses non-root user (nginx) in the container
- Security headers are configured in Nginx
- Environment variables are injected at build time (not runtime)
- Static assets are served with proper caching headers

## Support

For issues or questions, refer to:
- Backend deployment: `careersbackend/DEPLOYMENT.md`
- Main frontend deployment: `TrizenCareersFrontend/DEPLOYMENT.md`

