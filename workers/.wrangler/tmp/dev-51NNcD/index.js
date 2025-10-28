var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-cY48xy/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/user-manager.ts
import { DurableObject } from "cloudflare:workers";
var UserManager = class extends DurableObject {
  static {
    __name(this, "UserManager");
  }
  sessions;
  chatRequests;
  constructor(ctx, env) {
    super(ctx, env);
    this.sessions = /* @__PURE__ */ new Map();
    this.chatRequests = /* @__PURE__ */ new Map();
    this.ctx.blockConcurrencyWhile(async () => {
      setInterval(() => this.cleanupInactiveSessions(), 3e4);
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    switch (url.pathname) {
      case "/users":
        return this.getOnlineUsers();
      case "/users/count":
        return this.getUserCount();
      default:
        return new Response("Not found", { status: 404 });
    }
  }
  async handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    console.log("WebSocket connection established");
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
  async webSocketMessage(ws, message) {
    try {
      if (typeof message !== "string") return;
      const data = JSON.parse(message);
      console.log("Received message:", data.type);
      switch (data.type) {
        case "join":
          console.log("User joining:", data.payload.username);
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
  async webSocketClose(ws, code, reason, wasClean) {
    await this.handleUserLeave(ws);
  }
  async webSocketError(ws, error) {
    console.error("WebSocket error:", error);
    await this.handleUserLeave(ws);
  }
  async handleUserJoin(ws, user) {
    const session = {
      webSocket: ws,
      user,
      lastSeen: Date.now()
    };
    this.sessions.set(user.id, session);
    const onlineUsers = Array.from(this.sessions.values()).map((s) => ({
      ...s.user,
      lastSeen: s.lastSeen
    }));
    this.sendToUser(user.id, {
      type: "initial-users",
      payload: onlineUsers
    });
    this.broadcast(
      {
        type: "user-joined",
        payload: {
          ...user,
          lastSeen: Date.now()
        }
      },
      user.id
    );
  }
  async handleUserLeave(ws) {
    let userId = null;
    for (const [id, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        userId = id;
        break;
      }
    }
    if (userId) {
      this.sessions.delete(userId);
      this.broadcast({
        type: "user-left",
        payload: { userId }
      });
    }
  }
  async handleLocationUpdate(ws, location) {
    for (const [userId, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        session.user.location = location;
        session.lastSeen = Date.now();
        this.broadcast({
          type: "user-updated",
          payload: {
            userId,
            location
          }
        });
        break;
      }
    }
  }
  async handleChatRequest(payload) {
    const requestId = crypto.randomUUID();
    const chatRequest = {
      id: requestId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      status: "pending",
      createdAt: Date.now()
    };
    this.chatRequests.set(requestId, chatRequest);
    const fromUser = this.sessions.get(payload.fromUserId)?.user;
    this.sendToUser(payload.toUserId, {
      type: "chat-request",
      payload: {
        ...chatRequest,
        fromUser
      }
    });
  }
  async handleChatResponse(payload) {
    const chatRequest = this.chatRequests.get(payload.requestId);
    if (!chatRequest) return;
    chatRequest.status = payload.accepted ? "accepted" : "rejected";
    if (payload.accepted) {
      const toUser = this.sessions.get(chatRequest.toUserId)?.user;
      this.sendToUser(chatRequest.fromUserId, {
        type: "chat-accepted",
        payload: {
          requestId: payload.requestId,
          peerId: chatRequest.toUserId,
          peerUser: toUser
        }
      });
      this.sendToUser(chatRequest.toUserId, {
        type: "chat-accepted",
        payload: {
          requestId: payload.requestId,
          peerId: chatRequest.fromUserId
        }
      });
    } else {
      this.sendToUser(chatRequest.fromUserId, {
        type: "chat-rejected",
        payload: {
          requestId: payload.requestId,
          userId: chatRequest.toUserId
        }
      });
    }
    setTimeout(() => {
      this.chatRequests.delete(payload.requestId);
    }, 6e4);
  }
  async handleSignaling(data) {
    const { toUserId, ...signalingData } = data;
    if (toUserId) {
      this.sendToUser(toUserId, signalingData);
    }
  }
  async handleHeartbeat(ws) {
    for (const [userId, session] of this.sessions.entries()) {
      if (session.webSocket === ws) {
        session.lastSeen = Date.now();
        break;
      }
    }
  }
  sendToUser(userId, message) {
    const session = this.sessions.get(userId);
    if (session) {
      try {
        session.webSocket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
      }
    }
  }
  broadcast(message, excludeUserId) {
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
  async getOnlineUsers() {
    const users = Array.from(this.sessions.values()).map((session) => ({
      ...session.user,
      lastSeen: session.lastSeen
    }));
    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async getUserCount() {
    return new Response(JSON.stringify({ count: this.sessions.size }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  cleanupInactiveSessions() {
    const now = Date.now();
    const timeout = 6e4;
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastSeen > timeout) {
        try {
          session.webSocket.close(1e3, "Session timeout");
        } catch (error) {
          console.error(`Error closing WebSocket for user ${userId}:`, error);
        }
        this.sessions.delete(userId);
        this.broadcast({
          type: "user-left",
          payload: { userId }
        });
      }
    }
  }
};

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    const id = env.USER_MANAGER.idFromName("global");
    const stub = env.USER_MANAGER.get(id);
    const response = await stub.fetch(request);
    if (upgradeHeader?.toLowerCase() === "websocket") {
      return response;
    }
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    return newResponse;
  }
};

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-cY48xy/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-cY48xy/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  UserManager,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
