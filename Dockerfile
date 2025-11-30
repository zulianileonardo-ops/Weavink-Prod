FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set dummy QDRANT_URL to bypass build-time validation
# The real value will be provided at runtime by Coolify
ENV QDRANT_URL="http://placeholder:6333"

RUN npm run build

# Clear the placeholder (runtime value will come from Coolify)
ENV QDRANT_URL=""

EXPOSE 3000
CMD ["npm", "start"]
