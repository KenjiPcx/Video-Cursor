import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new project
export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("in-progress"),
            v.literal("completed")
        )),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("projects", {
            name: args.name,
            description: args.description,
            status: args.status || "draft",
            updatedAt: Date.now(),
        });
    },
});

// Get a project by ID
export const get = query({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// List all projects
export const list = query({
    args: {},
    handler: async (ctx, args) => {
        return await ctx.db.query("projects").order("desc").collect();
    },
});

// List projects by status
export const listByStatus = query({
    args: {
        status: v.union(
            v.literal("draft"),
            v.literal("in-progress"),
            v.literal("completed")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("projects")
            .filter((q) => q.eq(q.field("status"), args.status))
            .order("desc")
            .collect();
    },
});

// Update a project
export const update = mutation({
    args: {
        id: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("in-progress"),
            v.literal("completed")
        )),
        timelineData: v.optional(v.array(v.object({
            type: v.union(v.literal("video"), v.literal("audio")),
            main: v.boolean(),
            items: v.array(v.object({
                assetUrl: v.string(),
                assetId: v.optional(v.union(v.id("artifactAssets"), v.id("staticAssets"))),
                assetStartTime: v.number(),
                assetEndTime: v.number(),
                timelineStartTime: v.number(),
                timelineEndTime: v.number(),
                volume: v.optional(v.number()),
                opacity: v.optional(v.number()),
                effects: v.optional(v.array(v.object({
                    type: v.string(),
                    parameters: v.any(),
                }))),
            })),
        }))),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

// Delete a project
export const remove = mutation({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        // Also delete all artifact assets for this project
        const assets = await ctx.db
            .query("artifactAssets")
            .withIndex("by_project", (q) => q.eq("projectId", args.id))
            .collect();

        for (const asset of assets) {
            await ctx.db.delete(asset._id);
        }

        return await ctx.db.delete(args.id);
    },
}); 