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
        referenceTags: z.array(z.string()).optional().describe("Array of tags that correspond to elements in reference images (e.g., ['park', 'woman', 'man'])"),
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
