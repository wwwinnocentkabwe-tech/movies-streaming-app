# Movies App API

A REST API for a movies streaming application with user authentication, role-based access, and file uploads.

## Features
- User registration and login
- JWT authentication
- Role-based access (user/admin)
- Movie CRUD operations
- File upload for movies
- Movie streaming and download
- User favorites

## Setup
1. Install dependencies: `npm install`
2. Set up MongoDB and update .env
3. Run: `npm start`

## API Endpoints
- POST /api/users/register
- POST /api/users/login
- GET /api/movies
- POST /api/movies (admin)
- GET /api/movies/:id/stream
- etc.