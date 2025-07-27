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

  threadMetadata: defineTable({
    threadId: v.string(),
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    updateThreadTitleScheduledFunctionId: v.optional(v.id("_scheduled_functions")),
  }).index("by_project", ["projectId"])
    .index("by_thread", ["threadId"]),
});
