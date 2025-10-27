import { useEffect, useRef, useState, useCallback } from "react";

export interface WebRTCMessage {
  text: string;
  senderId: string;
  timestamp: number;
}

interface UseWebRTCProps {
  localUserId: string;
  remoteUserId: string | null;
  onMessage: (message: WebRTCMessage) => void;
  sendSignal: (signal: any) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({ localUserId, remoteUserId, onMessage, sendSignal }: UseWebRTCProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          payload: {
            candidate: event.candidate,
            toUserId: remoteUserId,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      setupDataChannel(dataChannel);
    };

    return pc;
  }, [remoteUserId, sendSignal]);

  const setupDataChannel = useCallback(
    (dataChannel: RTCDataChannel) => {
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log("Data channel opened");
        setIsConnected(true);
        setIsConnecting(false);
      };

      dataChannel.onclose = () => {
        console.log("Data channel closed");
        setIsConnected(false);
      };

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebRTCMessage;
          onMessage(message);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };
    },
    [onMessage]
  );

  const createOffer = useCallback(async () => {
    try {
      setIsConnecting(true);
      const pc = createPeerConnection();

      // Create data channel
      const dataChannel = pc.createDataChannel("chat");
      setupDataChannel(dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        payload: {
          offer,
          toUserId: remoteUserId,
        },
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      setIsConnecting(false);
    }
  }, [createPeerConnection, setupDataChannel, remoteUserId, sendSignal]);

  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      try {
        setIsConnecting(true);
        const pc = createPeerConnection();

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          payload: {
            answer,
            toUserId: remoteUserId,
          },
        });
      } catch (error) {
        console.error("Error handling offer:", error);
        setIsConnecting(false);
      }
    },
    [createPeerConnection, remoteUserId, sendSignal]
  );

  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    },
    []
  );

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    },
    []
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (dataChannelRef.current?.readyState === "open") {
        const message: WebRTCMessage = {
          text,
          senderId: localUserId,
          timestamp: Date.now(),
        };
        dataChannelRef.current.send(JSON.stringify(message));
        return message;
      }
      return null;
    },
    [localUserId]
  );

  const closeConnection = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    isConnected,
    isConnecting,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    sendMessage,
    closeConnection,
  };
}
