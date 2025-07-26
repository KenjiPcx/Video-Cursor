import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { sendMessageHttpStream } from "./chat";
import {
    corsRouter,
    DEFAULT_EXPOSED_HEADERS,
} from "convex-helpers/server/cors";

const http = httpRouter();

auth.addHttpRoutes(http);

const cors = corsRouter(http, {
    allowCredentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    allowedOrigins: [process.env.CLIENT_ORIGIN as string],
});

// Chat endpoint for streaming responses
cors.route({
    path: "/chat",
    method: "POST",
    handler: sendMessageHttpStream,
});

export default http;
