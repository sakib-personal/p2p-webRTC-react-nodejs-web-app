import { Routes, Route } from "react-router-dom";
import "./App.css";
import LobbyScreen from "./screens/Lobby.jsx";
import ChatRoom from "./screens/ChatRoom.jsx";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LobbyScreen />} />
        <Route path="/chat-room/:roomId" element={<ChatRoom />} />
      </Routes>
    </div>
  );
}

export default App;
