import { UserManager } from "./user-manager";

export { UserManager };

export interface Env {
  USER_MANAGER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Enable CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    // Add CORS headers to response
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  },
};
