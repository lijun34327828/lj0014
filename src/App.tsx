import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket.js";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Result from "@/pages/Result";
import Settings from "@/pages/Settings";

function AppContent() {
  useWebSocket();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/:songId/:difficulty" element={<Game />} />
      <Route path="/result/:sessionId" element={<Result />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
