import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new artifact asset
export const create = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        type: v.union(
            v.literal("video"),
            v.literal("audio"),
            v.literal("image"),
            v.literal("text"),
            v.literal("other")
        ),
        url: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
        metadata: v.optional(v.object({
            duration: v.optional(v.number()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            size: v.optional(v.number()),
            mimeType: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("artifactAssets", args);
    },
});

// Get an artifact asset by ID
export const get = query({
    args: { id: v.id("artifactAssets") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// List all artifact assets for a project
export const listByProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("artifactAssets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();
    },
});

// List artifact assets by project and type
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
            .query("artifactAssets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .filter((q) => q.eq(q.field("type"), args.type))
            .order("desc")
            .collect();
    },
});

// Update an artifact asset
export const update = mutation({
    args: {
        id: v.id("artifactAssets"),
        name: v.optional(v.string()),
        url: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
        metadata: v.optional(v.object({
            duration: v.optional(v.number()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            size: v.optional(v.number()),
            mimeType: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    },
});

// Delete an artifact asset
export const remove = mutation({
    args: { id: v.id("artifactAssets") },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

// Generate a signed URL for an artifact asset if it uses Convex storage
export const getSignedUrl = query({
    args: { id: v.id("artifactAssets") },
    handler: async (ctx, args) => {
        const asset = await ctx.db.get(args.id);
        if (!asset || !asset.storageId) {
            return null;
        }
        return await ctx.storage.getUrl(asset.storageId);
    },
}); 