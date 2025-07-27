import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { chat } from "./chat";
import {
    corsRouter,
    DEFAULT_EXPOSED_HEADERS,
} from "convex-helpers/server/cors";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { r2 } from "./upload";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

const cors = corsRouter(http, {
    allowCredentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    allowedOrigins: ["http://localhost:3001"],
});

// Chat endpoint for streaming responses
cors.route({
    path: "/chat",
    method: "POST",
    handler: chat,
    exposedHeaders: [...DEFAULT_EXPOSED_HEADERS, "Message-Id"],
});

// File upload endpoint for large files
cors.route({
    path: "/upload",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        try {
            const formData = await request.formData();
            const file = formData.get("file") as File;
            const category = formData.get("category") as string;
            const projectId = formData.get("projectId") as string;
            const generationPrompt = formData.get("generationPrompt") as string;
            const generationModel = formData.get("generationModel") as string;
            const generationParams = formData.get("generationParams") as string;

            if (!file) {
                return new Response("No file provided", { status: 400 });
            }

            // Convert file to blob
            const bytes = await file.arrayBuffer();
            const blob = new Blob([bytes], { type: file.type });

            // Upload to R2 and get the key
            const key = await r2.store(ctx, blob, {
                type: file.type,
            });

            // Get the signed URL with 1 day expiration
            const url = await r2.getUrl(key, { expiresIn: 60 * 60 * 24 });

            // If projectId is provided, store in assets table
            if (projectId && projectId !== "null" && projectId !== "undefined") {
                // Determine asset type from MIME type
                let assetType: "video" | "audio" | "image" | "text" | "other" = "other";
                if (file.type.startsWith("video/")) assetType = "video";
                else if (file.type.startsWith("audio/")) assetType = "audio";
                else if (file.type.startsWith("image/")) assetType = "image";
                else if (file.type.startsWith("text/")) assetType = "text";

                const metadata: any = {
                    size: bytes.byteLength,
                    mimeType: file.type,
                };

                // Include generation metadata if provided
                if (generationPrompt && generationPrompt !== "null") {
                    metadata.generationPrompt = generationPrompt;
                }
                if (generationModel && generationModel !== "null") {
                    metadata.generationModel = generationModel;
                }
                if (generationParams && generationParams !== "null") {
                    try {
                        metadata.generationParams = JSON.parse(generationParams);
                    } catch (e) {
                        // If parsing fails, store as string
                        metadata.generationParams = generationParams;
                    }
                }

                await ctx.runMutation(api.assets.create, {
                    projectId: projectId as Id<"projects">,
                    name: file.name,
                    type: assetType,
                    url,
                    key,
                    category: category as "upload" | "artifact",
                    metadata,
                });
            }

            return new Response(JSON.stringify({
                key,
                url,
                name: file.name,
                contentType: file.type,
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            });

        } catch (error) {
            console.error("Upload error:", error);
            return new Response(JSON.stringify({
                error: error instanceof Error ? error.message : "Upload failed"
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }
    }),
    exposedHeaders: [...DEFAULT_EXPOSED_HEADERS],
});

export default http;
