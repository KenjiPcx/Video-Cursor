import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Link a thread to a project
export const linkThreadToProject = mutation({
    args: {
        threadId: v.string(),
        projectId: v.id("projects"),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("threadMetadata", {
            threadId: args.threadId,
            projectId: args.projectId,
            title: args.title,
        });
    },
});

// Get all threads for a project
export const getThreadsForProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("threadMetadata")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();
    },
});

// Get thread metadata by threadId
export const getByThreadId = query({
    args: { threadId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("threadMetadata")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .unique();
    },
});

// Update thread title
export const updateThreadTitle = mutation({
    args: {
        threadId: v.string(),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const threadMeta = await ctx.db
            .query("threadMetadata")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .unique();

        if (!threadMeta) {
            throw new Error("Thread metadata not found");
        }

        return await ctx.db.patch(threadMeta._id, {
            title: args.title,
        });
    },
});

// Remove thread metadata (when thread is deleted)
export const removeThreadMetadata = mutation({
    args: { threadId: v.string() },
    handler: async (ctx, args) => {
        const threadMeta = await ctx.db
            .query("threadMetadata")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .unique();

        if (threadMeta) {
            return await ctx.db.delete(threadMeta._id);
        }

        return null;
    },
}); 