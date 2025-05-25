import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const SERVER_URL = "http://localhost:5000";
const reactionsList = ["👍", "❤️", "😂", "😮", "😢", "👏"];

const VideoCall = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [reactions, setReactions] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const reactionIdCounter = useRef(0);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    socketRef.current.emit("join-call", { roomId });

    socketRef.current.on("all-users", (users) => {
      users.forEach((userId) => {
        if (userId !== socketRef.current.id) {
          createPeerConnection(userId, true);
        }
      });
    });

    socketRef.current.on("user-joined", (userId) => {
      if (userId !== socketRef.current.id) {
        createPeerConnection(userId, false);
      }
    });

    socketRef.current.on("user-left", (userId) => {
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      if (!peerConnections.current[from]) {
        await createPeerConnection(from, false);
      }
      const pc = peerConnections.current[from];
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("webrtc-answer", { to: from, answer });
      } catch (error) {
        console.error("Error handling offer: ", error);
      }
    });

    socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer: ", error);
      }
    });

    socketRef.current.on("webrtc-ice-candidate", ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });

    socketRef.current.on("send-reaction", ({ from, reaction }) => {
      showReaction(from, reaction);
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(() => {
        alert("Could not access camera/mic. Please check permissions.");
      });

    // Capture peerConnections.current here for cleanup to avoid stale ref warning
    const peerConns = peerConnections.current;

    return () => {
      socketRef.current?.disconnect();
      Object.values(peerConns).forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      setRemoteStreams({});
    };
  }, [roomId]);

  const createPeerConnection = async (userId, isOfferer) => {
    if (peerConnections.current[userId]) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnections.current[userId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    const remoteStream = new MediaStream();
    setRemoteStreams((prev) => ({ ...prev, [userId]: { stream: null, status: "connecting" } }));

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      setRemoteStreams((prev) => ({ ...prev, [userId]: { stream: remoteStream, status: "connected" } }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("webrtc-ice-candidate", { to: userId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    };

    if (isOfferer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("webrtc-offer", { to: userId, offer });
      } catch (err) {
        console.error("Offer error:", err);
      }
    }
  };

  const replaceTrack = (newTrack) => {
    Object.values(peerConnections.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
      sender?.replaceTrack(newTrack);
    });
  };

  const startScreenShare = async () => {
    if (isScreenSharing) return stopScreenShare();

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = stopScreenShare;
    } catch {
      alert("Failed to start screen sharing.");
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    replaceTrack(cameraTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    });
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    });
  };

  const leaveCall = () => {
    socketRef.current?.emit("leave-call", { roomId });
    socketRef.current?.disconnect();
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    setRemoteStreams({});
    navigate("/");
  };

  const showReaction = (userId, reaction) => {
    const id = reactionIdCounter.current++;
    setReactions((prev) => [...prev, { id, userId, reaction }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const sendReaction = (reaction) => {
    socketRef.current?.emit("send-reaction", { roomId, reaction });
    showReaction(socketRef.current.id, reaction);
  };

  const gridColumns = () => {
    const count = Object.keys(remoteStreams).length + 1;
    return count <= 1 ? 1 : count <= 4 ? 2 : 3;
  };

  return (
    <div className="premium-container">
      <div className="header">
        🎥 Room ID: <span>{roomId}</span>
      </div>

      <div className="video-grid" style={{ gridTemplateColumns: `repeat(${gridColumns()}, 1fr)` }}>
        <div className="video-box glass">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`video-frame ${cameraOn ? "" : "off"}`}
          />
          <div className="label">You</div>
        </div>
        {Object.entries(remoteStreams).map(([userId, { stream, status }]) => (
          <div key={userId} className="video-box glass">
            {stream ? (
              <video
                autoPlay
                playsInline
                ref={(el) => el && (el.srcObject = stream)}
                className="video-frame"
              />
            ) : (
              <div className="video-placeholder">
                <div className="loader" />
              </div>
            )}
            <div className="label">{userId}</div>
          </div>
        ))}
      </div>

      <div className="reaction-popups">
        {reactions.map(({ id, reaction }) => (
          <div key={id} className="reaction-bubble">
            {reaction}
          </div>
        ))}
      </div>

      <div className="controls">
        <button onClick={toggleMic}>{micOn ? "🎙️ Mute" : "🔇 Unmute"}</button>
        <button onClick={toggleCamera}>{cameraOn ? "📷 Off" : "📷 On"}</button>
        <button onClick={startScreenShare}>
          {isScreenSharing ? "🛑 Stop Share" : "📺 Share Screen"}
        </button>
        <button onClick={leaveCall} className="leave">
          ❌ Leave
        </button>
      </div>

      <div className="reactions">
        {reactionsList.map((r) => (
          <button key={r} onClick={() => sendReaction(r)}>
            {r}
          </button>
        ))}
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .premium-container {
          padding: 2rem;
          background: linear-gradient(to right, #1e3c72, #2a5298);
          min-height: 100vh;
          font-family: 'Poppins', sans-serif;
          color: white;
        }

        .header {
          text-align: center;
          font-size: 1.6rem;
          margin-bottom: 2rem;
        }

        .video-grid {
          display: grid;
          gap: 1rem;
        }

        .video-box {
          position: relative;
          border-radius: 1rem;
          overflow: hidden;
        }

        .glass {
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .video-frame {
          width: 100%;
          border-radius: 1rem;
          object-fit: cover;
        }

        .off {
          filter: grayscale(100%) brightness(50%);
        }

        .label {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0,0,0,0.6);
          padding: 4px 8px;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          user-select: none;
        }

        .video-placeholder {
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .loader {
          border: 5px solid rgba(255, 255, 255, 0.2);
          border-top: 5px solid white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .reaction-popups {
          position: fixed;
          top: 10%;
          right: 5%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1000;
        }

        .reaction-bubble {
          background: rgba(255, 255, 255, 0.9);
          color: black;
          font-size: 1.8rem;
          padding: 8px 14px;
          border-radius: 30px;
          animation: floatUp 2s forwards;
          user-select: none;
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
        }

        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px);
          }
        }

        .controls {
          margin-top: 1.5rem;
          text-align: center;
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .controls button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          padding: 0.6rem 1.4rem;
          border-radius: 0.5rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }

        .controls button:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .controls button.leave {
          background: #f44336;
          color: white;
        }

        .reactions {
          margin-top: 1rem;
          text-align: center;
        }

        .reactions button {
          font-size: 1.8rem;
          margin: 0 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
          transition: transform 0.15s ease;
        }

        .reactions button:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default VideoCall;
