import { z } from "zod";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { videoEditingAgent } from "./agents";
import dedent from "dedent";
import { tool } from "ai";
import { ActionCtx } from "./_generated/server";

export interface ToolCtx {
    ctx: ActionCtx;
    threadId: string;
    userId: string;
    projectId: Id<"projects">;
}

// Video Scene Tools
export const createDraftScene = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Create a new draft video scene node for planning and ideation. Use this when the user wants to add scene ideas to their video project.

    SCENE CREATION GUIDELINES:
    When creating scenes, be extremely detailed and cinematic. Include:
    - Camera angles and movements (wide-angle, close-up, tracking, orbital, etc.)
    - Lighting setup and mood (sunset rimlight, warm natural lighting, tactical highlights)
    - Visual effects and transitions (slow motion, liquid transformation, kinetic ripples)
    - Audio elements (SFX, music style, voiceover, ambient sounds)
    - Setting and environment details (studio backdrop, desert basin, kitchen)
    - Subject actions and timing (ripple effects, rotation, assembly sequence)
    - Color palette and tone (matte sand, obsidian black, cinematic modern)

    EXAMPLE SCENE DESCRIPTIONS:
    Hummer EV Assembly:
    "Central low-angle wide shot, Hummer forming mid-air piece by piece. 24mm lens, 2000fps for impact, 60fps camera motion. Ground tracking, orbital spin, vertical rise. Hummer EV chassis, tires, shell, grille assembling in slow explosive layers in a dry cracked desert basin during sunset storm. Parts crash in with dust shock, body seals, wheels spin and slam down, final headlight flare and dust burst. Deep hybrid trailer score, rising tension then impact. Metal snaps, suspension drop, dust whoosh, electric pulse."`,

    parameters: z.object({
        title: z.string().describe("Short, descriptive title for the scene (e.g., 'Hero Shot', 'Product Reveal', 'Cooking Montage')"),
        description: z.string().optional().describe("Detailed description of the scene including camera angles, lighting, action, visual effects, etc. Be very specific and cinematic following the guidelines above."),
        estimatedDuration: z.number().optional().describe("Estimated duration of the scene in seconds (typically 5-10 seconds)"),
    }),
    execute: async (args): Promise<{ nodeId: string; message: string }> => {

        // Create another agent within to generate the scene descriptions using the main agents message but don't save the response back to the thread
        const { object: jsonPrompt } = await videoEditingAgent.generateObject(
            ctx,
            {
                threadId,
                userId,
            },
            {
                schema: z.object({
                    shot: z.object({
                        composition: z.string().describe("Camera angle and framing (e.g., 'central low-angle wide, Hummer forming mid-air piece by piece')"),
                        lens: z.string().describe("Camera lens specification (e.g., '24mm', '50mm', 'wide-angle')"),
                        frame_rate: z.string().describe("Frame rate for different elements (e.g., '2000fps for impact, 60fps camera motion')"),
                        camera_movement: z.string().describe("Camera movement and transitions (e.g., 'ground tracking, orbital spin, vertical rise')"),
                    }),
                    subject: z.object({
                        description: z.string().describe("Main subject or product being filmed (e.g., 'Hummer EV, chassis, tires, shell, grille assembling')"),
                        wardrobe: z.string().describe("Clothing or styling for human subjects (leave empty if not applicable)"),
                        props: z.string().describe("Important props or product features (e.g., 'armor plating, LED bar, mud-crushing tires')"),
                    }),
                    scene: z.object({
                        location: z.string().describe("Physical location or setting (e.g., 'dry cracked desert basin', 'modern kitchen', 'studio backdrop')"),
                        time_of_day: z.string().describe("Time and lighting conditions (e.g., 'sunset storm', 'golden hour', 'studio lighting')"),
                        environment: z.string().describe("Environmental elements and atmosphere (e.g., 'dust, wind trails, light flares')"),
                    }),
                    visual_details: z.object({
                        action: z.string().describe("Key actions and movements in the scene (e.g., 'parts crash in with dust shock, wheels spin and slam down')"),
                        special_effects: z.string().describe("Visual effects and enhancements (e.g., 'slow debris, flare ignition, kinetic ripples, vapor trails')"),
                        hair_clothing_motion: z.string().describe("Motion details for hair, clothing, or fabric elements (leave empty if not applicable)"),
                    }),
                    cinematography: z.object({
                        lighting: z.string().describe("Lighting setup and mood (e.g., 'sunset rimlight + tactical highlights', 'warm natural lighting')"),
                        color_palette: z.string().describe("Main colors and tones (e.g., 'matte sand, obsidian black, steel grey')"),
                        tone: z.string().describe("Overall mood and aesthetic (e.g., 'premium, off-road dominance', 'cinematic modern')"),
                    }),
                    audio: z.object({
                        music: z.string().describe("Musical score and style (e.g., 'deep hybrid trailer score, rising tension then impact')"),
                        ambient: z.string().describe("Background and environmental sounds (e.g., 'wind, echoing terrain hum')"),
                        sound_effects: z.string().describe("Specific sound effects (e.g., 'metal snaps, suspension drop, dust whoosh, electric pulse')"),
                        mix_level: z.string().describe("Audio mixing specifications (e.g., 'studio-grade mix, wide stereo field, punchy dynamics')"),
                    }),
                    dialogue: z.object({
                        character: z.string().describe("Speaking character name (leave empty if no dialogue)"),
                        line: z.string().describe("Spoken dialogue (leave empty if no dialogue)"),
                        subtitles: z.boolean().describe("Whether subtitles should be displayed"),
                    }),
                }),
                system: dedent`
                    You are a professional video production assistant. Convert the provided scene description into a detailed, structured video production plan. 

                    Fill out each field with specific, actionable details that a video production team could use to create the scene. Be cinematic and detailed in your descriptions.

                    Example reference:
                    {
                        "shot": {
                            "composition": "central low-angle wide, Hummer forming mid-air piece by piece",
                            "lens": "24mm",
                            "frame_rate": "2000fps for impact, 60fps camera motion",
                            "camera_movement": "ground tracking, orbital spin, vertical rise"
                        },
                        "subject": {
                            "description": "Hummer EV, chassis, tires, shell, grille assembling in slow explosive layers",
                            "wardrobe": "",
                            "props": "armor plating, LED bar, mud-crushing tires, electric core pulse"
                        },
                        "scene": {
                            "location": "dry cracked desert basin",
                            "time_of_day": "sunset storm",
                            "environment": "dust, wind trails, light flares, far-off thunder glow"
                        },
                        "visual_details": {
                            "action": "parts crash in with dust shock, body seals, wheels spin and slam down, final headlight flare and dust burst",
                            "special_effects": "slow debris, flare ignition, kinetic ripples, vapor trails",
                            "hair_clothing_motion": ""
                        },
                        "cinematography": {
                            "lighting": "sunset rimlight + tactical highlights",
                            "color_palette": "matte sand, obsidian black, steel grey",
                            "tone": "premium, off-road dominance"
                        },
                        "audio": {
                            "music": "deep hybrid trailer score, rising tension then impact",
                            "ambient": "wind, echoing terrain hum",
                            "sound_effects": "metal snaps, suspension drop, dust whoosh, electric pulse",
                            "mix_level": "studio-grade mix, wide stereo field, punchy dynamics"
                        },
                        "dialogue": {
                            "character": "",
                            "line": "",
                            "subtitles": false
                        }
                    }
                `,
                prompt: `Create a detailed video production plan for this scene: ${args.description || args.title}`,
            },
            {
                storageOptions: {
                    saveMessages: "none"
                }
            }
        );

        const nodeId = await ctx.runMutation(api.nodes.createDraftNode, {
            projectId: projectId,
            title: args.title,
            description: args.description,
            estimatedDuration: args.estimatedDuration,
            jsonPrompt,
        });

        // Auto-link the new node to the timeline
        const edgeId = await ctx.runMutation(api.edges.autoLinkToTimeline, {
            projectId,
            newNodeId: nodeId,
        });

        const linkMessage = edgeId
            ? " It has been automatically connected to your timeline."
            : "";

        return {
            nodeId,
            message: `Created draft scene "${args.title}" in your video editor.${linkMessage} You can now connect it to other scenes or add real assets to bring it to life.`,
        };
    },
});

// AI Asset Generation Tools
export const generateImageWithRunway = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Generate images using Runway Gen4 Image model. Excellent for reference-based image generation where you can combine multiple reference images with specific tags. Best for creating images that blend concepts from different reference sources.

    Use this when:
    - User wants to combine elements from multiple reference images
    - Creating variations of existing images with specific style elements
    - Generating images with precise control over composition using reference tags
    - User provides reference images and wants them combined or varied

    The model excels at understanding reference tags and combining visual elements intelligently.`,

    parameters: z.object({
        prompt: z.string().describe("Detailed description of the image to generate. Be specific about composition, style, lighting, and mood."),
        aspectRatio: z.string().optional().describe("Aspect ratio for the image (e.g., '16:9', '4:3', '1:1'). Defaults to '16:9'."),
        referenceTags: z.array(z.string()).optional().describe("Array of tags that correspond to elements in reference images (e.g., ['@park', '@woman', '@man'])"),
        referenceImages: z.array(z.string()).optional().describe("Array of reference image URLs to guide the generation"),
        name: z.string().optional().describe("Custom name for the generated asset. If not provided, will auto-generate one."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        const result = await ctx.runAction(api.aiGeneration.scheduleRunwayImageGeneration, {
            projectId,
            prompt: args.prompt,
            aspectRatio: args.aspectRatio,
            referenceTags: args.referenceTags,
            referenceImages: args.referenceImages,
            name: args.name,
        });

        return {
            success: result.success,
            message: `🎨 ${result.message} Using Runway Gen4 for reference-based generation.${args.referenceTags?.length ? ` Reference tags: ${args.referenceTags.join(', ')}` : ''}`,
        };
    },
});

