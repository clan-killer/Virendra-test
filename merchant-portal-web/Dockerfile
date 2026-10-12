# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies using 'npm ci' for reliable builds
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve using 'serve' (HTTP Server)
FROM node:18-alpine
WORKDIR /app

# Install 'serve' globally to act as our web server
RUN npm install -g serve

# Copy only the 'dist' folder from the builder stage
# Vite outputs to 'dist' by default
COPY --from=builder /app/dist ./dist

# Expose port 80 (to match your previous config)
EXPOSE 80

# Start 'serve' 
# -s flag: Single Page Application mode (redirects all routes to index.html)
# -l 80: Listens on port 80
CMD ["serve", "-s", "dist", "-l", "80"]