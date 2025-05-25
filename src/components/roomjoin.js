import React, { useState } from 'react';
import VideoCall from './videocall';

const RoomJoin = () => {
  const [roomId, setRoomId] = useState('');
  const [joinedRoomId, setJoinedRoomId] = useState(null);

  const handleJoin = () => {
    if (roomId.trim()) {
      setJoinedRoomId(roomId.trim());
    } else {
      alert('Please enter a valid room ID');
    }
  };

  if (joinedRoomId) {
    return <VideoCall roomId={joinedRoomId} />;
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h2>Enter Room ID to Join Video Call</h2>
      <input
        type="text"
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ padding: 8, fontSize: 16, width: 300 }}
      />
      <button
        onClick={handleJoin}
        style={{ padding: '8px 16px', marginLeft: 10, fontSize: 16, cursor: 'pointer' }}
      >
        Join
      </button>
    </div>
  );
};

export default RoomJoin;
