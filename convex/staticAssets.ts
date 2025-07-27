import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { vStaticAsset } from "./validators";

// Create a new static asset
export const create = mutation({
    args: vStaticAsset,
    handler: async (ctx, args) => {
        return await ctx.db.insert("staticAssets", args);
    },
});

// Get a static asset by ID
export const get = query({
    args: { id: v.id("staticAssets") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// List all static assets
export const list = query({
    args: {},
    handler: async (ctx, args) => {
        return await ctx.db.query("staticAssets").order("desc").collect();
    },
});

// List static assets by type
export const listByType = query({
    args: {
        type: v.union(
            v.literal("video"),
            v.literal("audio"),
            v.literal("image"),
            v.literal("text"),
            v.literal("template"),
            v.literal("other")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("staticAssets")
            .withIndex("by_type", (q) => q.eq("type", args.type))
            .order("desc")
            .collect();
    },
});

// Search static assets by tags
export const searchByTags = query({
    args: { tags: v.array(v.string()) },
    handler: async (ctx, args) => {
        const assets = await ctx.db.query("staticAssets").collect();

        return assets.filter(asset => {
            if (!asset.tags || asset.tags.length === 0) return false;
            return args.tags.some(tag => asset.tags!.includes(tag));
        });
    },
});

// Search static assets by name (partial match)
export const searchByName = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const assets = await ctx.db.query("staticAssets").collect();
        const lowerSearchTerm = args.searchTerm.toLowerCase();

        return assets.filter(asset =>
            asset.name.toLowerCase().includes(lowerSearchTerm)
        );
    },
});

// Update a static asset
export const update = mutation({
    args: {
        id: v.id("staticAssets"),
        name: v.optional(v.string()),
        url: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
        tags: v.optional(v.array(v.string())),
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

// Delete a static asset
export const remove = mutation({
    args: { id: v.id("staticAssets") },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

// Get unique tags across all static assets
export const getAllTags = query({
    args: {},
    handler: async (ctx, args) => {
        const assets = await ctx.db.query("staticAssets").collect();
        const allTags = assets.flatMap(asset => asset.tags || []);
        return [...new Set(allTags)].sort();
    },
}); 