import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinCallPage() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmedRoomId = roomId.trim();
    if (trimmedRoomId) {
      navigate(`/video-call/${trimmedRoomId}`);
    }
  };

  return (
    <div className="join-call-container" style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Join Video Call</h2>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px', fontSize: '16px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px', fontSize: '16px' }}>
          Join Call
        </button>
      </form>
    </div>
  );
}

export default JoinCallPage;
