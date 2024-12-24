# Use the official Node.js 18 image as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on (e.g., 3000)
EXPOSE 3001

# Define the command to run your application
CMD ["npm", "start"]