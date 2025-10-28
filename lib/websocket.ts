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
    if (!currentUser) {
      return;
    }

    // Prevent multiple connections
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log("⚠️ WebSocket already connecting or connected");
      return;
    }

    try {
      console.log("🔌 Connecting to WebSocket...");
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");

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
          console.log("📩 Received:", message.type);
          handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // WebSocket errors are often benign and fire during normal connection flow
        // Real connection issues will be caught by onclose event
        // Suppress error logging to avoid confusion
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected", event.code, event.reason);
        cleanup();

        // Only reconnect if:
        // 1. Not a normal closure (code 1000)
        // 2. Not a deliberate client closure (code 1001)
        // 3. We still have a current user
        // 4. The closed socket is still the current one
        const shouldReconnect =
          event.code !== 1000 &&
          event.code !== 1001 &&
          currentUser &&
          wsRef.current === ws;

        if (shouldReconnect) {
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            connect();
          }, 3000);
        } else {
          wsRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [currentUser]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case "initial-users":
        console.log("👥 Initial users:", message.payload.length);
        setOnlineUsers(message.payload as OnlineUser[]);
        break;

      case "user-joined":
        console.log("👋 User joined:", message.payload.username);
        addOnlineUser(message.payload as OnlineUser);
        break;

      case "user-left":
        console.log("👋 User left:", message.payload.userId);
        removeOnlineUser(message.payload.userId);
        break;

      case "user-updated":
        updateOnlineUser(message.payload.userId, message.payload);
        break;

      case "chat-request":
        console.log("📨 Received chat request:", message.payload);
        addChatRequest(message.payload as ChatRequest);
        console.log("💬 New chat request from:", message.payload.fromUser?.username);
        break;

      case "chat-accepted":
        console.log("✅ Chat accepted:", message.payload);
        if (options?.onChatAccepted && message.payload.peerId) {
          options.onChatAccepted(message.payload.peerId);
        }
        break;

      case "chat-rejected":
        console.log("❌ Chat rejected:", message.payload);
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        if (options?.onSignalingMessage) {
          options.onSignalingMessage(message);
        }
        break;

      default:
        console.log("❓ Unknown message type:", message.type);
    }
  };

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendChatRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) {
        console.log("❌ No current user, cannot send chat request");
        return;
      }

      console.log("💬 Sending chat request from", currentUser.id, "to", toUserId);
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
      console.log("📬 Responding to chat request:", requestId, "Accepted:", accepted);
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
    if (currentUser && !wsRef.current) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only reconnect when user ID changes

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    sendChatRequest,
    respondToChatRequest,
    disconnect,
  };
}
