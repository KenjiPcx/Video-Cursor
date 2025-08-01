"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import Replicate from "replicate";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY!
});

// Fire-and-forget scheduling actions (called by agent tools)
export const scheduleRunwayImageGeneration = action({
    args: {
        projectId: v.id("projects"),
        prompt: v.string(),
        aspectRatio: v.optional(v.string()),
        referenceTags: v.optional(v.array(v.string())),
        referenceImages: v.optional(v.array(v.string())),
        name: v.optional(v.string()),
        resolution: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const name = args.name || `Generated Image - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: "image",
            generationModel: "black-forest-labs/flux-kontext-pro",
            generationPrompt: args.prompt,
            generationParams: {
                aspectRatio: args.aspectRatio,
                referenceTags: args.referenceTags,
                referenceImages: args.referenceImages,
                resolution: args.resolution,
            },
        });

        // Schedule background generation immediately
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateRunwayImage, {
            nodeId,
            projectId: args.projectId,
            prompt: args.prompt,
            aspectRatio: args.aspectRatio || "16:9",
            referenceTags: args.referenceTags || [],
            referenceImages: args.referenceImages || [],
            name: name,
            resolution: args.resolution || "1080p",
        });

        return {
            success: true,
            message: "Image generation started! It will appear in your assets when ready.",
        };
    },
});

export const scheduleFluxImageGeneration = action({
    args: {
        projectId: v.id("projects"),
        prompt: v.string(),
        inputImage: v.optional(v.string()),
        aspectRatio: v.optional(v.string()),
        outputFormat: v.optional(v.string()),
        safetyTolerance: v.optional(v.number()),
        promptUpsampling: v.optional(v.boolean()),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("Flux image generation started", args);
        const name = args.name || `Generated Image - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: "image",
            generationModel: "black-forest-labs/flux-kontext-pro",
            generationPrompt: args.prompt,
            generationParams: {
                inputImage: args.inputImage,
                aspectRatio: args.aspectRatio,
                outputFormat: args.outputFormat || "jpg",
                safetyTolerance: args.safetyTolerance,
                promptUpsampling: args.promptUpsampling,
            },
        });

        // Schedule background generation with the nodeId
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateFluxImage, {
            nodeId,
            projectId: args.projectId,
            prompt: args.prompt,
            inputImage: args.inputImage,
            aspectRatio: args.aspectRatio,
            outputFormat: args.outputFormat || "jpg",
            safetyTolerance: args.safetyTolerance,
            promptUpsampling: args.promptUpsampling,
            name,
        });

        return {
            success: true,
            message: "Image transformation started! It will appear in your assets when ready.",
            nodeId: nodeId,
        };
    },
});

export const scheduleHailuoVideoGeneration = action({
    args: {
        projectId: v.id("projects"),
        prompt: v.string(),
        promptOptimizer: v.optional(v.boolean()),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const name = args.name || `Generated Video - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: "video",
            generationModel: "minimax/hailuo-02",
            generationPrompt: args.prompt,
            generationParams: {
                promptOptimizer: args.promptOptimizer ?? false,
            },
        });

        // Schedule background generation with the nodeId
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateHailuoVideo, {
            nodeId,
            projectId: args.projectId,
            prompt: args.prompt,
            promptOptimizer: args.promptOptimizer ?? false,
            name,
        });

        return {
            success: true,
            message: "Video generation started! This may take 2-3 minutes. It will appear in your assets when ready.",
            nodeId: nodeId,
        };
    },
});

export const scheduleFishAudioGeneration = action({
    args: {
        projectId: v.id("projects"),
        text: v.string(),
        model: v.optional(v.string()),
        name: v.optional(v.string()),
        referenceId: v.string(),
    },
    handler: async (ctx, args) => {
        const name = args.name || `Generated Voice - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: "audio",
            generationModel: "fish-audio-s1",
            generationPrompt: args.text,
            generationParams: {
                model: "s1",
                referenceId: args.referenceId,
            },
        });

        // Schedule background generation with the nodeId
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateFishAudio, {
            nodeId,
            projectId: args.projectId,
            text: args.text,
            model: "s1",
            name,
            referenceId: args.referenceId,
        });

        return {
            success: true,
            message: "Voice generation started! It will appear in your assets when ready.",
            nodeId: nodeId,
        };
    },
});

