import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { vAsset } from "./validators";

// Create a new asset
export const create = mutation({
    args: vAsset,
    handler: async (ctx, args) => {
        return await ctx.db.insert("assets", args);
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