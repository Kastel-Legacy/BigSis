FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Ensure node_modules/.bin is in PATH (for volume mounts)
ENV PATH=/app/node_modules/.bin:$PATH

COPY . .

CMD ["npm", "run", "dev"]