export const scheduleRunwayCharacterControl = action({
    args: {
        projectId: v.id("projects"),
        characterType: v.union(v.literal("image"), v.literal("video")),
        characterUrl: v.string(),
        referenceVideoUrl: v.string(),
        ratio: v.optional(v.string()),
        bodyControl: v.optional(v.boolean()),
        expressionIntensity: v.optional(v.number()),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const name = args.name || `Character Animation - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: "video",
            generationModel: "runway-character-control",
            generationPrompt: `Animate character with reference performance`,
            generationParams: {
                characterType: args.characterType,
                characterUrl: args.characterUrl,
                referenceVideoUrl: args.referenceVideoUrl,
                ratio: args.ratio || "1280:720",
                bodyControl: args.bodyControl ?? true,
                expressionIntensity: args.expressionIntensity || 3,
            },
        });

        // Schedule background generation with the nodeId
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateRunwayCharacterControl, {
            nodeId,
            projectId: args.projectId,
            characterType: args.characterType,
            characterUrl: args.characterUrl,
            referenceVideoUrl: args.referenceVideoUrl,
            ratio: args.ratio || "1280:720",
            bodyControl: args.bodyControl ?? true,
            expressionIntensity: args.expressionIntensity || 3,
            name,
        });

        return {
            success: true,
            message: "Character animation started! This may take 2-5 minutes. It will appear in your assets when ready.",
            nodeId: nodeId,
        };
    },
});

export const scheduleVideoBackgroundRemoval = action({
    args: {
        projectId: v.id("projects"),
        sourceAssetId: v.string(),
        sourceVideoUrl: v.string(),
        assetType: v.union(v.literal("image"), v.literal("video")),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const assetTypeText = args.assetType === "video" ? "Video" : "Image";
        const name = args.name || `Background Removed ${assetTypeText} - ${new Date().toISOString()}`;

        // Create loading node immediately for instant feedback
        const nodeId = await ctx.runMutation(api.nodes.createGeneratingNode, {
            projectId: args.projectId,
            name,
            expectedType: args.assetType,
            generationModel: args.assetType === "video" ? "nateraw/video-background-remover" : "lucataco/remove-bg",
            generationPrompt: `Remove background from ${args.assetType}: ${args.sourceAssetId}`,
            generationParams: {
                sourceAssetId: args.sourceAssetId,
                sourceAssetUrl: args.sourceVideoUrl,
                assetType: args.assetType,
            },
        });

        // Schedule background generation
        await ctx.scheduler.runAfter(0, internal.aiGeneration.generateVideoBackgroundRemoval, {
            nodeId,
            projectId: args.projectId,
            sourceAssetId: args.sourceAssetId,
            sourceAssetUrl: args.sourceVideoUrl,
            assetType: args.assetType,
            name,
        });

        return {
            success: true,
            message: `${assetTypeText} background removal started! The processed ${args.assetType} will appear in your assets when ready.`,
        };
    },
});

export const listFishAudioModels = action({
    args: {
        pageSize: v.optional(v.number()),
        pageNumber: v.optional(v.number()),
        title: v.optional(v.string()),
        tag: v.optional(v.string()),
        language: v.optional(v.string()),
        sortBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        try {
            const fishApiKey = process.env.FISH_AUDIO_API_KEY;
            if (!fishApiKey) {
                throw new Error("FISH_AUDIO_API_KEY environment variable not set");
            }

            // Build query parameters
            const params = new URLSearchParams();
            if (args.pageSize) params.append('page_size', args.pageSize.toString());
            if (args.pageNumber) params.append('page_number', args.pageNumber.toString());
            if (args.title) params.append('title', args.title);
            if (args.tag) params.append('tag', args.tag);
            if (args.language) params.append('language', args.language);
            if (args.sortBy) params.append('sort_by', args.sortBy);

            const response = await fetch(`https://api.fish.audio/model?${params.toString()}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${fishApiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Fish Audio API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                models: data.items || [],
                total: data.total || 0,
                message: `Found ${data.total || 0} voice models`,
            };
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Failed to list Fish Audio models:", error);
                return {
                    success: false,
                    models: [],
                    total: 0,
                    message: `Failed to fetch voice models: ${error.message}`,
                };
            }
            return {
                success: false,
                models: [],
                total: 0,
                message: "Failed to fetch voice models",
            };
        }
    },
});

