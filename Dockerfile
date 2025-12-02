FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set dummy values to bypass build-time validation
# The real values will be provided at runtime by Coolify
ENV QDRANT_URL="http://placeholder:6333"
ENV REDIS_HOST="placeholder-redis"
ENV REDIS_PORT="6379"

RUN npm run build

# Clear the placeholders (runtime values will come from Coolify)
ENV QDRANT_URL=""
ENV REDIS_HOST=""
ENV REDIS_PORT=""

EXPOSE 3000
CMD ["npm", "start"]
