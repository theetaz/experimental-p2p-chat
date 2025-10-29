import { useEffect, useRef, useCallback, useState } from "react";
import { useUserStore } from "./store";
import { OnlineUser, ChatRequest, User } from "./types";
import { WS_BASE_URL } from "./constants";

interface UseWebSocketOptions {
  onChatAccepted?: (peerId: string) => void;
  onSignalingMessage?: (message: any) => void;
  onChatEnded?: (peerId: string) => void;
}

// Global WebSocket instance shared across all components
let globalWs: WebSocket | null = null;
let globalHeartbeatInterval: NodeJS.Timeout | null = null;
let globalReconnectTimeout: NodeJS.Timeout | null = null;
const messageHandlers = new Set<(message: any) => void>();
const statusUpdateCallbacks = new Set<() => void>();

export function useWebSocket(currentUser: User | null, options?: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localHandlerRef = useRef<((message: any) => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    updateOnlineUser,
    addChatRequest,
    removeChatRequest,
  } = useUserStore();

  const connect = useCallback(() => {
    console.log("🔍 connect() called");
    console.log("🔍 currentUser:", currentUser);
    console.log("🔍 WS_BASE_URL:", WS_BASE_URL);
    console.log("🔍 globalWs state:", globalWs?.readyState);

    if (!currentUser) {
      console.log("❌ No currentUser, cannot connect");
      return;
    }

    // Use global WebSocket if it exists and is open/connecting
    if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
      console.log("✅ Using existing global WebSocket connection");
      wsRef.current = globalWs;

      // Register this component's message handler
      if (localHandlerRef.current) {
        messageHandlers.add(localHandlerRef.current);
      }
      return;
    }

    try {
      console.log("🔌 Creating new global WebSocket connection...");
      console.log("🔌 URL:", WS_BASE_URL);
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;
      globalWs = ws;
      console.log("✅ WebSocket object created and assigned to globalWs");

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
        if (globalHeartbeatInterval) {
          clearInterval(globalHeartbeatInterval);
        }
        globalHeartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "heartbeat" }));
          }
        }, 30000); // Every 30 seconds

        // Notify all components that connection is established
        statusUpdateCallbacks.forEach(callback => callback());
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📩 Received:", message.type);

          // Broadcast to all registered handlers
          messageHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              console.error("Error in message handler:", error);
            }
          });
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error occurred:", error);
        console.error("❌ WebSocket URL was:", WS_BASE_URL);
        console.error("❌ WebSocket readyState:", ws.readyState);
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected", event.code, event.reason);

        // Clean up global references
        if (globalHeartbeatInterval) {
          clearInterval(globalHeartbeatInterval);
          globalHeartbeatInterval = null;
        }
        if (globalReconnectTimeout) {
          clearTimeout(globalReconnectTimeout);
          globalReconnectTimeout = null;
        }

        // Notify all components that connection is closed
        statusUpdateCallbacks.forEach(callback => callback());

        // Only reconnect if:
        // 1. Not a normal closure (code 1000)
        // 2. Not a deliberate client closure (code 1001)
        // 3. We still have a current user
        const shouldReconnect =
          event.code !== 1000 &&
          event.code !== 1001 &&
          currentUser;

        if (shouldReconnect) {
          // Attempt to reconnect after 3 seconds
          globalReconnectTimeout = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            globalWs = null;
            connect();
          }, 3000);
        } else {
          globalWs = null;
          wsRef.current = null;
        }
      };

      // Register this component's message handler
      if (localHandlerRef.current) {
        messageHandlers.add(localHandlerRef.current);
      }
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [currentUser]);

  const handleMessage = useCallback((message: any) => {
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
        // Remove the chat request from the store
        if (message.payload.requestId) {
          removeChatRequest(message.payload.requestId);
        }
        if (options?.onChatAccepted && message.payload.peerId) {
          options.onChatAccepted(message.payload.peerId);
        }
        break;

      case "chat-rejected":
        console.log("❌ Chat rejected:", message.payload);
        // Remove the chat request from the store
        if (message.payload.requestId) {
          removeChatRequest(message.payload.requestId);
        }
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        if (options?.onSignalingMessage) {
          options.onSignalingMessage(message);
        }
        break;

      case "chat-ended":
        console.log("🔚 Chat ended by peer:", message.payload.peerId);
        if (options?.onChatEnded && message.payload.peerId) {
          options.onChatEnded(message.payload.peerId);
        }
        break;

      default:
        console.log("❓ Unknown message type:", message.type);
    }
  }, [setOnlineUsers, addOnlineUser, removeOnlineUser, updateOnlineUser, addChatRequest, removeChatRequest, options]);

  const sendMessage = useCallback((message: any) => {
    console.log("📤 sendMessage called with:", message);
    console.log("🔌 globalWs exists:", !!globalWs);
    console.log("🔌 globalWs readyState:", globalWs?.readyState);

    if (globalWs?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log("📡 Sending to server:", messageStr);
      globalWs.send(messageStr);
      console.log("✅ Message sent to WebSocket");
    } else {
      console.error("❌ WebSocket not open! ReadyState:", globalWs?.readyState);
    }
  }, []);

  const sendChatRequest = useCallback(
    (toUserId: string) => {
      console.log("🔍 sendChatRequest called with toUserId:", toUserId);

      if (!currentUser) {
        console.log("❌ No current user, cannot send chat request");
        return;
      }

      console.log("💬 Sending chat request from", currentUser.id, "to", toUserId);
      console.log("🔌 WebSocket state:", wsRef.current?.readyState);
      console.log("🔌 WebSocket OPEN constant:", WebSocket.OPEN);

      const message = {
        type: "chat-request",
        payload: {
          fromUserId: currentUser.id,
          toUserId,
        },
      };

      console.log("📨 Message to send:", JSON.stringify(message));
      sendMessage(message);
      console.log("✅ Message sent via sendMessage");
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

  const endChat = useCallback(
    (peerId: string) => {
      console.log("🔚 Ending chat with peer:", peerId);
      sendMessage({
        type: "end-chat",
        payload: {
          peerId,
        },
      });
    },
    [sendMessage]
  );

  const disconnect = useCallback(() => {
    console.log("🔌 disconnect() called");
    console.log("🔌 Active handlers:", messageHandlers.size);

    // Clear all message handlers
    messageHandlers.clear();

    if (globalWs) {
      // Clean up global intervals
      if (globalHeartbeatInterval) {
        clearInterval(globalHeartbeatInterval);
        globalHeartbeatInterval = null;
      }
      if (globalReconnectTimeout) {
        clearTimeout(globalReconnectTimeout);
        globalReconnectTimeout = null;
      }

      // Only send leave message if WebSocket is actually open
      if (currentUser && globalWs.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify({ type: "leave" }));
      }

      globalWs.close();
      globalWs = null;
      wsRef.current = null;
      console.log("✅ WebSocket disconnected");
    }
  }, [currentUser]);

  useEffect(() => {
    console.log("🔍 useEffect triggered");
    console.log("🔍 currentUser:", currentUser);
    console.log("🔍 globalWs:", globalWs);
    console.log("🔍 currentUser?.id:", currentUser?.id);

    // Create and register message handler
    localHandlerRef.current = handleMessage;

    // Register status update callback
    const updateStatus = () => {
      setIsConnected(globalWs?.readyState === WebSocket.OPEN);
    };
    statusUpdateCallbacks.add(updateStatus);

    if (currentUser) {
      // Connect or reuse existing connection
      if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
        console.log("✅ Conditions met, calling connect()");
        connect();
      } else {
        console.log("✅ Reusing existing global WebSocket");
        wsRef.current = globalWs;
        messageHandlers.add(handleMessage);
        setIsConnected(globalWs.readyState === WebSocket.OPEN);
      }
    } else {
      console.log("⚠️ No currentUser");
    }

    return () => {
      console.log("🧹 Cleanup function called");
      // Remove this component's message handler
      if (localHandlerRef.current) {
        messageHandlers.delete(localHandlerRef.current);
        console.log("🗑️ Removed message handler, remaining handlers:", messageHandlers.size);
      }

      // Remove status update callback
      statusUpdateCallbacks.delete(updateStatus);

      // IMPORTANT: Don't disconnect on cleanup
      // The global connection should persist across page navigations
      // Only disconnect when explicitly logging out
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, handleMessage]); // Only reconnect when user ID changes

  return {
    isConnected,
    sendMessage,
    sendChatRequest,
    respondToChatRequest,
    endChat,
    disconnect,
  };
}
