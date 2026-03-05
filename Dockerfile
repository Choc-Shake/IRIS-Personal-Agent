FROM node:20-slim

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose the dashboard/health check port
EXPOSE 3000

# Start IRIS
CMD ["npm", "start"]
