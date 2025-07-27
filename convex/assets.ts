import { query, mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { vAsset } from "./validators";
import { api } from "./_generated/api";
import { r2 } from "./upload";
import { videoEditingAgent } from "./agents";
import { model } from "../lib/ai/models";
import { convertAttachmentsToContent } from "./chat";
import OpenAI from "openai";
import { generateText } from "ai";

// Create a new asset (decoupled from node creation)
export const create = mutation({
    args: vAsset,
    handler: async (ctx, args) => {
        // Just insert the asset - no automatic node creation
        const assetId = await ctx.db.insert("assets", args);
        return assetId;
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
        description: v.optional(v.string()),
        metadata: v.optional(v.object({
            duration: v.optional(v.number()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            size: v.optional(v.number()),
            mimeType: v.optional(v.string()),
            // Generation metadata for artifacts
            generationPrompt: v.optional(v.string()),
            generationModel: v.optional(v.string()),
            generationParams: v.optional(v.any()),
            analysis: v.optional(v.object({
                quickSummary: v.optional(v.string()),
                detailedSummary: v.optional(v.string()),
                analyzedAt: v.optional(v.number()),
                analysisModel: v.optional(v.string()),
            })),
            transcription: v.optional(v.object({
                srt: v.string(),              // Full SRT format content
                rawTranscription: v.any(),    // Raw Whisper API response
                duration: v.number(),         // Audio duration from Whisper
                transcribedAt: v.number(),    // Timestamp when transcribed
                model: v.string(),           // "whisper-1"
            })),
            // Video splitting metadata
            trimStart: v.optional(v.number()), // Start time for trimmed segments (seconds)
            trimEnd: v.optional(v.number()),   // End time for trimmed segments (seconds)
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    },
});

// Update asset description
export const updateDescription = mutation({
    args: {
        id: v.id("assets"),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.id, { description: args.description });
    },
});

// Delete an asset
export const remove = mutation({
    args: { id: v.id("assets") },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

// Refresh all URLs for a project's assets
export const refreshProjectUrls = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        // Get all assets for the project
        const assets = await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        let refreshedCount = 0;

        // Update each asset with a fresh URL
        for (const asset of assets) {
            try {
                // Generate fresh URL with 1 day expiration
                const freshUrl = await r2.getUrl(asset.key, { expiresIn: 60 * 60 * 24 });

                // Update the asset with the new URL
                await ctx.db.patch(asset._id, { url: freshUrl });
                refreshedCount++;
            } catch (error) {
                console.error(`Failed to refresh URL for asset ${asset._id}:`, error);
                // Continue with other assets even if one fails
            }
        }

        return {
            message: `Refreshed ${refreshedCount} asset URLs`,
            refreshedCount,
            totalAssets: assets.length
        };
    },
});

// Helper function to convert Whisper word timestamps to SRT format with 5-second groupings
function convertToSRT(words: any[]): string {
    if (!words || words.length === 0) return "";

    const captions: { start: number; end: number; text: string }[] = [];
    let currentCaption = { start: words[0].start, end: words[0].end, text: words[0].word };

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const timeDiff = word.start - currentCaption.start;

        // If we've reached 5 seconds or this is the last word, finalize current caption
        if (timeDiff >= 5.0 || i === words.length - 1) {
            currentCaption.end = word.end;
            if (i === words.length - 1) {
                currentCaption.text += ` ${word.word}`;
            }
            captions.push(currentCaption);

            // Start new caption if not the last word
            if (i < words.length - 1) {
                currentCaption = { start: word.start, end: word.end, text: word.word };
            }
        } else {
            // Add word to current caption
            currentCaption.text += ` ${word.word}`;
            currentCaption.end = word.end;
        }
    }

    // Convert to SRT format
    return captions.map((caption, index) => {
        const startTime = formatSRTTime(caption.start);
        const endTime = formatSRTTime(caption.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text.trim()}\n`;
    }).join('\n');
}

// Helper function to format time for SRT (HH:MM:SS,mmm)
function formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

const openai = new OpenAI();

// Analyze uploaded asset content using Gemini and transcribe videos using Whisper
export const analyzeAsset = internalAction({
    args: {
        assetId: v.id("assets"),
    },
    handler: async (ctx, args) => {
        try {
            const asset = await ctx.runQuery(api.assets.get, { id: args.assetId });
            if (!asset) {
                throw new Error("Asset not found");
            }

            // Only analyze visual content
            if (!asset.type || !["image", "video"].includes(asset.type)) {
                return;
            }

            console.log(`Analyzing ${asset.type}: ${asset.name}`);

            // Run visual analysis and transcription in parallel for videos
            const tasks = [];

            // Visual analysis task
            const prompt = asset.type === "image"
                ? `Analyze this image and provide a QUICK SUMMARY (2-3 sentences) and DETAILED SUMMARY describing visual elements, composition, subjects, lighting, mood, and any notable features.`
                : `Analyze this video and provide a QUICK SUMMARY (2-3 sentences) and DETAILED SUMMARY with timestamps describing scenes, actions, visual elements, and key moments.`;

            const analysisTask = generateText({
                model,
                messages: [{
                    role: "user",
                    content: convertAttachmentsToContent([{
                        contentType: asset.metadata?.mimeType,
                        url: asset.url,
                    }], prompt)
                }],
            });
            tasks.push(analysisTask);

            // Transcription task for videos only
            let transcriptionTask: Promise<any> | null = null;
            if (asset.type === "video") {
                console.log(`Transcribing video: ${asset.name}`);
                transcriptionTask = (async () => {
                    try {
                        console.log(`Fetching video file from: ${asset.url}`);
                        const response = await fetch(asset.url);

                        if (!response.ok) {
                            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                        }

                        const blob = await response.blob();
                        console.log(`Video blob size: ${blob.size} bytes, type: ${blob.type}`);

                        if (blob.size === 0) {
                            throw new Error("Video file is empty");
                        }

                        // Create a proper File object for OpenAI API
                        const file = new File([blob], asset.name, {
                            type: blob.type || asset.metadata?.mimeType || 'video/mp4'
                        });

                        console.log(`Created file object: ${file.name}, size: ${file.size}, type: ${file.type}`);

                        return await openai.audio.transcriptions.create({
                            file: file as any,
                            model: "whisper-1",
                            response_format: "verbose_json",
                            timestamp_granularities: ["word"],
                        });
                    } catch (error) {
                        console.error(`Transcription setup failed for ${asset.name}:`, error);
                        throw error;
                    }
                })();
                tasks.push(transcriptionTask);
            }

            // Wait for all tasks to complete
            const results = await Promise.allSettled(tasks);

            // Process visual analysis result
            const analysisResult = results[0];
            let analysisData = null;
            if (analysisResult.status === "fulfilled") {
                const result = analysisResult.value;
                console.log(`Visual analysis completed for ${asset.name}`);

                if (result && result.text) {
                    analysisData = {
                        quickSummary: result.text.substring(0, 200),
                        detailedSummary: result.text,
                        analyzedAt: Date.now(),
                        analysisModel: "gemini-2.5-pro",
                    };
                    console.log(`Analysis data created: ${analysisData.quickSummary}`);
                } else {
                    console.error("Visual analysis result missing text:", result);
                }
            } else {
                console.error("Visual analysis failed:", analysisResult.reason);
            }

            // Process transcription result for videos
            let transcriptionData = null;
            if (asset.type === "video" && transcriptionTask && results[1]) {
                const transcriptionResult = results[1];
                if (transcriptionResult.status === "fulfilled") {
                    const transcription = transcriptionResult.value;
                    console.log(`Transcription completed for ${asset.name}:`, {
                        duration: transcription.duration,
                        wordCount: transcription.words?.length || 0,
                        hasWords: !!transcription.words
                    });

                    const srt = convertToSRT(transcription.words || []);
                    transcriptionData = {
                        srt,
                        rawTranscription: transcription,
                        duration: transcription.duration,
                        transcribedAt: Date.now(),
                        model: "whisper-1",
                    };
                    console.log(`Successfully created transcription data for ${asset.name} (${transcription.duration}s)`);
                } else {
                    console.error(`Transcription failed for ${asset.name}:`, transcriptionResult.reason);
                    // Continue processing even if transcription fails - we can still save visual analysis
                }
            }

            // Update asset with analysis and transcription
            const currentMetadata = asset.metadata || {};
            const updatedMetadata = {
                ...currentMetadata,
                ...(analysisData && { analysis: analysisData }),
                ...(transcriptionData && { transcription: transcriptionData }),
            };

            // Only update if we have new data to add
            if (analysisData || transcriptionData) {
                await ctx.runMutation(api.assets.update, {
                    id: args.assetId,
                    metadata: updatedMetadata
                });

                const completedTasks = [];
                if (analysisData) completedTasks.push("visual analysis");
                if (transcriptionData) completedTasks.push("transcription");

                console.log(`Successfully completed ${completedTasks.join(" and ")} for ${asset.type}: ${asset.name}`);
            } else {
                console.warn(`No analysis data generated for ${asset.type}: ${asset.name} - asset not updated`);
            }
        } catch (error) {
            console.error("Failed to analyze asset:", error);
        }
    },
}); 