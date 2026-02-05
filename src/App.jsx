import { useState, useEffect } from "react";
import GameScreen from "./screens/GameScreen";
import LoginScreen from "./screens/LoginScreen";
import LobbyScreen from "./screens/LobbyScreen";
import BingoFarm from "./components/BingoFarm";
import "./App.css";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function App() {
  const { user, isLoaded } = useUser();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [screen, setScreen] = useState("lobby"); // lobby, game

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
    setScreen("game");
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setScreen("lobby");
  };

  return (
    <div className="app">
      <SignedOut>
        <LoginScreen />
      </SignedOut>

      <SignedIn>
        {screen === "lobby" && convexUser && (
          <LobbyScreen
            userId={convexUser._id}
            onJoinRoom={handleJoinRoom}
            onLogout={() => { }} // Clerk handles sign out via UserButton
          />
        )}
        {screen === "game" && convexUser && currentRoom && (
          <GameScreen
            userId={convexUser._id}
            roomId={currentRoom}
            onLeave={handleLeaveRoom}
          />
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

export default App;