// Internal background generation actions (scheduled by the above actions)
export const generateRunwayImage = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        prompt: v.string(),
        aspectRatio: v.string(),
        referenceTags: v.array(v.string()),
        referenceImages: v.array(v.string()),
        name: v.string(),
        resolution: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting Runway image generation for project ${args.projectId}`);

            const input = {
                prompt: args.prompt,
                resolution: args.resolution,
                aspect_ratio: args.aspectRatio,
                reference_tags: args.referenceTags,
                reference_images: args.referenceImages,
            };
            console.log(input);

            const output: any = await replicate.run("runwayml/gen4-image", {
                input,
            }, (prediction) => {
                console.log(prediction);
            });

            console.log("Runway generation complete, output:", output);

            // Fetch the image from the URL and convert to bytes
            const imageResponse = await fetch(output.url());
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
            }
            const imageBytes = await imageResponse.arrayBuffer();

            // Save to R2 and assets table in one call
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType: "image/png",
                bytes: imageBytes,
                projectId: args.projectId,
                generationPrompt: args.prompt,
                generationModel: "runwayml/gen4-image",
                generationParams: input,
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully generated Runway image for project ${args.projectId}`);
        } catch (error) {
            console.error("Failed to generate Runway image:", error);
            // Could optionally save error state to assets table or send notification
        }
    },
});

export const generateFluxImage = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        prompt: v.string(),
        inputImage: v.optional(v.string()),
        aspectRatio: v.optional(v.string()),
        outputFormat: v.string(),
        safetyTolerance: v.optional(v.number()),
        promptUpsampling: v.optional(v.boolean()),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting Flux image generation for project ${args.projectId}, node ${args.nodeId}`);

            const input = {
                prompt: args.prompt,
                output_format: args.outputFormat,
                ...(args.inputImage && { input_image: args.inputImage }),
                ...(args.aspectRatio && { aspect_ratio: args.aspectRatio }),
                ...(args.safetyTolerance !== undefined && { safety_tolerance: args.safetyTolerance }),
                ...(args.promptUpsampling !== undefined && { prompt_upsampling: args.promptUpsampling }),
            };

            const output: any = await replicate.run("black-forest-labs/flux-kontext-pro", {
                input
            });

            console.log("Flux generation complete, output:", output);

            // Fetch the image from the URL and convert to bytes
            const imageResponse = await fetch(output.url());
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
            }
            const imageBytes = await imageResponse.arrayBuffer();

            // Save to R2 and assets table (no automatic node creation)
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType: args.outputFormat === "png" ? "image/png" : "image/jpeg",
                bytes: imageBytes,
                projectId: args.projectId,
                generationPrompt: args.prompt,
                generationModel: "black-forest-labs/flux-kontext-pro",
                generationParams: input,
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully generated Flux image for project ${args.projectId}, node ${args.nodeId}`);
        } catch (error) {
            console.error("Failed to generate Flux image:", error);
            // TODO: Update node to error state
        }
    },
});

export const generateHailuoVideo = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        prompt: v.string(),
        promptOptimizer: v.boolean(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting Hailuo video generation for project ${args.projectId}, node ${args.nodeId}`);

            const input = {
                prompt: args.prompt,
                prompt_optimizer: args.promptOptimizer,
            };

            const output: any = await replicate.run("minimax/hailuo-02", {
                input
            });

            console.log("Hailuo generation complete, output:", output);

            // Fetch the video from the URL and convert to bytes
            const videoResponse = await fetch(output.url());
            if (!videoResponse.ok) {
                throw new Error(`Failed to fetch generated video: ${videoResponse.status}`);
            }
            const videoBytes = await videoResponse.arrayBuffer();

            // Save to R2 and assets table (no automatic node creation)
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType: "video/mp4",
                bytes: videoBytes,
                projectId: args.projectId,
                generationPrompt: args.prompt,
                generationModel: "minimax/hailuo-02",
                generationParams: input,
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully generated Hailuo video for project ${args.projectId}, node ${args.nodeId}`);
        } catch (error) {
            console.error("Failed to generate Hailuo video:", error);
            // TODO: Update node to error state
        }
    },
});

