import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login({ setUser }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError(''); // reset error

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: formData.username,
        password: formData.password,
      });

      // Store token and username
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);

      // Update user state in parent component
      if (setUser) {
        setUser(response.data.username);
      }

      // Navigate to /chat on successful login
      navigate('/chat');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="dots-overlay" />
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username" className="login-label">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            className="login-input"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <label htmlFor="password" className="login-label" style={{ marginTop: '15px' }}>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="login-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={handleTogglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ marginLeft: '10px' }}
            >
              {showPassword ? '🙈' : '🐵'}
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Log In
          </button>
        </form>

        <p className="register-text" style={{ marginTop: '15px' }}>
          Don't have an account?{' '}
          <a href="/register" className="register-link">Register here</a>
        </p>
      </div>
    </div>
  );
}
