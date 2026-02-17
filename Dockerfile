# Stage 1: Build stage
FROM oven/bun:latest AS build

WORKDIR /app

# Copy package files and lockfile
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build arguments for environment variables
ARG VITE_DISABLE_PIN=false
ARG VITE_LOGIN_MESSAGE=""
ARG VITE_BASE_PATH=""

# Set environment variables for build
ENV VITE_DISABLE_PIN=${VITE_DISABLE_PIN}
ENV VITE_LOGIN_MESSAGE=${VITE_LOGIN_MESSAGE}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

# Build the application
RUN bun run build

# Stage 2: Production stage
FROM nginx:stable-alpine

# Copy the build output from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
