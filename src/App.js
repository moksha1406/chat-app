import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import axios from 'axios';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import VideoCall from './components/videocall';
import JoinCallPage from './pages/JoinCall';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify if user token is valid on app load
  useEffect(() => {
    
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch (err) {
        // Token invalid or expired - clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={user ? <Navigate to="/chat" /> : <LoginPage setUser={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/chat" /> : <RegisterPage setUser={setUser} />}
        />

        {/* Protected routes */}
        <Route
          path="/chat"
          element={user ? <ChatPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/join-call"
          element={user ? <JoinCallPage /> : <Navigate to="/" />}
        />
        <Route
          path="/video-call/:roomId"
          element={user ? <VideoCallWrapper user={user} /> : <Navigate to="/" />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/chat" : "/"} />} />
      </Routes>
    </Router>
  );
}

// Wrapper to extract roomId param and pass to VideoCall component
function VideoCallWrapper({ user }) {
  const { roomId } = useParams();

  if (!roomId) return <Navigate to="/join-call" />;
  if (!user) return <Navigate to="/" />;

  return <VideoCall roomId={roomId} user={user} />;
}

export default App;
