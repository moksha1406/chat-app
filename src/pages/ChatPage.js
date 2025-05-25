import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UsersList from '../components/UsersList';
import ChatBox from '../components/ChatBox';
import '../components/chatpage.css';

export default function ChatPage({ user }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  // Function to start video call, roomId is sorted combination of user ids (or usernames)
  const startVideoCall = () => {
    if (!selectedUser) return;
    const roomId = [user, selectedUser].sort().join('_');
    navigate(`/video-call/${roomId}`);
  };

  return (
    <div className="app-container">
      {/* Users Sidebar */}
      <aside className="users-container">
        <h3>Welcome, {user}!</h3>
        <UsersList
          currentUser={user}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
        />
      </aside>

      {/* Chat Panel */}
      <section className="chatbox-container">
        {selectedUser ? (
          <>
            <header className="chatbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                Chat with <span>{selectedUser}</span>
              </div>
              <button
                onClick={startVideoCall}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                title="Start Video Call"
              >
                🎥 Video Call
              </button>
            </header>
            <ChatBox currentUser={user} selectedUser={selectedUser} />
          </>
        ) : (
          <div
            className="chatbox-messages"
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              color: '#999',
            }}
          >
            <h2>Select a user to start chatting</h2>
          </div>
        )}
      </section>
    </div>
  );
}