export const generateCharacterControlVideo = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Animate a character using Runway's Gen4 Character Control model. This lets you take a character (image or video) and make them perform actions from a reference video. Perfect for bringing static characters to life or transferring performances between characters.

    Use this when:
    - User wants to animate a character or person in an image
    - User has a character and wants them to perform specific actions/expressions
    - User wants to transfer a performance from one person/character to another
    - Creating character animations for storytelling or creative projects
    - User provides both a character image/video and a reference performance video

    The model can control both facial expressions and body movements, making characters perform like the reference video while maintaining their original appearance and environment.`,

    parameters: z.object({
        characterType: z.enum(["image", "video"]).describe("Whether the character input is an image or video"),
        characterUrl: z.string().describe("URL of the character image or video. Must show a clear, recognizable face that stays within frame."),
        referenceVideoUrl: z.string().describe("URL of the reference performance video (3-30 seconds). This person's actions and expressions will be applied to your character."),
        ratio: z.enum(["1280:720", "720:1280", "960:960", "1104:832", "832:1104", "1584:672"]).optional().describe("Output video resolution. Defaults to '1280:720' (16:9 landscape)."),
        bodyControl: z.boolean().optional().describe("Whether to enable body control for gestures and movements (not just facial). Defaults to true."),
        expressionIntensity: z.number().min(1).max(5).optional().describe("Intensity of character expressions (1-5 scale). Higher values = more dramatic expressions. Defaults to 3."),
        name: z.string().optional().describe("Custom name for the generated video asset. If not provided, will auto-generate one."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        const result = await ctx.runAction(api.aiGeneration.scheduleRunwayCharacterControl, {
            projectId,
            characterType: args.characterType,
            characterUrl: args.characterUrl,
            referenceVideoUrl: args.referenceVideoUrl,
            ratio: args.ratio || "1280:720",
            bodyControl: args.bodyControl ?? true,
            expressionIntensity: args.expressionIntensity || 3,
            name: args.name,
        });

        return {
            success: result.success,
            message: `🎭 ${result.message} Using Runway Gen4 Character Control to animate your character with the reference performance.`,
        };
    },
});

export const generateImageWithFlux = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Generate or transform images using Flux Kontext Pro model. Excellent for context-aware transformations and style transfers. Best for applying specific styles or transformations to existing images, or generating highly detailed images from text prompts.

    Use this when:
    - User wants to transform an existing image with a specific style
    - Converting images to different artistic styles (e.g., "Make this a 90s cartoon")
    - User provides an input image and wants it modified
    - Generating highly detailed, context-aware images from text alone
    - Need precise keyword understanding and styling

    The model excels at understanding context and applying transformations while preserving important image elements.`,

    parameters: z.object({
        prompt: z.string().describe("Transformation description or generation prompt. Be specific about the desired style, changes, or content."),
        inputImage: z.string().optional().describe("URL of an input image to transform. If provided, the model will apply the prompt as a transformation to this image."),
        outputFormat: z.string().optional().describe("Output format for the image ('jpg', 'png', 'webp'). Defaults to 'jpg'."),
        name: z.string().optional().describe("Custom name for the generated asset. If not provided, will auto-generate one."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        const result = await ctx.runAction(api.aiGeneration.scheduleFluxImageGeneration, {
            projectId,
            prompt: args.prompt,
            inputImage: args.inputImage,
            outputFormat: args.outputFormat,
            name: args.name,
        });

        const transformMessage = args.inputImage ? "transformation" : "generation";
        return {
            success: result.success,
            message: `✨ ${result.message} Using Flux Kontext Pro for context-aware ${transformMessage}.`,
        };
    },
});

