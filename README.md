# Link Shortener

A custom link shortener built with Next.js, Node.js, Express, and Appwrite.

## Project Structure

* /appwritesites: The Next.js frontend application.
* /server: The Node.js Express backend API that handles link shortening and redirection.

## Setup Instructions

### Backend (Server)

1. Navigate to the server directory.
2. Run npm install to install dependencies.
3. Copy .env.example to .env and fill in your credentials.
4. Start the server using npm start.

### Frontend (Appwrite sites)

1. Navigate to the appwritesites directory.
2. Run npm install to install dependencies.
3. Set the NEXT_PUBLIC_API_URL environment variable to your backend API URL.
4. Run the development server with npm run dev or build for production with npm run build.

## Security and Privacy

Anti-bot measures such as requiring anonymous JWT Token and mimimum page time built in.

## Deployment

Ensure that all required environment variables are set in your production environment before deploying the backend and frontend services.
Disclaimer: Built in part using AI.
