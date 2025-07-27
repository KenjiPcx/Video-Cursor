// convex/upload.ts
import { R2 } from "@convex-dev/r2";
import { components, api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
    checkUpload: async (ctx, bucket) => {
        // Ensure user is authenticated
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthorized");
        }
        // Don't return anything - function should return void
    },
    onUpload: async (ctx, key) => {
        // This runs when syncMetadata is called after the file is uploaded
        console.log("File uploaded with key:", key);
        // The actual asset creation will be handled in our custom upload hook
    },
});

// Store action for backward compatibility (for small files < 16 MiB)
export const store = action({
    args: {
        category: v.union(v.literal("upload"), v.literal("artifact")),
        filename: v.string(),
        mimeType: v.string(),
        bytes: v.bytes(),
        projectId: v.id("projects"), // Optional project to associate with
        // Optional generation metadata for AI-generated artifacts
        generationPrompt: v.optional(v.string()),
        generationModel: v.optional(v.string()),
        generationParams: v.optional(v.any()),
    },
    handler: async (ctx, {
        filename,
        mimeType,
        bytes,
        projectId,
        category,
        generationPrompt,
        generationModel,
        generationParams,
    }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthorized");
        }

        const blob = new Blob([bytes], { type: mimeType });

        // Upload to R2 and get the key
        const key = await r2.store(ctx, blob, {
            type: mimeType,
        });

        // Get the signed URL with 1 day expiration
        const url = await r2.getUrl(key, { expiresIn: 60 * 60 * 24 });

        // If projectId is provided, store in assets table
        // Determine asset type from MIME type
        let assetType: "video" | "audio" | "image" | "text" | "other" = "other";
        if (mimeType.startsWith("video/")) assetType = "video";
        else if (mimeType.startsWith("audio/")) assetType = "audio";
        else if (mimeType.startsWith("image/")) assetType = "image";
        else if (mimeType.startsWith("text/")) assetType = "text";

        const assetId: Id<"assets"> = await ctx.runMutation(api.assets.create, {
            projectId,
            name: filename,
            type: assetType,
            url,
            key,
            category,
            metadata: {
                size: bytes.byteLength,
                mimeType,
                // Include generation metadata if provided (for AI-generated artifacts)
                ...(generationPrompt && { generationPrompt }),
                ...(generationModel && { generationModel }),
                ...(generationParams && { generationParams }),
            },
        });

        // Schedule automatic content analysis for uploaded visual assets only  
        if (category === "upload" && (assetType === "video" || assetType === "image")) {
            await ctx.scheduler.runAfter(0, internal.assets.analyzeAsset, {
                assetId,
            });
        }

        return {
            assetId,
            key,
            url,
            name: filename,
            contentType: mimeType,
            metadata: {
                size: bytes.byteLength,
                mimeType,
                ...(generationPrompt && { generationPrompt }),
                ...(generationModel && { generationModel }),
                ...(generationParams && { generationParams }),
            },
        };
    },
});

// Create asset record after R2 upload
export const createAssetFromUpload = action({
    args: {
        key: v.string(),
        name: v.string(),
        type: v.string(),
        size: v.number(),
        projectId: v.id("projects"),
        category: v.union(v.literal("upload"), v.literal("artifact")),
        generationPrompt: v.optional(v.string()),
        generationModel: v.optional(v.string()),
        generationParams: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthorized");
        }

        // Get the URL for the uploaded file with 1 day expiration
        const url = await r2.getUrl(args.key, { expiresIn: 60 * 60 * 24 });

        // Determine asset type from MIME type
        let assetType: "video" | "audio" | "image" | "text" | "other" = "other";
        if (args.type.startsWith("video/")) assetType = "video";
        else if (args.type.startsWith("audio/")) assetType = "audio";
        else if (args.type.startsWith("image/")) assetType = "image";
        else if (args.type.startsWith("text/")) assetType = "text";

        // Create asset record
        await ctx.runMutation(api.assets.create, {
            projectId: args.projectId,
            name: args.name,
            type: assetType,
            url,
            key: args.key,
            category: args.category,
            metadata: {
                size: args.size,
                mimeType: args.type,
                // Include generation metadata if provided
                ...(args.generationPrompt && { generationPrompt: args.generationPrompt }),
                ...(args.generationModel && { generationModel: args.generationModel }),
                ...(args.generationParams && { generationParams: args.generationParams }),
            },
        });

        return { success: true };
    },
});