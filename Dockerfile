# Build stage
FROM node:22 AS builder
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps && npm run build

# Serve stage
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]