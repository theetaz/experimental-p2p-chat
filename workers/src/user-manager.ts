import { DurableObject } from "cloudflare:workers";

export interface Env {
  USER_MANAGER: DurableObjectNamespace;
}

interface User {
  id: string;
  username: string;
  mood: string;
  interests: string[];
  avatar: {
    style: string;
    seed: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  connectedAt: number;
}

interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

interface WebSocketSession {
  webSocket: WebSocket;
  user: User;
  lastSeen: number;
}

export class UserManager extends DurableObject {
  private sessions: Map<string, WebSocketSession>;
  private chatRequests: Map<string, ChatRequest>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();
    this.chatRequests = new Map();

    // Clean up inactive sessions every 30 seconds
    this.ctx.blockConcurrencyWhile(async () => {
      setInterval(() => this.cleanupInactiveSessions(), 30000);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    switch (url.pathname) {
      case "/users":
        return this.getOnlineUsers();
      case "/users/count":
        return this.getUserCount();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") return;

      const data = JSON.parse(message);

      switch (data.type) {
        case "join":
          await this.handleUserJoin(ws, data.payload);
          break;
        case "leave":
          await this.handleUserLeave(ws);
          break;
        case "update-location":
          await this.handleLocationUpdate(ws, data.payload);
          break;
        case "chat-request":
          await this.handleChatRequest(data.payload);
          break;
        case "chat-response":
          await this.handleChatResponse(data.payload);
          break;
        case "offer":
        case "answer":
        case "ice-candidate":
          await this.handleSignaling(data);
          break;
        case "heartbeat":
          await this.handleHeartbeat(ws);
          break;
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    await this.handleUserLeave(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("WebSocket error:", error);
    await this.handleUserLeave(ws);
  }

  private async handleUserJoin(ws: WebSocket, user: User) {
    const session: WebSocketSession = {
      webSocket: ws,
      user,
      lastSeen: Date.now(),
    };

    this.sessions.set(user.id, session);

    // Send current online users to the new user
    const onlineUsers = Array.from(this.sessions.values()).map((s) => ({
      ...s.user,
      lastSeen: s.lastSeen,
    }));

    this.sendToUser(user.id, {
      type: "initial-users",
      payload: onlineUsers,
    });

    // Broadcast new user to all other users
    this.broadcast(
      {
        type: "user-joined",
        payload: {
          ...user,
          lastSeen: Date.now(),
        },
      },
      user.id
    );
  }

  private async handleUserLeave(ws: WebSocket) {
    let userId: string | null = null;

    for (const [id, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        userId = id;
        break;
      }
    }

    if (userId) {
      this.sessions.delete(userId);

      // Broadcast user left to all users
      this.broadcast({
        type: "user-left",
        payload: { userId },
      });
    }
  }

  private async handleLocationUpdate(ws: WebSocket, location: { latitude: number; longitude: number }) {
    for (const [userId, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        session.user.location = location;
        session.lastSeen = Date.now();

        // Broadcast location update
        this.broadcast({
          type: "user-updated",
          payload: {
            userId,
            location,
          },
        });
        break;
      }
    }
  }

  private async handleChatRequest(payload: { fromUserId: string; toUserId: string }) {
    const requestId = crypto.randomUUID();
    const chatRequest: ChatRequest = {
      id: requestId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      status: "pending",
      createdAt: Date.now(),
    };

    this.chatRequests.set(requestId, chatRequest);

    // Send request to the target user
    const fromUser = this.sessions.get(payload.fromUserId)?.user;
    this.sendToUser(payload.toUserId, {
      type: "chat-request",
      payload: {
        ...chatRequest,
        fromUser,
      },
    });
  }

  private async handleChatResponse(payload: { requestId: string; accepted: boolean }) {
    const chatRequest = this.chatRequests.get(payload.requestId);
    if (!chatRequest) return;

    chatRequest.status = payload.accepted ? "accepted" : "rejected";

    if (payload.accepted) {
      // Notify both users that chat is accepted
      const toUser = this.sessions.get(chatRequest.toUserId)?.user;

      this.sendToUser(chatRequest.fromUserId, {
        type: "chat-accepted",
        payload: {
          requestId: payload.requestId,
          peerId: chatRequest.toUserId,
          peerUser: toUser,
        },
      });

      this.sendToUser(chatRequest.toUserId, {
        type: "chat-accepted",
        payload: {
          requestId: payload.requestId,
          peerId: chatRequest.fromUserId,
        },
      });
    } else {
      // Notify requester that chat was rejected
      this.sendToUser(chatRequest.fromUserId, {
        type: "chat-rejected",
        payload: {
          requestId: payload.requestId,
          userId: chatRequest.toUserId,
        },
      });
    }

    // Clean up request after 1 minute
    setTimeout(() => {
      this.chatRequests.delete(payload.requestId);
    }, 60000);
  }

  private async handleSignaling(data: any) {
    const { toUserId, ...signalingData } = data;
    if (toUserId) {
      this.sendToUser(toUserId, signalingData);
    }
  }

  private async handleHeartbeat(ws: WebSocket) {
    for (const [userId, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        session.lastSeen = Date.now();
        break;
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    const session = this.sessions.get(userId);
    if (session) {
      try {
        session.webSocket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
      }
    }
  }

  private broadcast(message: any, excludeUserId?: string) {
    const messageStr = JSON.stringify(message);
    for (const [userId, session] of this.sessions.entries()) {
      if (userId !== excludeUserId) {
        try {
          session.webSocket.send(messageStr);
        } catch (error) {
          console.error(`Error broadcasting to user ${userId}:`, error);
        }
      }
    }
  }

  private async getOnlineUsers(): Promise<Response> {
    const users = Array.from(this.sessions.values()).map((session) => ({
      ...session.user,
      lastSeen: session.lastSeen,
    }));

    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async getUserCount(): Promise<Response> {
    return new Response(JSON.stringify({ count: this.sessions.size }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastSeen > timeout) {
        try {
          session.webSocket.close(1000, "Session timeout");
        } catch (error) {
          console.error(`Error closing WebSocket for user ${userId}:`, error);
        }
        this.sessions.delete(userId);

        // Broadcast user left
        this.broadcast({
          type: "user-left",
          payload: { userId },
        });
      }
    }
  }
}
