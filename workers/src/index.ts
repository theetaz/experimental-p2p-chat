import { UserManager } from "./user-manager";

export { UserManager };

export interface Env {
  USER_MANAGER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");

    // Enable CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Get the Durable Object ID (using a single instance for all users)
    const id = env.USER_MANAGER.idFromName("global");
    const stub = env.USER_MANAGER.get(id);

    // Forward the request to the Durable Object
    const response = await stub.fetch(request);

    // For WebSocket upgrades, return as-is (don't modify)
    if (upgradeHeader?.toLowerCase() === "websocket") {
      return response;
    }

    // Add CORS headers to regular HTTP responses
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  },
};