export const generateFishAudio = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        text: v.string(),
        model: v.string(),
        name: v.string(),
        referenceId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting Fish Audio generation for project ${args.projectId}, node ${args.nodeId}`);

            const fishApiKey = process.env.FISH_AUDIO_API_KEY;
            if (!fishApiKey) {
                throw new Error("FISH_AUDIO_API_KEY environment variable not set");
            }

            const response = await fetch("https://api.fish.audio/v1/tts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${fishApiKey}`,
                    "Content-Type": "application/json",
                    "model": args.model,
                },
                body: JSON.stringify({
                    text: args.text,
                    reference_id: args.referenceId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Fish Audio API error: ${response.status} ${response.statusText}`);
            }

            const audioBytes = await response.arrayBuffer();

            // Save to R2 and assets table (no automatic node creation)
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType: "audio/wav",
                bytes: audioBytes,
                projectId: args.projectId,
                generationPrompt: args.text,
                generationModel: `fish-audio-${args.model}`,
                generationParams: { text: args.text, model: args.model },
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully generated Fish Audio for project ${args.projectId}, node ${args.nodeId}`);
        } catch (error) {
            console.error("Failed to generate Fish Audio:", error);
            // TODO: Update node to error state
        }
    },
});

export const generateRunwayCharacterControl = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        characterType: v.union(v.literal("image"), v.literal("video")),
        characterUrl: v.string(),
        referenceVideoUrl: v.string(),
        ratio: v.string(),
        bodyControl: v.boolean(),
        expressionIntensity: v.number(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting Runway Character Control generation for project ${args.projectId}, node ${args.nodeId}`);

            const runwayApiKey = process.env.RUNWAY_API_KEY;
            if (!runwayApiKey) {
                throw new Error("RUNWAY_API_KEY environment variable not set");
            }

            const requestBody = {
                model: "act_two",
                character: {
                    type: args.characterType,
                    uri: args.characterUrl,
                },
                reference: {
                    type: "video",
                    uri: args.referenceVideoUrl,
                },
                ratio: args.ratio,
                bodyControl: args.bodyControl,
                expressionIntensity: args.expressionIntensity,
                contentModeration: {
                    publicFigureThreshold: "auto",
                },
            };

            const response = await fetch("https://api.runwayml.com/v1/character_performance", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${runwayApiKey}`,
                    "Content-Type": "application/json",
                    "X-Runway-Version": "2024-11-06",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Runway API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const task = await response.json();
            console.log(`Runway task created: ${task.id}`);

            // Poll for completion
            let taskResult;
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes with 5-second intervals

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

                const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${task.id}`, {
                    headers: {
                        "Authorization": `Bearer ${runwayApiKey}`,
                        "X-Runway-Version": "2024-11-06",
                    },
                });

                if (!statusResponse.ok) {
                    throw new Error(`Failed to check task status: ${statusResponse.status}`);
                }

                taskResult = await statusResponse.json();

                if (taskResult.status === "SUCCEEDED") {
                    break;
                } else if (taskResult.status === "FAILED") {
                    throw new Error(`Runway task failed: ${taskResult.failureReason || "Unknown error"}`);
                }

                attempts++;
            }

            if (!taskResult || taskResult.status !== "SUCCEEDED") {
                throw new Error("Runway task timed out or failed to complete");
            }

            // Download the generated video
            const videoUrl = taskResult.output?.[0];
            if (!videoUrl) {
                throw new Error("No output video URL found in task result");
            }

            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
                throw new Error(`Failed to download generated video: ${videoResponse.status}`);
            }

            const videoBytes = await videoResponse.arrayBuffer();

            // Save to R2 and assets table (no automatic node creation)
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType: "video/mp4",
                bytes: videoBytes,
                projectId: args.projectId,
                generationPrompt: `Character animation with ${args.characterType} character and reference performance`,
                generationModel: "runway-character-control",
                generationParams: requestBody,
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully generated Runway Character Control video for project ${args.projectId}, node ${args.nodeId}`);
        } catch (error) {
            console.error("Failed to generate Runway Character Control video:", error);
            // TODO: Update node to error state
        }
    },
});

