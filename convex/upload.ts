// convex/upload.ts
import { R2 } from "@convex-dev/r2";
import { components, api } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
    checkUpload: async (ctx, bucket) => {
        // const user = await userFromAuth(ctx);
        // ...validate that the user can upload to this bucket
    },
    onUpload: async (ctx, key) => {
        // ...do something with the key
        // Runs in the `syncMetadata` mutation, before the upload is performed from the
        // client side. Convenient way to create relations between the newly created
        // object key and other data in your Convex database. Runs after the `checkUpload`
        // callback.
    },
});

export const store = action({
    args: {
        filename: v.string(),
        mimeType: v.string(),
        bytes: v.bytes(),
        projectId: v.optional(v.id("projects")), // Optional project to associate with
    },
    handler: async (ctx, { filename, mimeType, bytes, projectId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthorized");
        }

        const blob = new Blob([bytes], { type: mimeType });

        // Upload to R2 and get the key
        const key = await r2.store(ctx, blob, {
            type: mimeType,
        });

        // Get the signed URL
        const url = await r2.getUrl(key);

        // If projectId is provided, store in assets table
        if (projectId) {
            // Determine asset type from MIME type
            let assetType: "video" | "audio" | "image" | "text" | "other" = "other";
            if (mimeType.startsWith("video/")) assetType = "video";
            else if (mimeType.startsWith("audio/")) assetType = "audio";
            else if (mimeType.startsWith("image/")) assetType = "image";
            else if (mimeType.startsWith("text/")) assetType = "text";

            await ctx.runMutation(api.assets.create, {
                projectId,
                name: filename,
                type: assetType,
                url,
                key,
                metadata: {
                    size: bytes.byteLength,
                    mimeType,
                },
            });
        }

        return {
            key,
            url,
            name: filename,
            contentType: mimeType,
        };
    },
});