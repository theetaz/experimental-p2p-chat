import { useEffect, useRef, useCallback } from "react";
import { useUserStore } from "./store";
import { OnlineUser, ChatRequest, User } from "./types";
import { WS_BASE_URL } from "./constants";

interface UseWebSocketOptions {
  onChatAccepted?: (peerId: string) => void;
  onSignalingMessage?: (message: any) => void;
}

export function useWebSocket(currentUser: User | null, options?: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    updateOnlineUser,
    addChatRequest,
  } = useUserStore();

  const connect = useCallback(() => {
    if (!currentUser || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");

        // Send join message
        ws.send(
          JSON.stringify({
            type: "join",
            payload: currentUser,
          })
        );

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "heartbeat" }));
          }
        }, 30000); // Every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        cleanup();

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [currentUser]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case "initial-users":
        setOnlineUsers(message.payload as OnlineUser[]);
        break;

      case "user-joined":
        addOnlineUser(message.payload as OnlineUser);
        break;

      case "user-left":
        removeOnlineUser(message.payload.userId);
        break;

      case "user-updated":
        updateOnlineUser(message.payload.userId, message.payload);
        break;

      case "chat-request":
        addChatRequest(message.payload as ChatRequest);
        // Show notification (you can add a toast notification here)
        console.log("New chat request from:", message.payload.fromUser?.username);
        break;

      case "chat-accepted":
        console.log("Chat accepted:", message.payload);
        if (options?.onChatAccepted && message.payload.peerId) {
          options.onChatAccepted(message.payload.peerId);
        }
        break;

      case "chat-rejected":
        console.log("Chat rejected:", message.payload);
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        if (options?.onSignalingMessage) {
          options.onSignalingMessage(message);
        }
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  };

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendChatRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) return;

      sendMessage({
        type: "chat-request",
        payload: {
          fromUserId: currentUser.id,
          toUserId,
        },
      });
    },
    [currentUser, sendMessage]
  );

  const respondToChatRequest = useCallback(
    (requestId: string, accepted: boolean) => {
      sendMessage({
        type: "chat-response",
        payload: {
          requestId,
          accepted,
        },
      });
    },
    [sendMessage]
  );

  const cleanup = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      cleanup();
      // Only send leave message if WebSocket is actually open
      if (currentUser && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "leave" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      connect();
    }

    return () => {
      // Clear reconnection timeout on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      disconnect();
    };
  }, [currentUser, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    sendChatRequest,
    respondToChatRequest,
    disconnect,
  };
}