export const generateVideoBackgroundRemoval = internalAction({
    args: {
        nodeId: v.id("nodes"),
        projectId: v.id("projects"),
        sourceAssetId: v.string(),
        sourceAssetUrl: v.string(),
        assetType: v.union(v.literal("image"), v.literal("video")),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            console.log(`Starting ${args.assetType} background removal for project ${args.projectId}, node ${args.nodeId}`);

            // First, detect the actual MIME type of the source asset
            let actualAssetType = args.assetType;
            let processedAssetUrl = args.sourceAssetUrl;

            if (args.assetType === "image") {
                // For images, we need to ensure it's in a supported format (JPG/PNG)
                const headResponse = await fetch(args.sourceAssetUrl, { method: "HEAD" });
                const contentType = headResponse.headers.get("content-type");

                console.log(`Detected content type: ${contentType}`);

                // If it's not JPG/PNG, we need to convert it or fetch and re-encode
                if (contentType && !["image/jpeg", "image/jpg", "image/png"].includes(contentType)) {
                    console.log(`Converting ${contentType} to PNG for background removal`);

                    // Download the image and convert to PNG
                    const imageResponse = await fetch(args.sourceAssetUrl);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
                    }

                    const imageBytes = await imageResponse.arrayBuffer();

                    // Store the converted image temporarily
                    const convertedResult = await ctx.runAction(api.upload.store, {
                        category: "artifact",
                        filename: `converted-${args.sourceAssetId}.png`,
                        mimeType: "image/png",
                        bytes: imageBytes,
                        projectId: args.projectId,
                        generationPrompt: `Converted ${contentType} to PNG for background removal`,
                        generationModel: "format-conversion",
                    });

                    processedAssetUrl = convertedResult.url;
                    console.log(`Converted image URL: ${processedAssetUrl}`);
                }
            }

            // Choose the appropriate Replicate model based on asset type
            const model = actualAssetType === "video"
                ? "nateraw/video-background-remover:ac5c138171b04413a69222c304f67c135e259d46089fc70ef12da685b3c604aa"
                : "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1";

            const inputKey = actualAssetType === "video" ? "video" : "image";

            const input = {
                [inputKey]: processedAssetUrl
            }
            console.log(input);

            // Call Replicate API for background removal
            const output = await replicate.run(model, {
                input: input
            });

            // Get asset URL from output - could be string or object with URL
            const assetUrl = typeof output === 'string' ? output : (output as any)?.url || output;
            if (!assetUrl) {
                throw new Error(`No ${actualAssetType} URL returned from background removal model`);
            }

            // Download the processed asset
            const response = await fetch(assetUrl);
            if (!response.ok) {
                throw new Error(`Failed to download background-removed ${actualAssetType}: ${response.status}`);
            }

            // Determine MIME type based on asset type
            const mimeType = actualAssetType === "video" ? "video/mp4" : "image/png";

            // Save to R2 and assets table
            const result = await ctx.runAction(api.upload.store, {
                category: "artifact",
                filename: args.name,
                mimeType,
                bytes: await response.arrayBuffer(),
                projectId: args.projectId,
                generationPrompt: `Background removed from ${actualAssetType}: ${args.sourceAssetId}`,
                generationModel: model.split(":")[0], // Just the model name without version
                generationParams: {
                    sourceAssetId: args.sourceAssetId,
                    sourceAssetUrl: args.sourceAssetUrl,
                    assetType: actualAssetType,
                },
            });

            // Update the existing loading node to become a real asset node
            await ctx.runMutation(api.nodes.updateGeneratingNodeToAsset, {
                nodeId: args.nodeId,
                assetId: result.assetId!,
                assetUrl: result.url,
                assetMetadata: result.metadata,
            });

            console.log(`Successfully removed background from ${actualAssetType} for project ${args.projectId}, node ${args.nodeId}`);
        } catch (error) {
            console.error(`Failed to remove ${args.assetType} background:`, error);
            // TODO: Update node to error state
        }
    },
}); 