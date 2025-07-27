import { query, mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { vAsset } from "./validators";
import { api } from "./_generated/api";
import { r2 } from "./upload";
import { videoEditingAgent } from "./agents";
import { model } from "../lib/ai/models";
import { convertAttachmentsToContent } from "./chat";

// Create a new asset (decoupled from node creation)
export const create = mutation({
    args: vAsset,
    handler: async (ctx, args) => {
        // Just insert the asset - no automatic node creation
        const assetId = await ctx.db.insert("assets", args);
        return assetId;
    },
});



// Get an asset by ID
export const get = query({
    args: { id: v.id("assets") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Get an asset by R2 key
export const getByKey = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("assets")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
    },
});

// List all assets for a project
export const listByProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();
    },
});

// List assets by project and type
export const listByProjectAndType = query({
    args: {
        projectId: v.id("projects"),
        type: v.union(
            v.literal("video"),
            v.literal("audio"),
            v.literal("image"),
            v.literal("text"),
            v.literal("other")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .filter((q) => q.eq(q.field("type"), args.type))
            .order("desc")
            .collect();
    },
});

// Update an asset
export const update = mutation({
    args: {
        id: v.id("assets"),
        name: v.optional(v.string()),
        metadata: v.optional(v.object({
            duration: v.optional(v.number()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            size: v.optional(v.number()),
            mimeType: v.optional(v.string()),
            // Generation metadata for artifacts
            generationPrompt: v.optional(v.string()),
            generationModel: v.optional(v.string()),
            generationParams: v.optional(v.any()),
            analysis: v.optional(v.object({
                quickSummary: v.optional(v.string()),
                detailedSummary: v.optional(v.string()),
                analyzedAt: v.optional(v.number()),
                analysisModel: v.optional(v.string()),
            })),
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    },
});

// Delete an asset
export const remove = mutation({
    args: { id: v.id("assets") },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

// Refresh all URLs for a project's assets
export const refreshProjectUrls = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        // Get all assets for the project
        const assets = await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        let refreshedCount = 0;

        // Update each asset with a fresh URL
        for (const asset of assets) {
            try {
                // Generate fresh URL with 1 day expiration
                const freshUrl = await r2.getUrl(asset.key, { expiresIn: 60 * 60 * 24 });

                // Update the asset with the new URL
                await ctx.db.patch(asset._id, { url: freshUrl });
                refreshedCount++;
            } catch (error) {
                console.error(`Failed to refresh URL for asset ${asset._id}:`, error);
                // Continue with other assets even if one fails
            }
        }

        return {
            message: `Refreshed ${refreshedCount} asset URLs`,
            refreshedCount,
            totalAssets: assets.length
        };
    },
});

// Analyze uploaded asset content using Gemini
export const analyzeAsset = internalAction({
    args: {
        assetId: v.id("assets"),
    },
    handler: async (ctx, args) => {
        try {
            const asset = await ctx.runQuery(api.assets.get, { id: args.assetId });
            if (!asset) {
                throw new Error("Asset not found");
            }

            // Only analyze visual content
            if (!asset.type || !["image", "video"].includes(asset.type)) {
                return;
            }

            console.log(`Analyzing ${asset.type}: ${asset.name}`);

            const prompt = asset.type === "image"
                ? `Analyze this image and provide a QUICK SUMMARY (2-3 sentences) and DETAILED SUMMARY describing visual elements, composition, subjects, lighting, mood, and any notable features.`
                : `Analyze this video and provide a QUICK SUMMARY (2-3 sentences) and DETAILED SUMMARY with timestamps describing scenes, actions, visual elements, and key moments.`;

            const result = await videoEditingAgent.generateText(ctx, {}, {
                model,
                messages: [{
                    role: "user",
                    content: convertAttachmentsToContent([{
                        contentType: asset.metadata?.mimeType,
                        url: asset.url,
                    }], prompt)
                }],
            });

            // Update asset with analysis
            const currentMetadata = asset.metadata || {};
            await ctx.runMutation(api.assets.update, {
                id: args.assetId,
                metadata: {
                    ...currentMetadata,
                    analysis: {
                        quickSummary: result.text.substring(0, 200),
                        detailedSummary: result.text,
                        analyzedAt: Date.now(),
                        analysisModel: "gemini-2.5-pro",
                    }
                }
            });

            console.log(`Analyzed ${asset.type}: ${asset.name}`);
        } catch (error) {
            console.error("Failed to analyze asset:", error);
        }
    },
}); 