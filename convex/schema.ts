import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { vAsset, vProject, vStaticAsset } from "./validators";

export default defineSchema({
  ...authTables,
  projects: defineTable(vProject),

  assets: defineTable(vAsset)
    .index("by_project", ["projectId"])
    .index("by_key", ["key"]),

  staticAssets: defineTable(vStaticAsset)
    .index("by_type", ["type"])
    .index("by_tags", ["tags"])
    .index("by_key", ["key"]),

  // Video editor graph nodes
  nodes: defineTable({
    projectId: v.id("projects"),
    type: v.union(v.literal("starting"), v.literal("draft"), v.literal("videoAsset"), v.literal("imageAsset"), v.literal("generatingAsset")),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    data: v.any(), // Flexible data structure for different node types
  }).index("by_project", ["projectId"]),

  // Video editor graph edges (connections between nodes)
  edges: defineTable({
    projectId: v.id("projects"),
    sourceNodeId: v.id("nodes"),
    targetNodeId: v.id("nodes"),
  }).index("by_project", ["projectId"])
    .index("by_source", ["sourceNodeId"])
    .index("by_target", ["targetNodeId"]),

  threadMetadata: defineTable({
    threadId: v.string(),
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    updateThreadTitleScheduledFunctionId: v.optional(v.id("_scheduled_functions")),
  }).index("by_project", ["projectId"])
    .index("by_thread", ["threadId"]),
});
