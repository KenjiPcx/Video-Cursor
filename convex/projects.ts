import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { vHiddenProjectContext, vProject } from "./validators";

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
        context: v.optional(vHiddenProjectContext),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("projects", {
            name: args.name,
            description: args.description,
            status: args.status || "draft",
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
        ...vProject.fields,
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    },
});

// Delete a project
export const remove = mutation({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        // Also delete all assets for this project
        const assets = await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", args.id))
            .collect();

        for (const asset of assets) {
            await ctx.db.delete(asset._id);
        }

        return await ctx.db.delete(args.id);
    },
});