export const generateVideoWithHailuo = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Generate short videos using Hailuo-02 model. A cost-effective option for creating short video clips from text prompts. Good for quick video concepts, simple animations, and B-roll footage.

    Use this when:
    - User wants to generate a short video clip from a text description
    - Creating simple animations or motion graphics
    - Generating B-roll footage for video projects
    - Need a quick, cost-effective video generation solution
    - User describes an action or scene they want to see in motion

    Note: This model generates relatively short clips (usually 2-6 seconds) and works best with clear, action-oriented prompts.`,

    parameters: z.object({
        prompt: z.string().describe("Description of the video to generate. Be specific about the action, movement, camera work, and scene. Works best with clear, dynamic descriptions."),
        promptOptimizer: z.boolean().optional().describe("Whether to use the built-in prompt optimizer to enhance the prompt. Defaults to false."),
        name: z.string().optional().describe("Custom name for the generated video asset. If not provided, will auto-generate one."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        const result = await ctx.runAction(api.aiGeneration.scheduleHailuoVideoGeneration, {
            projectId,
            prompt: args.prompt,
            promptOptimizer: args.promptOptimizer,
            name: args.name,
        });

        return {
            success: result.success,
            message: `🎬 ${result.message} Using Hailuo-02 for cost-effective video generation.`,
        };
    },
});

export const generateVoiceNarration = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Generate high-quality voice narration using Fish Audio's text-to-speech models. Perfect for creating professional voiceovers, narrations, and audio content for video projects.

    Use this when:
    - User wants to create voiceover for their video project
    - Need professional narration for documentary-style content
    - User provides script text that should be spoken
    - Creating audio content for scenes that need spoken dialogue
    - Adding narrator voice to explain or describe video content

    Fish Audio provides excellent voice quality with natural-sounding speech synthesis. Great for both male and female voices with clear pronunciation and good emotional range.`,

    parameters: z.object({
        text: z.string().describe("The text to convert to speech. Keep it natural and well-punctuated for best results. Can include dialogue, narration, or any spoken content."),
        model: z.string().optional().describe("Fish Audio TTS model to use ('speech-1.5', 'speech-1.6', or 's1'). Defaults to 'speech-1.5' which provides good quality and speed."),
        name: z.string().optional().describe("Custom name for the generated audio asset. If not provided, will auto-generate one."),
        referenceId: z.string().describe("Reference ID for the audio asset. Find the voice model from the list models tool"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        const result = await ctx.runAction(api.aiGeneration.scheduleFishAudioGeneration, {
            projectId,
            text: args.text,
            model: args.model,
            name: args.name,
            referenceId: args.referenceId,
        });

        return {
            success: result.success,
            message: `🎤 ${result.message} Using Fish Audio ${args.model || 'speech-1.5'} for high-quality voice synthesis.`,
        };
    },
});

type FishAudioModel = {
    _id: string;
    title: string;
    description: string;
    languages: string[];
    tags: string[];
    author: { nickname: string };
    like_count: number;
}

type FishAudioModelMapped = {
    id: string;
    title: string;
    description: string;
    languages: string[];
    tags: string[];
    author: string;
    likeCount: number;
}

export const searchVoiceModels = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Search and discover available voice models from Fish Audio. Use this to find specific voices, languages, or voice characteristics for generating narration. Essential for finding the right voice before using generateVoiceNarration.

    Use this when:
    - User asks about available voices or voice options
    - Need to find voices in specific languages
    - Looking for specific voice characteristics (male, female, accents, etc.)
    - User wants to browse voice models before generating audio
    - Need to find a voice model's reference ID for generation

    This helps users discover the perfect voice for their project before generating audio content.`,

    parameters: z.object({
        title: z.string().optional().describe("Search for voice models by title or name (e.g., 'Emma', 'British', 'narrator')"),
        language: z.string().optional().describe("Filter by language (e.g., 'english', 'spanish', 'french')"),
        tag: z.string().optional().describe("Filter by tags or characteristics (e.g., 'female', 'male', 'young', 'professional')"),
        pageSize: z.number().optional().describe("Number of results to return (1-50). Defaults to 10."),
        sortBy: z.string().optional().describe("Sort results by 'score' (relevance), 'task_count' (popularity), or 'created_at' (newest). Defaults to 'score'."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; models?: any[] }> => {
        const result = await ctx.runAction(api.aiGeneration.listFishAudioModels, {
            pageSize: args.pageSize || 10,
            pageNumber: 1,
            title: args.title,
            tag: args.tag,
            language: args.language,
            sortBy: args.sortBy || "score",
        });

        if (result.success && result.models.length > 0) {
            // Format the response to show key information about each voice
            const formattedModels: FishAudioModelMapped[] = result.models.map((model: FishAudioModel) => ({
                id: model._id,
                title: model.title,
                description: model.description,
                languages: model.languages || [],
                tags: model.tags || [],
                author: model.author?.nickname || "Unknown",
                likeCount: model.like_count || 0,
            }));

            const modelSummary = formattedModels
                .map((model: FishAudioModelMapped, index: number) =>
                    `${index + 1}. **${model.title}** (ID: ${model.id})\n   - ${model.description || 'No description'}\n   - Languages: ${model.languages.join(', ') || 'Not specified'}\n   - Tags: ${model.tags.join(', ') || 'None'}\n   - By: ${model.author} (${model.likeCount} likes)`
                )
                .join('\n\n');

            return {
                success: true,
                message: `🎤 Found ${result.total} voice models. Here are the top results:\n\n${modelSummary}${result.total > 5 ? `\n\n...and ${result.total - 5} more. Use the voice ID when generating narration.` : '\n\nUse the voice ID when generating narration.'}`,
                models: formattedModels,
            };
        }

        return {
            success: result.success,
            message: result.message || "No voice models found matching your criteria. Try broadening your search terms.",
        };
    },
});

export const removeBackground = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Remove background from an image or video using AI. Creates a version with the background removed/made transparent, perfect for overlays, green screen effects, or compositing.

    Use this when:
    - User wants to remove background from an image or video
    - Creating overlay assets for compositing
    - Making images/videos with transparent backgrounds
    - Need to isolate the main subject from the background
    - Preparing assets for green screen-style effects

    The AI will automatically detect and remove the background while preserving the main subject (people, objects). Works with both images and videos, automatically selecting the appropriate model based on asset type.`,

    parameters: z.object({
        assetId: z.string().describe("ID of the image or video asset to process. Must be an existing asset in the project."),
        name: z.string().optional().describe("Custom name for the background-removed asset. If not provided, will auto-generate one."),
    }),
    execute: async (args): Promise<{ success: boolean; message: string }> => {
        // Get the source asset
        const sourceAsset = await ctx.runQuery(api.assets.get, { id: args.assetId as Id<"assets"> });
        if (!sourceAsset) {
            return {
                success: false,
                message: "Source asset not found. Please provide a valid asset ID.",
            };
        }

        if (!["image", "video"].includes(sourceAsset.type || "")) {
            return {
                success: false,
                message: "Asset must be an image or video file. This tool only works with visual content.",
            };
        }

        const result = await ctx.runAction(api.aiGeneration.scheduleVideoBackgroundRemoval, {
            projectId,
            sourceAssetId: args.assetId,
            sourceVideoUrl: sourceAsset.url,
            assetType: sourceAsset.type as "image" | "video",
            name: args.name,
        });

        const assetTypeText = sourceAsset.type === "video" ? "video" : "image";
        return {
            success: result.success,
            message: `🎭 ${result.message} Using AI background removal to isolate the main subject from the ${assetTypeText}.`,
        };
    },
});

