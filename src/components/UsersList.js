import React, { useEffect, useState } from 'react';
import API from '../api';
import { io } from 'socket.io-client';
import './users.css';

const socket = io('http://localhost:5000');

export default function UsersList({ onSelect, currentUser, selectedUser }) {
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState({});

  useEffect(() => {
    API.get('/users').then(res => {
      const filtered = res.data.filter(user => user.username !== currentUser);
      setUsers(filtered);
    });
  }, [currentUser]);

  useEffect(() => {
    const handleReceive = (message) => {
      if (
        message.receiver === currentUser &&
        message.sender !== selectedUser
      ) {
        setNotifications(prev => ({ ...prev, [message.sender]: true }));
      }
    };

    socket.on('receiveMessage', handleReceive);
    return () => socket.off('receiveMessage', handleReceive);
  }, [currentUser, selectedUser]);

  const handleSelect = (username) => {
    onSelect(username);
    setNotifications(prev => {
      const copy = { ...prev };
      delete copy[username];
      return copy;
    });
  };

  return (
    <ul className="user-list">
      {users.map(user => (
        <li
          key={user._id}
          className={`user-item ${selectedUser === user.username ? 'selected' : ''}`}
          onClick={() => handleSelect(user.username)}
        >
          <span className="username">{user.username}</span>
          {notifications[user.username] && (
            <span className="notification-dot" />
          )}
        </li>
      ))}
    </ul>
  );
}
