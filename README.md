## Polling App

![Home](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Home.png)

A real-time polling application built with a modern tech stack, allowing users to create, vote on, and manage polls with live updates across multiple clients. This project leverages Next.js for the frontend, Axum for the backend, MongoDB for data persistence, and WebSocket for real-time communication.

## Table of Contents
- [Polling App](#polling-app)
- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
- [Usage](#usage)
- [Screenshots](#screenshots)
  - [Register Page](#register-page)
  - [Login Page](#login-page)
  - [Create Poll](#create-poll)
  - [All Polls Page](#all-polls-page)
  - [Poll Management](#poll-management)
  - [Specific Poll](#specific-poll)
  - [Results](#results)
  - [Profile](#profile)
- [API Endpoints](#api-endpoints)
- [Real-Time Updates](#real-time-updates)
- [Contributing](#contributing)
- [License](#license)

## Features
- **User Authentication**: Secure login/register using WebAuthn.
- **Poll Creation**: Users can create polls with multiple options.
- **Real-Time Voting**: Votes update instantly across all connected clients via WebSocket.
- **Poll Management**: Edit, close, reset, or delete polls from a management dashboard.
- **Responsive Design**: Sleek, modern UI with Tailwind CSS, optimized for all devices.
- **Persistent Storage**: Polls and user data stored in MongoDB.

## Tech Stack
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS, Zustand (state management)
- **Backend**: Axum (Rust), MongoDB (database), WebSocket (real-time)
- **Authentication**: WebAuthn for secure passkey-based login
- **Tools**: Axios (API calls), Heroicons (icons)

## Project Structure
```
polling_app/
├── frontend/                  # Next.js Frontend (App Router)
│   ├── app/                   # App Router directory
│   │   ├── layout.tsx         # Root layout (includes global styles, navigation, etc.)
│   │   ├── page.tsx           # Homepage (list of live and closed polls)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page (Passkey authentication)
│   │   ├── register/
│   │   │   └── page.tsx       # Registration page (Passkey registration)
│   │   ├── profile/
│   │   │   └── page.tsx       # User profile page
│   │   ├── polls/
│   │   │   ├── new/
│   │   │   │   └── page.tsx   # Create a new poll (protected)
│   │   │   ├── manage/
│   │   │   │   └── page.tsx   # Manage created polls (protected)
│   │   │   ├── all/
│   │   │   │   └── page.tsx   # All polls page
│   │   │   └── [pollId]/
│   │   │       ├── page.tsx   # View and vote on a specific poll
│   │   │       └── results/
│   │   │           └── page.tsx # Poll stats/results (SSR + real-time)
│   ├── components/            # Reusable React components
│   │   ├── Navbar.tsx         # Navigation bar component
│   │   └── polls/
│   │       ├── PollCard.tsx   # Display a poll with voting options
│   │       └── PollForm.tsx   # Form for creating polls
│   ├── lib/                   # Utility functions and state management
│   │   ├── auth.ts            # Passkey authentication logic (WebAuthn)
│   │   ├── api.ts             # API fetch wrappers for backend calls
│   │   └── store.ts           # Zustand/Context for global state
│   ├── public/                # Static assets (images, etc.)
│   ├── .env.local
│   └── package.json           # Frontend dependencies (Next.js, React, etc.)
├── backend/                   # Rust Backend
│   ├── src/
│   │   ├── main.rs            # Entry point for the Rust server
│   │   ├── error.rs           # Error handling
│   │   ├── startup.rs         # Server startup configuration
│   │   ├── auth/
│   │   │   └── mod.rs         # Passkey auth logic (WebAuthn/FIDO2)
│   │   ├── models/
│   │   │   └── mod.rs         # Data models (User, Poll, Vote, etc.)
│   │   ├── routes/
│   │   │   ├── polls.rs       # Poll-related endpoints
│   │   │   └── mod.rs         # Route module aggregator
│   │   └── websocket/
│   │       └── mod.rs         # WebSocket logic for real-time updates
│   ├── Cargo.toml             # Rust dependencies (actix-web, serde, etc.)
│   └── .env                   # Environment variables (DB URL, port, etc.)
└── README.md                  # Project overview and setup instructions

```

## Installation
### Prerequisites
- Node.js (v18+)
- Rust (latest stable)
- MongoDB (running locally or via a service like MongoDB Atlas)
- Git

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Yaswanth-Vempuluru-7916/polling_app.git
   cd polling_app
   ```

2. **Backend Setup**:
   - Navigate to the backend directory:
     ```bash
     cd backend
     ```
   - Create a `.env` file:
     ```plaintext
     MONGODB_URI=mongodb://localhost:27017/polling-app
     PORT=8080
     RP_ID=localhost
     RP_ORIGIN=http://localhost:3000
     RP_NAME=Polling App
     ```
   - Install dependencies and run:
     ```bash
     cargo build
     cargo run
     ```

3. **Frontend Setup**:
   - Navigate to the frontend directory:
     ```bash
     cd ../frontend
     ```
   - Create a `.env.local` file:
     ```plaintext
     NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
     NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
     ```
   - Install dependencies and run:
     ```bash
     npm install
     npm run dev
     ```
   - Open `http://localhost:3000` in your browser.

## Usage
1. **Register/Login**: Navigate to `/login` to authenticate using WebAuthn.
2. **Create a Poll**: Go to `/polls/new`, enter a title and options, and submit.
3. **Vote on Polls**: Visit `/polls/all` or `/polls/<pollId>` to vote—updates reflect live across tabs.
4. **Manage Polls**: Access `/polls/manage` to edit, close, reset, or delete your polls.

## Screenshots
### Register Page
![Register Page](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Register.png)


### Login Page
![Login Page](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Login.png)


### Create Poll
![Create Poll](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/create%20poll.png)


### All Polls Page
![All Polls](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/all%20Polls.png)


### Poll Management
![Poll Management](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/manage.png)

### Specific Poll
![Specific Poll](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Specific%20Poll.png)


### Results
![Results](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Results.png)


### Profile
![Profile](https://raw.githubusercontent.com/Yaswanth-Vempuluru-7916/polling_app/main/frontend/public/assets/images/Profile%20Page.png)


## API Endpoints
- **POST /api/polls**: Create a new poll.
- **GET /api/polls/:poll_id**: Fetch a specific poll.
- **POST /api/polls/:poll_id/vote**: Vote on a poll option.
- **GET /api/polls/manage**: Get user’s polls.
- **POST /api/polls/:poll_id/close**: Close a poll.
- **POST /api/polls/:poll_id/reset**: Reset poll votes.
- **POST /api/polls/:poll_id/delete**: Delete a poll.
- **POST /api/polls/:poll_id/edit**: Edit a poll.
- **GET /api/polls/all**: Fetch all polls.

## Real-Time Updates
- **WebSocket**: Connects to `/ws` for live poll updates.
- **Mechanism**: Backend broadcasts poll changes via `broadcast_tx`, and clients update via WebSocket messages.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License
This project is licensed under the 

---
```
