import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import GameScreen from "./screens/GameScreen";
import LoginScreen from "./screens/LoginScreen";
import LobbyScreen from "./screens/LobbyScreen";
import BingoFarm from "./components/BingoFarm";
import { IntroPlayer } from "./remotion";
import "./App.css";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Room join handler component for /room/:code URLs
function RoomJoinHandler({ userId, onJoinRoom }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const joinRoom = useMutation(api.rooms.joinRoom);
  const room = useQuery(api.rooms.getRoomByCode, code ? { code: code.toUpperCase() } : "skip");

  useEffect(() => {
    if (room && userId) {
      // Room exists, auto-join
      joinRoom({ code: code.toUpperCase(), userId })
        .then((result) => {
          if (result.success) {
            onJoinRoom(result.roomId);
          } else {
            // Failed to join, go to lobby
            navigate("/", { replace: true });
          }
        })
        .catch(() => {
          navigate("/", { replace: true });
        });
    } else if (room === null) {
      // Room doesn't exist, go to lobby
      navigate("/", { replace: true });
    }
  }, [room, userId, code, joinRoom, navigate, onJoinRoom]);

  return (
    <div className="loading">
      <div className="join-loading">
        <span className="loading-emoji">👑</span>
        <p>Joining room <strong>{code?.toUpperCase()}</strong>...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoaded } = useUser();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    // Only show intro once per session
    return !sessionStorage.getItem("bingo_intro_seen");
  });
  const navigate = useNavigate();

  // Find the Convex user based on Clerk ID
  const convexUser = useQuery(api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  // Synchronize Clerk user with Convex
  const createUser = useMutation(api.users.createUser);
  useEffect(() => {
    if (isLoaded && user && convexUser === null) {
      createUser({
        name: user.fullName || user.username || undefined,
        clerkId: user.id
      });
    }
  }, [isLoaded, user, convexUser, createUser]);

  if (!isLoaded) return <div className="loading">Checking royalty status...</div>;

  const handleJoinRoom = (roomId) => {
    setCurrentRoom(roomId);
    navigate("/", { replace: true });
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <div className="app">
      {/* Intro animation - shows once per session */}
      {showIntro && (
        <IntroPlayer
          onComplete={() => {
            sessionStorage.setItem("bingo_intro_seen", "true");
            setShowIntro(false);
          }}
        />
      )}

      <SignedOut>
        <LoginScreen />
      </SignedOut>

      <SignedIn>
        {currentRoom && convexUser ? (
          <GameScreen
            userId={convexUser._id}
            roomId={currentRoom}
            onLeave={handleLeaveRoom}
          />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                convexUser ? (
                  <LobbyScreen
                    userId={convexUser._id}
                    onJoinRoom={handleJoinRoom}
                    onLogout={() => { }}
                  />
                ) : user ? (
                  <div className="loading">Initializing your royal profile...</div>
                ) : null
              }
            />
            <Route
              path="/room/:code"
              element={
                convexUser ? (
                  <RoomJoinHandler userId={convexUser._id} onJoinRoom={handleJoinRoom} />
                ) : user ? (
                  <div className="loading">Initializing your royal profile...</div>
                ) : null
              }
            />
          </Routes>
        )}
        {!convexUser && user && (
          <div className="loading">Initializing your royal profile...</div>
        )}

        {/* Bingo Farm - bottom bar idle game */}
        {convexUser && <BingoFarm userId={convexUser._id} />}
      </SignedIn>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
