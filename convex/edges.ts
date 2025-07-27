import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Create a new edge between two nodes
export const create = mutation({
    args: {
        projectId: v.id("projects"),
        sourceNodeId: v.id("nodes"),
        targetNodeId: v.id("nodes"),
    },
    returns: v.id("edges"),
    handler: async (ctx, args) => {
        // Check if edge already exists to prevent duplicates
        const existingEdge = await ctx.db
            .query("edges")
            .withIndex("by_source", (q) => q.eq("sourceNodeId", args.sourceNodeId))
            .filter((q) => q.eq(q.field("targetNodeId"), args.targetNodeId))
            .first();

        if (existingEdge) {
            return existingEdge._id;
        }

        const edgeId = await ctx.db.insert("edges", args);
        return edgeId;
    },
});

// Get all edges for a project
export const listByProject = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, { projectId }) => {
        const edges = await ctx.db
            .query("edges")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .collect();
        return edges;
    },
});

// Get edges where a specific node is the source
export const getOutgoingEdges = query({
    args: {
        nodeId: v.id("nodes"),
    },
    handler: async (ctx, { nodeId }) => {
        const edges = await ctx.db
            .query("edges")
            .withIndex("by_source", (q) => q.eq("sourceNodeId", nodeId))
            .collect();
        return edges;
    },
});

// Get edges where a specific node is the target
export const getIncomingEdges = query({
    args: {
        nodeId: v.id("nodes"),
    },
    handler: async (ctx, { nodeId }) => {
        const edges = await ctx.db
            .query("edges")
            .withIndex("by_target", (q) => q.eq("targetNodeId", nodeId))
            .collect();
        return edges;
    },
});

// Delete an edge
export const remove = mutation({
    args: {
        id: v.id("edges"),
    },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
    },
});

// Delete all edges connected to a node (useful when deleting nodes)
export const removeAllForNode = mutation({
    args: {
        nodeId: v.id("nodes"),
    },
    handler: async (ctx, { nodeId }) => {
        // Delete outgoing edges
        const outgoingEdges = await ctx.db
            .query("edges")
            .withIndex("by_source", (q) => q.eq("sourceNodeId", nodeId))
            .collect();

        for (const edge of outgoingEdges) {
            await ctx.db.delete(edge._id);
        }

        // Delete incoming edges
        const incomingEdges = await ctx.db
            .query("edges")
            .withIndex("by_target", (q) => q.eq("targetNodeId", nodeId))
            .collect();

        for (const edge of incomingEdges) {
            await ctx.db.delete(edge._id);
        }
    },
});

// Find the starting node for a project
export const getStartingNode = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, { projectId }) => {
        const startingNode = await ctx.db
            .query("nodes")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .filter((q) => q.eq(q.field("type"), "starting"))
            .first();
        return startingNode;
    },
});

// Get the main timeline path starting from the starting node
export const getTimelinePath = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, { projectId }): Promise<Doc<"nodes">[]> => {
        const startingNode = await ctx.db
            .query("nodes")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .filter((q) => q.eq(q.field("type"), "starting"))
            .first();

        if (!startingNode) {
            return [];
        }

        const path = [startingNode];
        let currentNode = startingNode;

        // Follow the chain of connections
        while (true) {
            const outgoingEdges = await ctx.db
                .query("edges")
                .withIndex("by_source", (q) => q.eq("sourceNodeId", currentNode._id))
                .collect();

            // If no outgoing edges or multiple edges (branching), stop here
            if (outgoingEdges.length !== 1) {
                break;
            }

            const nextNodeId = outgoingEdges[0].targetNodeId;
            const nextNode = await ctx.db.get(nextNodeId);

            if (!nextNode) {
                break;
            }

            path.push(nextNode);
            currentNode = nextNode;
        }

        return path;
    },
});

// Find the last node in the main timeline (for auto-linking new nodes)
export const getLastTimelineNode = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, { projectId }): Promise<Doc<"nodes"> | null> => {
        const timelinePath: Doc<"nodes">[] = await ctx.runQuery(api.edges.getTimelinePath, { projectId });

        if (timelinePath.length === 0) {
            return null;
        }

        return timelinePath[timelinePath.length - 1];
    },
});

// Auto-link a new node to the end of the timeline
export const autoLinkToTimeline = mutation({
    args: {
        projectId: v.id("projects"),
        newNodeId: v.id("nodes"),
    },
    handler: async (ctx, { projectId, newNodeId }): Promise<Id<"edges"> | undefined> => {
        const lastNode: Doc<"nodes"> | null = await ctx.runQuery(api.edges.getLastTimelineNode, { projectId });

        if (!lastNode) {
            return undefined;
        }

        const edgeId = await ctx.db.insert("edges", {
            projectId,
            sourceNodeId: lastNode._id,
            targetNodeId: newNodeId,
        });

        return edgeId;
    },
}); 