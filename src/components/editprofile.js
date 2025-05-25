import React, { useState, useEffect } from 'react';
import API from '../api'; // or use axios instance

export default function EditProfile({ currentUser }) {
  const [profile, setProfile] = useState({});
  const [file, setFile] = useState(null);

  useEffect(() => {
    API.get(`/users/${currentUser}`).then(res => setProfile(res.data));
  }, [currentUser]);

  const handleChange = e => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', profile.username);
    formData.append('bio', profile.bio);
    if (file) formData.append('profilePic', file);

    const res = await API.put(`/users/${currentUser}`, formData);
    alert("Profile updated!");
    setProfile(res.data);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-profile-form">
      <img src={`http://localhost:5000${profile.profilePic}`} alt="Profile" width={100} />
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <input name="username" value={profile.username || ''} onChange={handleChange} />
      <textarea name="bio" value={profile.bio || ''} onChange={handleChange} />
      <button type="submit">Save</button>
    </form>
  );
}
