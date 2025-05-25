// components/CameraCapture.js
import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const videoConstraints = {
  width: 300,
  height: 300,
  facingMode: "user",
};

const CameraCapture = ({ onClose, onUpload }) => {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCaptured(imageSrc);
  };

  const sendPhoto = async () => {
    if (!captured) return;

    const blob = await (await fetch(captured)).blob();
    const formData = new FormData();
    formData.append('image', blob, `photo-${Date.now()}.png`);

    try {
      const response = await axios.post('/api/upload', formData);
      onUpload(response.data.imageUrl); // callback to parent
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="camera-modal">
      <Webcam
        audio={false}
        height={300}
        ref={webcamRef}
        screenshotFormat="image/png"
        width={300}
        videoConstraints={videoConstraints}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={capturePhoto}>Capture</button>
        {captured && <img src={captured} alt="preview" style={{ width: 100 }} />}
        {captured && <button onClick={sendPhoto}>Send Photo</button>}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default CameraCapture;