// Video Timeline Editing Tools

/**
 * Apply LUT-style composition filters to the entire video timeline
 */
export const applyCompositionFilter = ({
    ctx,
    projectId,
}: ToolCtx) => tool({
    description: `Apply cinematic filters and LUT-style effects to the entire video composition. This affects the overall look and mood of the video.

    FILTER EFFECTS:
    - Contrast: Adjust overall contrast (0.5-2.0) - Higher values for dramatic look
    - Saturation: Control color intensity (0.0-3.0) - Lower for muted, higher for vibrant
    - Brightness: Adjust overall brightness (0.5-2.0) - Good for exposure correction
    - Hue Rotate: Shift all colors (-180 to 180 degrees) - Creative color grading
    - Sepia: Apply vintage sepia tone (0.0-1.0) - For retro/vintage aesthetic
    - Blur: Add overall softness (0-10 pixels) - For dreamy or motion effects
    - Grayscale: Convert to black and white (0.0-1.0) - Artistic effect
    - Invert: Invert colors (0.0-1.0) - Creative/experimental looks

    COMMON PRESETS:
    - Cinematic: contrast: 1.2, saturation: 1.1, brightness: 0.95
    - Vintage: sepia: 0.4, contrast: 1.3, brightness: 1.1
    - Cool/Teal: hueRotate: 180, saturation: 1.2
    - Warm/Orange: hueRotate: 20, saturation: 1.3, brightness: 1.05
    - Noir: grayscale: 1.0, contrast: 1.4
    - Dreamy: blur: 1, brightness: 1.1, saturation: 0.8`,

    parameters: z.object({
        contrast: z.number().min(0.5).max(2.0).optional().describe("Contrast level (0.5-2.0, default 1.0)"),
        saturation: z.number().min(0.0).max(3.0).optional().describe("Color saturation (0.0-3.0, default 1.0)"),
        brightness: z.number().min(0.5).max(2.0).optional().describe("Brightness level (0.5-2.0, default 1.0)"),
        hueRotate: z.number().min(-180).max(180).optional().describe("Hue rotation in degrees (-180 to 180, default 0)"),
        sepia: z.number().min(0.0).max(1.0).optional().describe("Sepia effect intensity (0.0-1.0, default 0)"),
        blur: z.number().min(0).max(10).optional().describe("Blur amount in pixels (0-10, default 0)"),
        grayscale: z.number().min(0.0).max(1.0).optional().describe("Grayscale intensity (0.0-1.0, default 0)"),
        invert: z.number().min(0.0).max(1.0).optional().describe("Color inversion (0.0-1.0, default 0)"),
        preset: z.enum(["cinematic", "vintage", "cool", "warm", "noir", "dreamy", "clear"]).optional().describe("Apply a preset filter combination instead of individual values"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; appliedFilters?: any }> => {
        try {
            let filters: any = {};

            // Apply preset or individual filters
            if (args.preset) {
                switch (args.preset) {
                    case "cinematic":
                        filters = { contrast: 1.2, saturation: 1.1, brightness: 0.95 };
                        break;
                    case "vintage":
                        filters = { sepia: 0.4, contrast: 1.3, brightness: 1.1 };
                        break;
                    case "cool":
                        filters = { hueRotate: 180, saturation: 1.2 };
                        break;
                    case "warm":
                        filters = { hueRotate: 20, saturation: 1.3, brightness: 1.05 };
                        break;
                    case "noir":
                        filters = { grayscale: 1.0, contrast: 1.4 };
                        break;
                    case "dreamy":
                        filters = { blur: 1, brightness: 1.1, saturation: 0.8 };
                        break;
                    case "clear":
                        filters = {}; // Clear all filters
                        break;
                }
            } else {
                // Use individual filter values
                filters = {
                    contrast: args.contrast,
                    saturation: args.saturation,
                    brightness: args.brightness,
                    hueRotate: args.hueRotate,
                    sepia: args.sepia,
                    blur: args.blur,
                    grayscale: args.grayscale,
                    invert: args.invert,
                };

                // Remove undefined values
                Object.keys(filters).forEach(key =>
                    filters[key] === undefined && delete filters[key]
                );
            }

            // Apply the filters using the timeline editing mutation
            await ctx.runMutation(api.timelineEditing.applyCompositionFilters, {
                projectId,
                filters,
            });

            const filterDescription = args.preset
                ? `Applied "${args.preset}" preset filter`
                : `Applied custom filters: ${Object.entries(filters).map(([key, value]) => `${key}: ${value}`).join(', ')}`;

            return {
                success: true,
                message: `${filterDescription}. The filters will be visible in the timeline preview and final render.`,
                appliedFilters: filters,
            };

        } catch (error) {
            console.error('Error applying composition filter:', error);
            return {
                success: false,
                message: `Failed to apply filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});

/**
 * Place an asset on the timeline with precise positioning and properties
 */
export const placeAssetOnTimeline = ({
    ctx,
    projectId,
}: ToolCtx) => tool({
    description: `Place any asset (video, audio, image) on the timeline with precise positioning, timing, and properties. This is the primary tool for building video compositions.

    PLACEMENT CAPABILITIES:
    - Timeline Positioning: Specify exactly when assets start/end on the timeline
    - Auto-Track Assignment: Automatically finds available tracks or creates new ones to avoid conflicts
    - Asset Trimming: Use only portions of source assets (crop/trim functionality)
    - Overlay Positioning: Place video/images as overlays with pixel-perfect positioning
    - Volume Control: Set audio levels (0.0-2.0, where 1.0 = normal)
    - Opacity Control: Set transparency for video/images (0.0-1.0, where 1.0 = opaque)

    COMMON USE CASES:
    - Main timeline content: Place main videos/audio on primary tracks
    - Background music: Add audio tracks with lower volume (0.3-0.7)
    - Overlay graphics: Position logos, text, or images over main content
    - Picture-in-picture: Small video overlays in corners
    - Voiceovers: Add narration tracks with proper timing
    - Sound effects: Place audio clips at specific moments

    TRACK TYPES:
    - video: For video files and images (can have overlays)
    - audio: For audio files, music, voiceovers, sound effects

    OVERLAY POSITIONING:
    - Use standard video dimensions (1920x1080) as reference
    - x, y: Top-left corner position in pixels
    - width, height: Size in pixels
    - Common positions: Top-right corner (1620, 20, 280, 157), Center (820, 462, 280, 157)

    TIMING EXAMPLES:
    - Sequential clips: startTime: 0, 10, 20 (one after another)
    - Overlapping audio: Multiple audio tracks with different timing
    - Trimmed clips: Use assetStartTime/assetEndTime to crop source material`,

    parameters: z.object({
        assetId: z.string().describe("ID of the asset to place (from project assets)"),
        startTime: z.number().min(0).describe("When to start on timeline (seconds from beginning)"),
        endTime: z.number().min(0).optional().describe("When to end on timeline (auto-calculated from asset duration if not provided)"),
        trackType: z.enum(["video", "audio"]).describe("Type of track to place asset on"),
        trackIndex: z.number().min(1).optional().describe("Preferred track number (1, 2, 3...) - will auto-assign if conflicts exist"),

        // Overlay positioning (for video/image overlays)
        overlay: z.object({
            x: z.number().min(0).describe("Pixels from left edge (0-1920)"),
            y: z.number().min(0).describe("Pixels from top edge (0-1080)"),
            width: z.number().min(1).describe("Width in pixels"),
            height: z.number().min(1).describe("Height in pixels"),
            zIndex: z.number().optional().describe("Layer order (higher = on top)"),
        }).optional().describe("Position as overlay (for video/image assets only)"),

        // Audio/Visual properties
        volume: z.number().min(0).max(2.0).optional().describe("Audio volume (0.0-2.0, default 1.0) - use 0.3-0.7 for background music"),
        opacity: z.number().min(0).max(1.0).optional().describe("Transparency (0.0-1.0, default 1.0) - for fading effects"),

        // Asset trimming (crop source material)
        assetStartTime: z.number().min(0).optional().describe("Start time within source asset (seconds) - for trimming beginning"),
        assetEndTime: z.number().min(0).optional().describe("End time within source asset (seconds) - for trimming end"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; timelineItemId?: string; trackId?: string }> => {
        try {
            // Validate overlay positioning for standard video dimensions
            if (args.overlay) {
                const { x, y, width, height } = args.overlay;
                if (x + width > 1920) {
                    return {
                        success: false,
                        message: "Overlay extends beyond video width (1920px). Reduce x position or width.",
                    };
                }
                if (y + height > 1080) {
                    return {
                        success: false,
                        message: "Overlay extends beyond video height (1080px). Reduce y position or height.",
                    };
                }
            }

            // Validate timing
            if (args.endTime && args.endTime <= args.startTime) {
                return {
                    success: false,
                    message: "End time must be greater than start time.",
                };
            }

            if (args.assetStartTime !== undefined && args.assetEndTime !== undefined && args.assetEndTime <= args.assetStartTime) {
                return {
                    success: false,
                    message: "Asset end time must be greater than asset start time.",
                };
            }

            // Place the asset using the timeline editing mutation
            const result = await ctx.runMutation(api.timelineEditing.placeAssetOnTimeline, {
                projectId,
                assetId: args.assetId,
                startTime: args.startTime,
                endTime: args.endTime,
                trackType: args.trackType,
                trackIndex: args.trackIndex,
                overlay: args.overlay,
                volume: args.volume,
                opacity: args.opacity,
                assetStartTime: args.assetStartTime,
                assetEndTime: args.assetEndTime,
            });

            return {
                success: true,
                message: result.message,
                timelineItemId: result.timelineItemId,
                trackId: result.trackId,
            };

        } catch (error) {
            console.error('Error placing asset on timeline:', error);
            return {
                success: false,
                message: `Failed to place asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});

/**
 * Modify properties of an existing timeline asset
 */
export const modifyTimelineAsset = ({
    ctx,
    projectId,
}: ToolCtx) => tool({
    description: `Modify properties of an existing timeline asset. Use this to adjust timing, positioning, volume, opacity, and other properties of assets already placed on the timeline.

    MODIFICATION CAPABILITIES:
    - Timeline Positioning: Change start/end times to move or extend/shorten clips
    - Overlay Positioning: Adjust x, y, width, height, z-index of overlay elements
    - Audio/Visual Properties: Modify volume (0.0-2.0) and opacity (0.0-1.0)
    - Asset Trimming: Change which portion of source asset is used
    - Track Movement: Move assets between tracks (with conflict detection)

    COMMON USE CASES:
    - Volume adjustments: "Lower the background music volume to 0.3"
    - Repositioning overlays: "Move the logo to the bottom-right corner"
    - Timing adjustments: "Make the intro video start 2 seconds later"
    - Trimming: "Cut the first 5 seconds from the voiceover"
    - Track changes: "Move this audio to a different track"
    - Opacity effects: "Make the overlay 50% transparent"

    TIMING EXAMPLES:
    - Extend clip: Change endTime from 10 to 15 seconds
    - Move clip: Change startTime from 0 to 5 and endTime from 10 to 15
    - Trim beginning: Change assetStartTime from 0 to 3 seconds
    - Trim end: Change assetEndTime from 20 to 17 seconds

    NOTE: You need the timeline item ID to modify an asset. This is returned when placing assets or can be found by examining the timeline.`,

    parameters: z.object({
        timelineItemId: z.string().describe("ID of the timeline item to modify (required)"),

        // Timeline positioning changes
        startTime: z.number().min(0).optional().describe("New start time on timeline (seconds)"),
        endTime: z.number().min(0).optional().describe("New end time on timeline (seconds)"),

        // Overlay positioning changes
        overlay: z.object({
            x: z.number().min(0).optional().describe("New x position (pixels from left)"),
            y: z.number().min(0).optional().describe("New y position (pixels from top)"),
            width: z.number().min(1).optional().describe("New width (pixels)"),
            height: z.number().min(1).optional().describe("New height (pixels)"),
            zIndex: z.number().optional().describe("New layer order (higher = on top)"),
        }).optional().describe("Modify overlay positioning (for video/image overlays only)"),

        // Audio/Visual property changes
        volume: z.number().min(0).max(2.0).optional().describe("New audio volume (0.0-2.0, 1.0 = normal)"),
        opacity: z.number().min(0).max(1.0).optional().describe("New opacity (0.0-1.0, 1.0 = opaque)"),

        // Asset trimming changes
        assetStartTime: z.number().min(0).optional().describe("New start time within source asset (seconds) - for trimming beginning"),
        assetEndTime: z.number().min(0).optional().describe("New end time within source asset (seconds) - for trimming end"),

        // Track changes
        moveToTrackId: z.string().optional().describe("Move to specific track ID (e.g., 'video-2', 'audio-1')"),
        moveToTrackType: z.enum(["video", "audio"]).optional().describe("Move to any available track of this type"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; updatedItem?: any }> => {
        try {
            // Basic validation
            if (args.endTime && args.startTime && args.endTime <= args.startTime) {
                return {
                    success: false,
                    message: "End time must be greater than start time.",
                };
            }

            if (args.assetEndTime && args.assetStartTime && args.assetEndTime <= args.assetStartTime) {
                return {
                    success: false,
                    message: "Asset end time must be greater than asset start time.",
                };
            }

            // Validate overlay positioning for standard video dimensions
            if (args.overlay) {
                if (args.overlay.x !== undefined && args.overlay.width !== undefined && args.overlay.x + args.overlay.width > 1920) {
                    return {
                        success: false,
                        message: "Overlay extends beyond video width (1920px). Reduce x position or width.",
                    };
                }
                if (args.overlay.y !== undefined && args.overlay.height !== undefined && args.overlay.y + args.overlay.height > 1080) {
                    return {
                        success: false,
                        message: "Overlay extends beyond video height (1080px). Reduce y position or height.",
                    };
                }
            }

            // Modify the timeline asset using the mutation
            const result = await ctx.runMutation(api.timelineEditing.modifyTimelineAsset, {
                projectId,
                timelineItemId: args.timelineItemId,
                startTime: args.startTime,
                endTime: args.endTime,
                overlay: args.overlay,
                volume: args.volume,
                opacity: args.opacity,
                assetStartTime: args.assetStartTime,
                assetEndTime: args.assetEndTime,
                moveToTrackId: args.moveToTrackId,
                moveToTrackType: args.moveToTrackType,
            });

            return {
                success: result.success,
                message: result.message,
                updatedItem: result.updatedItem,
            };

        } catch (error) {
            console.error('Error modifying timeline asset:', error);
            return {
                success: false,
                message: `Failed to modify asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});

// Video Transcript Analysis Tools

/**
 * Helper function to parse SRT format and extract captions with timestamps
 */
function parseSRT(srtContent: string): Array<{
    index: number;
    startTime: number;
    endTime: number;
    text: string;
}> {
    const captions = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length >= 3) {
            const index = parseInt(lines[0]);
            const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);

            if (timeMatch) {
                const startTime = parseFloat(timeMatch[1]) * 3600 + parseFloat(timeMatch[2]) * 60 + parseFloat(timeMatch[3]) + parseFloat(timeMatch[4]) / 1000;
                const endTime = parseFloat(timeMatch[5]) * 3600 + parseFloat(timeMatch[6]) * 60 + parseFloat(timeMatch[7]) + parseFloat(timeMatch[8]) / 1000;
                const text = lines.slice(2).join(' ');

                captions.push({ index, startTime, endTime, text });
            }
        }
    }

    return captions;
}

/**
 * Extract interesting segments from a video using transcript analysis
 */
export const extractInterestingSegments = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Analyze a video's transcript to automatically identify the most interesting, engaging, or valuable segments. Perfect for creating highlights, extracting key moments, or finding the best parts of longer content.

    Use this when:
    - User wants to find highlights from a longer video
    - Need to extract key moments or quotes from interviews/talks
    - Want to identify the most engaging parts of content
    - Looking for specific topics or themes within a video
    - Creating short clips from longer source material

    The AI will analyze speech patterns, content quality, topics, and engagement factors to identify segments worth extracting. Each segment comes with timestamps and reasoning for why it's interesting.`,

    parameters: z.object({
        assetId: z.string().describe("ID of the video asset to analyze (must have transcription data)"),
        segmentLength: z.number().min(5).max(60).optional().describe("Preferred segment length in seconds (5-60, default 15). Longer for detailed segments, shorter for quick highlights."),
        maxSegments: z.number().min(1).max(20).optional().describe("Maximum number of segments to extract (1-20, default 5)"),
        criteria: z.string().optional().describe("Specific criteria for what makes content interesting (e.g., 'funny moments', 'key insights', 'emotional peaks', 'action sequences')"),
        minimumGap: z.number().min(2).max(10).optional().describe("Minimum gap between segments in seconds (2-10, default 5) to avoid overlapping clips"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; segments?: any[] }> => {
        try {
            // Get the asset and check for transcription
            const asset = await ctx.runQuery(api.assets.get, { id: args.assetId as Id<"assets"> });
            if (!asset) {
                return {
                    success: false,
                    message: "Asset not found. Please provide a valid asset ID.",
                };
            }

            if (asset.type !== "video") {
                return {
                    success: false,
                    message: "Asset must be a video file. This tool only works with video content.",
                };
            }

            if (!asset.metadata?.transcription?.srt) {
                return {
                    success: false,
                    message: "Video must have transcription data. Upload a video and wait for automatic transcription to complete, or ensure the video contains speech.",
                };
            }

            // Parse the SRT transcript
            const captions = parseSRT(asset.metadata.transcription.srt);
            if (captions.length === 0) {
                return {
                    success: false,
                    message: "Could not parse transcript data. The transcription may be empty or malformed.",
                };
            }

            const totalDuration = asset.metadata.transcription.duration || Math.max(...captions.map(c => c.endTime));
            const fullTranscript = captions.map(c => `[${c.startTime.toFixed(1)}s-${c.endTime.toFixed(1)}s] ${c.text}`).join('\n');

            // Analyze transcript with AI to find interesting segments
            const analysisPrompt = `Analyze this video transcript and identify the ${args.maxSegments || 5} most interesting segments. Each segment should be approximately ${args.segmentLength || 15} seconds long.

TRANSCRIPT:
${fullTranscript}

ANALYSIS CRITERIA:
${args.criteria || 'Identify engaging moments with high information density, emotional impact, key insights, memorable quotes, or compelling storytelling. Look for peaks in energy, important revelations, funny moments, or valuable information.'}

REQUIREMENTS:
- Segments should be ${args.segmentLength || 15} seconds (±5 seconds is acceptable)
- Minimum ${args.minimumGap || 5} second gap between segments
- Include exact start and end timestamps from the transcript
- Provide clear reasoning for why each segment is interesting
- Rank segments by engagement/interest level (1-10 scale)

Return as a JSON array with this structure:
[
  {
    "startTime": 23.5,
    "endTime": 38.2,
    "title": "Key insight about...",
    "description": "Brief description of what happens in this segment",
    "reason": "Why this segment is interesting/engaging",
    "engagementScore": 8,
    "topics": ["topic1", "topic2"]
  }
]`;

            const result = await videoEditingAgent.generateObject(
                ctx,
                { threadId, userId },
                {
                    schema: z.object({
                        segments: z.array(z.object({
                            startTime: z.number(),
                            endTime: z.number(),
                            title: z.string(),
                            description: z.string(),
                            reason: z.string(),
                            engagementScore: z.number().min(1).max(10),
                            topics: z.array(z.string()),
                        }))
                    }),
                    prompt: analysisPrompt,
                },
                {
                    storageOptions: {
                        saveMessages: "none"
                    }
                }
            );

            const segments = result.object.segments;

            // Validate and filter segments
            const validSegments = segments.filter(segment => {
                return segment.startTime >= 0 &&
                    segment.endTime <= totalDuration &&
                    segment.endTime > segment.startTime &&
                    (segment.endTime - segment.startTime) >= 3; // Minimum 3 seconds
            });

            if (validSegments.length === 0) {
                return {
                    success: false,
                    message: "No valid interesting segments found in the transcript. The content may be too short or lack engaging moments.",
                };
            }

            // Sort by engagement score
            validSegments.sort((a, b) => b.engagementScore - a.engagementScore);

            const segmentSummary = validSegments
                .map((segment, index) =>
                    `${index + 1}. **${segment.title}** (${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s, Score: ${segment.engagementScore}/10)\n   ${segment.description}\n   Reason: ${segment.reason}`
                )
                .join('\n\n');

            return {
                success: true,
                message: `🎯 Found ${validSegments.length} interesting segments in "${asset.name}":\n\n${segmentSummary}\n\nUse the splitVideoAsset tool to extract these segments as separate clips.`,
                segments: validSegments,
            };

        } catch (error) {
            console.error('Error extracting interesting segments:', error);
            return {
                success: false,
                message: `Failed to analyze transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});

/**
 * Split a video asset into trimmed segments based on specified timestamps
 */
export const splitVideoAsset = ({
    ctx,
    projectId,
    threadId,
    userId,
}: ToolCtx) => tool({
    description: `Split a video asset into separate trimmed clips based on specific start and end times. Creates new asset records that reference portions of the original video.

    Use this when:
    - Extracting segments identified by extractInterestingSegments tool
    - Creating multiple clips from one source video
    - Trimming specific moments or scenes from longer content
    - Building a library of clips from source footage
    - Need precise control over which parts of a video to use

    Each split creates a new asset that references the original video file but with specific trim points. This is efficient as it doesn't duplicate the actual video file.`,

    parameters: z.object({
        sourceAssetId: z.string().describe("ID of the source video asset to split"),
        segments: z.array(z.object({
            startTime: z.number().min(0).describe("Start time within source video (seconds)"),
            endTime: z.number().min(0).describe("End time within source video (seconds)"),
            name: z.string().describe("Name for the new trimmed clip"),
            description: z.string().optional().describe("Description of this segment"),
        })).describe("Array of segments to extract from the source video"),
        createNodes: z.boolean().optional().describe("Whether to create editor nodes for each segment (default true) - makes clips easy to drag onto timeline"),
        namePrefix: z.string().optional().describe("Prefix to add to all segment names (e.g., 'Highlight: ', 'Clip: ')"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; newAssets?: any[]; createdNodes?: string[] }> => {
        try {
            // Get the source asset
            const sourceAsset = await ctx.runQuery(api.assets.get, { id: args.sourceAssetId as Id<"assets"> });
            if (!sourceAsset) {
                return {
                    success: false,
                    message: "Source asset not found. Please provide a valid asset ID.",
                };
            }

            if (sourceAsset.type !== "video") {
                return {
                    success: false,
                    message: "Source asset must be a video file. This tool only works with video content.",
                };
            }

            // Validate segments
            const sourceDuration = sourceAsset.metadata?.duration;
            const invalidSegments = args.segments.filter(segment => {
                return segment.endTime <= segment.startTime ||
                    segment.startTime < 0 ||
                    (sourceDuration && segment.endTime > sourceDuration);
            });

            if (invalidSegments.length > 0) {
                return {
                    success: false,
                    message: `Invalid segments found: ${invalidSegments.map(s => s.name).join(', ')}. Check that start < end times and segments are within video duration.`,
                };
            }

            // Create new assets for each segment
            const newAssets = [];
            const createdNodes = [];

            for (const segment of args.segments) {
                const segmentName = args.namePrefix ? `${args.namePrefix}${segment.name}` : segment.name;
                const segmentDuration = segment.endTime - segment.startTime;

                // Create new asset record that references the original but with trim points
                const newAssetId = await ctx.runMutation(api.assets.create, {
                    projectId,
                    name: segmentName,
                    type: "video",
                    category: "artifact", // Mark as generated content
                    url: sourceAsset.url,
                    key: sourceAsset.key,
                    description: segment.description || `Trimmed segment from ${sourceAsset.name} (${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s)`,
                    metadata: {
                        ...sourceAsset.metadata,
                        duration: segmentDuration,
                        // Mark the trim points for this segment
                        trimStart: segment.startTime,
                        trimEnd: segment.endTime,
                        // Generation metadata
                        generationPrompt: `Extracted segment: ${segment.name}`,
                        generationModel: "video-split",
                        generationParams: {
                            sourceAssetId: args.sourceAssetId,
                            startTime: segment.startTime,
                            endTime: segment.endTime,
                        },
                    },
                });

                newAssets.push({
                    id: newAssetId,
                    name: segmentName,
                    duration: segmentDuration,
                    startTime: segment.startTime,
                    endTime: segment.endTime,
                });

                // Create editor node if requested
                if (args.createNodes !== false) {
                    const nodeId = await ctx.runMutation(api.nodes.createFromAsset, {
                        projectId,
                        assetId: newAssetId,
                        assetType: "video",
                    });
                    createdNodes.push(nodeId);
                }
            }

            const assetSummary = newAssets
                .map((asset, index) =>
                    `${index + 1}. **${asset.name}** (${asset.duration.toFixed(1)}s) - Trimmed from ${asset.startTime.toFixed(1)}s to ${asset.endTime.toFixed(1)}s`
                )
                .join('\n');

            const nodeMessage = args.createNodes !== false
                ? ` Editor nodes have been created for easy timeline placement.`
                : '';

            return {
                success: true,
                message: `✂️ Successfully split "${sourceAsset.name}" into ${newAssets.length} segments:\n\n${assetSummary}${nodeMessage}`,
                newAssets,
                createdNodes: args.createNodes !== false ? createdNodes : undefined,
            };

        } catch (error) {
            console.error('Error splitting video asset:', error);
            return {
                success: false,
                message: `Failed to split video: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});

/**
 * Reorder timeline assets to change the sequence and flow of the video
 */
export const reorderTimelineAssets = ({
    ctx,
    projectId,
}: ToolCtx) => tool({
    description: `Intelligently reorder clips on the timeline to improve story flow, pacing, or structure. Supports both simple reordering within tracks and complex cross-track reorganization.

    Use this when:
    - Improving story structure or narrative flow
    - Rearranging clips for better pacing
    - Moving content between different tracks
    - Creating a more logical sequence from existing clips
    - Fixing timeline organization issues
    - Optimizing the order of extracted video segments

    REORDERING MODES:
    - Within Track: Reorder clips on the same track (simple sequence changes)
    - Across Tracks: Move clips between different tracks (complex reorganization)

    TIMING OPTIONS:
    - Maintain Original: Keep existing start/end times (may create overlaps/gaps)
    - Sequential: Make clips play one after another with no gaps
    - Preserve Gaps: Sequential but maintain the original spacing between clips

    COMMON USE CASES:
    - "Reorder these clips to tell a better story"
    - "Move the conclusion to the beginning"
    - "Arrange clips chronologically"
    - "Put the most important clips first"
    - "Move this clip to a different audio track"`,

    parameters: z.object({
        reorderingType: z.enum(["within_track", "across_tracks"]).describe("Type of reordering to perform"),

        // Within track parameters
        trackId: z.string().optional().describe("Track ID for within_track reordering (e.g., 'video-1', 'audio-1')"),
        itemOrder: z.array(z.string()).optional().describe("Array of timeline item IDs in desired order (for within_track)"),

        // Across tracks parameters  
        trackAssignments: z.array(z.object({
            itemId: z.string().describe("Timeline item ID to move"),
            trackId: z.string().describe("Target track ID (e.g., 'video-2', 'audio-1')"),
            position: z.number().min(0).describe("Position within target track (0 = first, 1 = second, etc.)"),
        })).optional().describe("Track assignments for across_tracks reordering"),

        // Timing options
        timingMode: z.enum(["maintain_original", "sequential", "preserve_gaps"]).describe("How to handle timing after reordering"),
        gapDuration: z.number().min(0).optional().describe("Gap between clips in seconds for sequential mode (default 0)"),
    }),
    execute: async (args): Promise<{ success: boolean; message: string; reorderedItems?: any[]; conflictsResolved?: string[] }> => {
        try {
            // Validate parameters based on reordering type
            if (args.reorderingType === "within_track") {
                if (!args.trackId || !args.itemOrder) {
                    return {
                        success: false,
                        message: "For within_track reordering, both trackId and itemOrder are required.",
                    };
                }
                if (args.itemOrder.length === 0) {
                    return {
                        success: false,
                        message: "itemOrder cannot be empty.",
                    };
                }
            } else if (args.reorderingType === "across_tracks") {
                if (!args.trackAssignments || args.trackAssignments.length === 0) {
                    return {
                        success: false,
                        message: "For across_tracks reordering, trackAssignments array is required and cannot be empty.",
                    };
                }

                // Check for duplicate assignments
                const itemIds = args.trackAssignments.map(a => a.itemId);
                const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
                if (duplicates.length > 0) {
                    return {
                        success: false,
                        message: `Duplicate item assignments found: ${duplicates.join(', ')}. Each item can only be assigned once.`,
                    };
                }
            }

            // Execute the reordering
            const result = await ctx.runMutation(api.timelineEditing.reorderTimelineAssets, {
                projectId,
                reorderingType: args.reorderingType,
                trackId: args.trackId,
                itemOrder: args.itemOrder,
                trackAssignments: args.trackAssignments,
                timingMode: args.timingMode,
                gapDuration: args.gapDuration,
            });

            // Format response based on results
            let responseMessage = result.message;

            if (result.conflictsResolved && result.conflictsResolved.length > 0) {
                responseMessage += `\n\n⚠️ **Timing Conflicts Detected:**\n${result.conflictsResolved.join('\n')}`;

                if (args.timingMode === "maintain_original") {
                    responseMessage += "\n\n💡 Consider using 'sequential' timing mode to eliminate overlaps.";
                }
            }

            if (result.reorderedItems && result.reorderedItems.length > 0) {
                const reorderedList = result.reorderedItems
                    .map((item, index) => `${index + 1}. ${item.name} (${item.startTime.toFixed(1)}s - ${item.endTime.toFixed(1)}s)`)
                    .join('\n');
                responseMessage += `\n\n📋 **Reordered Items:**\n${reorderedList}`;
            }

            return {
                success: result.success,
                message: responseMessage,
                reorderedItems: result.reorderedItems,
                conflictsResolved: result.conflictsResolved,
            };

        } catch (error) {
            console.error('Error reordering timeline assets:', error);
            return {
                success: false,
                message: `Failed to reorder timeline assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
});
