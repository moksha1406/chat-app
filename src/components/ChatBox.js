import React, { useEffect, useRef, useState } from 'react';
import API from '../api';
import { io } from 'socket.io-client';
import './chatbox.css';

const socket = io('http://localhost:5000');

export default function ChatBox({ currentUser, selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;
    socket.emit('joinRoom', { sender: currentUser, receiver: selectedUser });

    API.get(`/messages/${currentUser}/${selectedUser}`).then(res => {
      setMessages(res.data);
    });
  }, [selectedUser, currentUser]);

  useEffect(() => {
    const handleReceive = (message) => {
      if (
        (message.sender === selectedUser && message.receiver === currentUser) ||
        (message.sender === currentUser && message.receiver === selectedUser)
      ) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('receiveMessage', handleReceive);
    return () => socket.off('receiveMessage', handleReceive);
  }, [selectedUser, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() && !imageFile) return;

    const formData = new FormData();
    formData.append('sender', currentUser);
    formData.append('receiver', selectedUser);
    formData.append('content', newMsg);
    if (imageFile) formData.append('image', imageFile);

    const res = await API.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    socket.emit('sendMessage', res.data);
    setNewMsg('');
    setImageFile(null);
    setPhotoPreview(null);
  };

const askAI = async () => {
  if (!newMsg.trim()) return;

  try {
    // Mock AI response locally without backend call
    const aiReply = `AI says: You asked "${newMsg}"`;

    const userMsg = {
      sender: currentUser,
      receiver: 'Gemini',
      content: newMsg,
      _id: Date.now() + '-user', // temp id
    };
    const aiMsg = {
      sender: 'Gemini',
      receiver: currentUser,
      content: aiReply,
      _id: Date.now() + '-ai',
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setNewMsg('');
  } catch (err) {
    console.error('AI mock error:', err);
  }
};


  const openCamera = async () => {
    setShowCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const closeCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
      setImageFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    });

    closeCamera();
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-bubble ${msg.sender === currentUser ? 'sent' : 'received'}`}
          >
            <strong>{msg.sender}:</strong> {msg.content}
            {msg.image && (
              <div>
                <img src={`http://localhost:5000${msg.image}`} alt="sent" className="chat-img" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div className="photo-preview-overlay">
          <div className="photo-preview-modal">
            <img src={photoPreview} alt="Preview" className="photo-preview-img" />
            <div className="photo-preview-actions">
              <button className="btn btn-remove" onClick={() => {
                setPhotoPreview(null);
                setImageFile(null);
              }}>
                Remove
              </button>
              <button className="btn btn-send" onClick={sendMessage}>
                Send Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Popup */}
      {showCamera && (
        <div className="camera-popup">
          <video ref={videoRef} autoPlay className="camera-video" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="capture-controls">
            <button className="btn-capture" onClick={capturePhoto}>📸 Capture</button>
            <button className="btn-close" onClick={closeCamera}>✖ Close</button>
          </div>
        </div>
      )}

      {/* Input and Controls */}
      <div className="chatbox-input">
        <input
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />

        <label htmlFor="file-upload" className="custom-file-label">📁</label>
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={(e) => {
            setImageFile(e.target.files[0]);
            setPhotoPreview(URL.createObjectURL(e.target.files[0]));
          }}
          style={{ display: 'none' }}
        />

        <button onClick={openCamera}>📷</button>
        <button onClick={sendMessage}>Send</button>
        <button onClick={askAI}>Ask AI</button>
      </div>
    </div>
  );
}
