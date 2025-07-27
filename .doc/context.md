# CLAUDE.md

This file provides guidance to you when working with code in this repository.
Use it as your memory, write back to it with your progress

## Idea

Cursor For Videos
- Talk to edit your videos, B-roll, cutting, applying LUTs
- Talk to plan your scenes
- Talk to animation
- Talk to add your footage
- Assets
- Voice generation
- Talk to remotion to stitch and render

### User Story

1. I have a bunch of footage, I want to cut them and clip or autofarm
2. I want to create a story
    1. I ask for a script and refine it, it appears on the grid
    2. Each scene has background, audio, video
        1. AI has tools to get these
            1. Background → Static or generate with AI (pic + animate)
            2. Audio → Generate with AI or 
            3. Video → Generate with AI
                1. I might need to act for it
    3. AI Stitches them all together on remotion
    4. Renders and post

Do I want to focus on AI video?

- Generate a story
- Edit it
- Apply AI
- Record myself with some conditioning
- Veo3 for background / b-roll
- Picture for broll and then animate
- Apply AI Filters
- Upscale
- DeepFake

Or do I want to focus on personal video editing?

- Apply LUTs
- Trim video with text

### Tools

- Add scenes, joined with previous scenes, add a bunch of potential ones, then we can delete them
- Generate a an image
- Generate AI voices
- Generate video with reference motion
- Generate video
- Generate audio
- Generate animations?
- Update scene object
- Remove background
- Apply LUT through filters

### Scene Data struct

Ideally quick access and also can overlay
Just use a struct like the actual timeline, probably an array of timelines where timeline can be audio or video
Each timeline can have objects within it which are the assets with a start time and an end time of the actual video, if we crop, then we should also include the start time and end time of the asset?

Then we just pass the array to remotion player and render on the UI

## Demo

Text to editing

## Backend Architecture (✅ COMPLETED)

### Schema Structure
- **Projects**: Core project management with timeline data
- **Artifact Assets**: Project-specific assets (uploads, generated content)
- **Static Assets**: Reusable assets across projects with tagging system
- **Nodes**: Video editor graph nodes for scene planning and asset organization

### CRUD Operations
✅ **Projects** (`convex/projects.ts`):
- create, get, list, listByStatus, update, remove
- Cascade deletes artifact assets when project is removed
- Timeline data stored as flexible JSON

✅ **Artifact Assets** (`convex/artifactAssets.ts`):
- create, get, listByProject, listByProjectAndType, update, remove
- Support for both external URLs and Convex file storage
- Metadata for video properties (duration, dimensions, etc.)
- getSignedUrl for secure access to stored files

✅ **Static Assets** (`convex/staticAssets.ts`):
- create, get, list, listByType, update, remove
- Tag-based categorization and search
- Name-based search functionality
- getAllTags for tag management
- getSignedUrl for secure access

✅ **Nodes** (`convex/nodes.ts`):
- create, get, listByProject, updatePosition, updateData, remove
- createDraftNode for AI-generated scene concepts
- Support for starting, draft, videoAsset, and imageAsset node types

### Video Editor Graph System (✅ COMPLETED)

#### **Hybrid Drafting → Production Workflow**
- **Graph Layer**: AI-generated scene concepts, visual story flow
- **Timeline Layer**: Real assets, precise timing, production-ready

#### **Node Types**:
1. **🟢 Starting Node**: Timeline root, auto-created per project
2. **🟠 Draft Node**: AI-generated scene concepts with detailed descriptions
3. **🔵 Video Asset Node**: Uploaded video files with metadata
4. **🟣 Image Asset Node**: Uploaded image files with previews

#### **AI Integration**:
- **createDraftScene Tool**: AI can add detailed scene descriptions to projects
- **Real-time Updates**: Nodes appear instantly via Convex real-time sync
- **Detailed Descriptions**: AI creates cinematic scene descriptions with camera angles, lighting, etc.

#### **Features**:
- **Drag & Connect**: Visual node connections for story flow
- **Main Timeline**: Only nodes connected to starting node appear in timeline
- **Toggleable Timeline**: Bottom panel shows linear sequence
- **Auto-positioning**: New nodes auto-arrange spatially

### AI Timeline Editing Tools (✅ 7 TOOLS COMPLETED - FINAL)

#### **1. LUT/Filter Tool** (✅ COMPLETED):
- **Composition-level Filters**: Apply CSS filters to entire video composition
- **Data Structure**: Added `CompositionFilters` interface to timeline data with support for:
  - Contrast (0.5-2.0), Saturation (0.0-3.0), Brightness (0.5-2.0)
  - Hue Rotate (-180-180°), Sepia (0.0-1.0), Blur (0-10px)
  - Grayscale (0.0-1.0), Invert (0.0-1.0)
- **Remotion Integration**: Filters applied to root `AbsoluteFill` component for real-time preview
- **AI Tool**: `applyCompositionFilter` with preset support (cinematic, vintage, cool, warm, noir, dreamy)
- **Backend**: `convex/timelineEditing.ts` with validation and error handling
- **CSS Conversion**: Automatic conversion from filter object to CSS filter string

#### **2. Place Asset Tool** (✅ COMPLETED):
- **Generic Asset Placement**: Place any asset (video, audio, image) on timeline with precise control
- **Data Structure**: Extended `TimelineItem` interface with overlay positioning and enhanced properties:
  - Overlay positioning: x, y, width, height, zIndex (pixel-perfect positioning)
  - Enhanced audio/visual: volume (0.0-2.0), opacity (0.0-1.0)
  - Asset trimming: assetStartTime/assetEndTime for cropping source material
- **Auto-Track Assignment**: Smart track assignment with conflict detection and auto-creation
- **Remotion Integration**: Full overlay positioning support with absolute positioning
- **AI Tool**: `placeAssetOnTimeline` with comprehensive validation and common use case examples
- **Backend**: Complete mutation with conflict resolution, track management, and timeline duration updates

#### **3. Target Modify Tool** (✅ COMPLETED):
- **Comprehensive Asset Modification**: Modify any property of existing timeline assets
- **Modification Capabilities**: Timeline positioning, overlay adjustments, audio/visual properties, asset trimming, track movement
- **Smart Conflict Detection**: Prevents overlapping when moving assets between tracks
- **Schema Upgrade**: Updated timeline data validators to comprehensive new structure with tracks, overlays, and filters
- **AI Tool**: `modifyTimelineAsset` with detailed validation and use case guidance
- **Backend**: Complete mutation with change tracking and detailed feedback messages

#### **4. Extract Interesting Segments Tool** (✅ COMPLETED):
- **AI-Powered Transcript Analysis**: Automatically identify engaging moments from video transcripts
- **Intelligent Segmentation**: Uses LLM to analyze speech patterns, content quality, and engagement factors
- **Customizable Criteria**: Filter for specific types of content (funny moments, key insights, emotional peaks)
- **Engagement Scoring**: Ranks segments by interest level (1-10 scale) with detailed reasoning
- **Smart Timing**: Configurable segment length (5-60s) with minimum gap detection to avoid overlaps
- **AI Tool**: `extractInterestingSegments` with comprehensive analysis and structured output
- **Data Requirements**: Requires video with transcription data (auto-generated via Whisper)

#### **5. Split Video Asset Tool** (✅ COMPLETED):
- **Efficient Video Splitting**: Create multiple trimmed clips from source video without file duplication
- **Virtual Trimming**: New assets reference original file with trim metadata (trimStart/trimEnd)
- **Batch Processing**: Split multiple segments simultaneously with automatic naming
- **Node Integration**: Auto-creates editor nodes for easy drag-and-drop timeline placement
- **Metadata Preservation**: Maintains original video metadata while adding trim and generation info
- **AI Tool**: `splitVideoAsset` with validation and comprehensive segment management
- **Schema Support**: Extended asset metadata with trimStart/trimEnd fields for split tracking

#### **6. Reorder Timeline Tool** (✅ COMPLETED):
- **Intelligent Clip Sequencing**: Reorder clips to improve story flow, pacing, and narrative structure
- **Dual Reordering Modes**: 
  - Within Track: Simple sequence changes on same track
  - Across Tracks: Complex reorganization between different tracks
- **Advanced Timing Options**:
  - Maintain Original: Keep existing timing (may create overlaps/gaps)
  - Sequential: Make clips play consecutively with no gaps
  - Preserve Gaps: Sequential but maintain original spacing between clips
- **Smart Conflict Detection**: Identifies and reports timing conflicts with resolution suggestions
- **AI Tool**: `reorderTimelineAssets` with comprehensive validation and flow optimization guidance
- **Backend**: Complete mutation with gap preservation, conflict resolution, and detailed change tracking

#### **7. Background Removal Tool** (✅ COMPLETED - FINAL):
- **Unified Image & Video Processing**: AI-powered background removal for both images and videos using specialized models
- **Smart Model Selection**: Automatically chooses appropriate Replicate model based on asset type:
  - Images: `lucataco/remove-bg` for high-quality image background removal
  - Videos: `nateraw/video-background-remover` for video background isolation
- **Professional Output**: Creates assets with removed/transparent backgrounds perfect for overlays and compositing
- **Subject Preservation**: AI intelligently preserves main subjects (people, objects) while removing backgrounds
- **Versatile Use Cases**: Perfect for both static graphics and dynamic video content
- **AI Tool**: `removeBackground` with unified interface for images and videos
- **Fire-and-Forget Architecture**: Instant loading node creation with background processing and automatic asset updates

🎬 **COMPLETE AI VIDEO EDITOR**: All 7 core video editing tools implemented for professional video production workflows!

### Next Steps  
1. ✅ **Asset Upload**: Implemented Cloudflare R2 upload with project association
2. ✅ **Project Management**: Projects now linked to chat threads (1:1 relationship)
3. ✅ **Chat Integration**: Chat now passes projectId for video editing context
4. ✅ **Video Editor Graph**: Implemented hybrid graph/timeline system
5. ✅ **AI Scene Creation**: AI can create draft scene nodes via chat
6. ✅ **Node Connections**: Save/load edge connections between nodes with auto-linking
7. ✅ **Editor Refactoring**: Split 716-line component into modular pieces (Phase 1 & 2 complete)
8. ✅ **Enhanced Timeline Display**: Show actual assets with previews, duration, and proper sequencing  
9. ✅ **Remotion Integration**: Create composition and player for timeline rendering
10. ✅ **LUT/Filter Tool**: Apply composition-level filters with presets and real-time preview
11. ✅ **Place Asset Tool**: Generic asset placement with overlay positioning, auto-track assignment, and trimming
12. ✅ **Target Modify Tool**: Modify existing timeline asset properties with smart conflict detection
13. ✅ **Reorder Tool**: Intelligent clip sequencing with dual modes and advanced timing options
14. ✅ **AI Video Editing Tools**: Complete professional video editing toolkit with 6 core tools
15. **Timeline UI**: Add drag-and-drop, trimming, and gap management (NEXT)
16. **Asset-Scene Linking**: Connect real assets to draft scenes

### Recent Completions (✅)
- **Asset Library Implementation**: Created floating panel system for asset management
  - **Floating Panel Design**: Toggleable panel in left-center area (320px wide, max 70vh height)
  - **Visual Asset Cards**: Thumbnail previews, metadata display, search functionality
  - **Asset Descriptions**: Added description field with inline editing for better AI context
  - **Drag & Drop Integration**: Assets draggable from library to canvas with automatic node creation
  - **Panel Controls**: Toggle button and close button with proper positioning and styling
- **R2 Integration**: Files upload to Cloudflare R2 and store metadata in assets table
- **Project-Thread Linking**: Each project has a dedicated chat thread
- **Upload Flow**: MultimodalInput now uploads files to project-specific storage
- **Schema Updates**: Moved from Convex storage to R2 keys, updated validators
- **UI Improvements**: 
  - Added project creation modal instead of automatic creation
  - Stacked project/thread selectors vertically for better layout
  - Removed "active thread" concept (unnecessary for single-user app)
  - Simplified thread selection to just pick most recent thread
- **Video Editor Graph System**:
  - Implemented React Flow-based visual editor
  - Created 4 node types with drag-and-drop connections
  - Added AI tool for creating draft scene nodes
  - Real-time node updates via Convex
  - Toggleable timeline view showing main sequence
- **Edge Connection System**:
  - Added `edges` table with proper indexes for node connections
  - Implemented complete CRUD operations for edge management
  - Auto-linking: New AI draft scenes automatically connect to timeline
  - Timeline queries: Find main story path and last node in sequence
  - Cascade deletion: Removing nodes cleans up all connected edges
  - Real-time sync ready for React Flow integration
- **AI Asset Generation System** (✅):
  - Added `category` field to assets table ("upload" vs "artifact")  
  - Integrated Replicate SDK for AI generation via fire-and-forget pattern
  - **5 AI Tools** (4 Generation + 1 Discovery):
    - **Runway Gen4**: Reference-based image generation (combines multiple images with tags)
    - **Flux Kontext Pro**: Context-aware image transformation and styling  
    - **Hailuo-02**: Cost-effective short video generation
    - **Fish Audio TTS**: High-quality voice narration with voice model discovery and custom voice selection
    - **Voice Model Search**: Discover and browse available Fish Audio voice models by language, characteristics, and popularity
  - **Fire-and-Forget Architecture**: 
    - Agent tools respond immediately, schedule background generation via `ctx.scheduler.runAfter`
    - Background actions handle API calls and asset saving
    - Graceful error handling with console logging
  - **Centralized Asset Storage**: 
    - All asset creation (uploads + AI-generated) handled through single `upload.store` action
    - Generation metadata (prompt, model, params) automatically saved with artifacts
    - No duplicate API calls - clean, single-responsibility design
  - **Agent Tools Integration**: 
    - AI can intelligently choose between models based on user requests
    - Voice discovery: Search Fish Audio models by language, tags, or characteristics
    - Custom voice generation: Use specific voice models by reference ID
  - **Environment Variables Required**:
    - `REPLICATE_API_TOKEN` for Replicate models
    - `FISH_AUDIO_API_KEY` for Fish Audio TTS
- **Video Editor Refactoring** (✅):
  - **Phase 1**: Fixed edge hover detection, added node deletion, extracted state management
    - Created `CustomEdge` component with invisible hover overlay for reliable mouse events
    - Created `NodeWrapper` component with hover delete buttons (except starting nodes)
    - Extracted `useEditorState` hook for centralized edge/node operations
    - Added comprehensive console logging for debugging hover issues
  - **Phase 2**: Extracted UI components and upload logic
    - Created `TimelinePanel` component for modular timeline display
    - Created `UploadOverlay` component with drag & drop functionality
    - Extracted `useFileUpload` hook for centralized upload logic
    - Memoized nodeTypes/edgeTypes to fix React Flow performance warnings
  - **Results**: 716 → 433 lines (40% reduction), better separation of concerns, debuggable hover events
- **Asset-Node Positioning Fix** (✅):
  - **Issue**: Uploaded assets displayed on canvas but couldn't be dragged (asset ID vs node ID confusion)
  - **Root Cause**: Assets saved to database but no corresponding nodes created, editor created temporary visual nodes using asset IDs
  - **Solution**: Modified `convex/assets.ts` create mutation to automatically create real nodes for video/image assets
  - **Implementation**: 
    - Auto-create nodes with proper positioning (grid layout) when visual assets uploaded
    - Removed temporary asset node creation logic from editor
    - Updated upload flow comments to reflect new behavior
  - **Result**: Uploaded assets now have real node IDs and can be properly dragged/positioned
- **Enhanced Asset Nodes** (✅):
  - **Features**: Made image and video asset nodes bigger, resizable, and interactive
  - **Size Improvements**: 
    - Increased from 160-200px to 240px minimum width
    - Increased preview area height from 80px to 128px (h-32)
    - Larger icons and better visual hierarchy
  - **Resizing Capability**:
    - Added React Flow NodeResizer component with 240px-500px width range
    - Resizer handles appear when nodes are selected
    - Color-coded resize handles (blue for video, purple for image)
  - **Double-Click Details Panel**:
    - Created comprehensive AssetDetailsPanel component
    - Shows full-size preview (video with controls, images)
    - Displays complete metadata (dimensions, file size, duration, MIME type, asset ID)
    - Download functionality with proper file naming
    - Responsive modal design with proper overflow handling
  - **Visual Enhancements**:
    - Added hover effects with expand icon hints
    - Better preview areas with actual asset thumbnails/videos
    - Improved spacing and typography
    - Added "px" suffix to dimensions for clarity
  - **Integration**: Seamless state management in editor graph with proper cleanup
- **Multi-Track Timeline System** (✅):
  - **Professional Multi-Track Design**: Redesigned timeline to support multiple video and audio tracks
    - Multiple video tracks (Video 1, Video 2) for layering and compositing
    - Dedicated audio tracks (Audio 1) for background music, voiceovers, effects
    - Track headers with mute/lock controls and visual track type indicators
    - Proper track lanes separated by color coding (blue=video, green=audio)
  - **Absolute Positioning System**: Items positioned by absolute time, not sequential placement
    - Timeline items have `startTime` and `endTime` for precise positioning
    - Support for gaps, overlaps on different tracks, and free positioning
    - Asset trimming support with `assetStartTime`/`assetEndTime` for cropping
    - Pixel-based positioning with configurable timeline scale (50px/second default)
  - **Professional Timeline UI**: Industry-standard timeline interface
    - Time ruler with 5-second tick marks and MM:SS formatting
    - Fixed track headers (128px) with scrollable timeline content
    - Minimum item width (60px) for readability with overflow handling
    - Hover tooltips showing item details, start time, and duration
    - Color-coded items: blue=video, purple=image, green=audio, orange=draft
  - **Timeline Data Architecture**: Flexible data structure for video editing
    - `TimelineData` interface with tracks, duration, and scale properties
    - `TimelineTrack` with ID, type, name, and items array
    - `TimelineItem` with unique IDs, asset references, and positioning data
    - Support for conversion to `vTimelineData` format for Remotion rendering
  - **Graph Integration**: Connected nodes auto-populate timeline as starting point
    - `populateTimelineFromGraph()` traverses graph and places items sequentially
    - Users can then freely edit, move, and arrange items on multiple tracks
    - Clean separation between asset library (graph) and timeline editing
- **Remotion Timeline Player** (✅):
  - **Custom Composition**: Created `TimelineComposition.tsx` for rendering timeline data
    - Supports video, image, audio, and draft asset types
    - Handles asset trimming with `assetStartTime`/`assetEndTime` properties
    - Multi-track rendering with proper layering (video tracks stack, audio tracks mix)
    - Background support for images or looping videos
  - **Timeline Data Conversion**: Schema matching between timeline and Remotion
    - Zod schemas ensure type safety between timeline utils and Remotion props
    - `convertToRemotionProps()` transforms timeline data to composition format
    - Frame-based timing conversion (seconds → frames at 30fps)
  - **Remotion Root Integration**: Added Timeline composition alongside ShortsFarm
    - Simple 10-second default example with draft scenes
    - 1920x1080 format for standard video output
    - `calculateTimelineMetadata` for dynamic duration based on timeline content
  - **Preview Integration**: Timeline panel includes preview functionality
    - Preview button converts timeline data and logs to console
    - Data validation ensures only timelines with content can be previewed
    - Ready for integration with Remotion Studio or preview player
- **Video Playback Controls** (✅):
  - **Quick Preview on Nodes**: Click-to-play/pause directly on video asset nodes
    - Visual play/pause overlay with smooth transitions
    - Muted playback for quick previews
    - "Playing" indicator badge when active
    - Hover controls that fade in/out intelligently
  - **Auto-Pause System**: Global video state management ensures only one video plays at a time
    - Automatic pausing of other videos when starting a new one
    - Clean state management with proper cleanup on unmount
    - Tracks all video instances across the entire editor
  - **Enhanced Modal Player**: Upgraded AssetDetailsPanel for video-focused experience
    - Larger video player (up to 500px height vs 256px for images)
    - Keyboard shortcuts: Space/K (play/pause), ← → (seek ±10s), F (fullscreen)
    - Fullscreen button in header for easy access
    - Video-specific UI hints and instructions
    - Wider modal (max-w-4xl) for better video viewing experience
  - **Seamless Integration**: Both node preview and modal player work together cohesively
- **Video Transcription & AI Segment Extraction** (✅):
  - **OpenAI Whisper Integration**: Automatic video transcription with 5-second SRT caption groupings
    - Parallel processing: Visual analysis (Gemini) + transcription (Whisper) run simultaneously
    - Industry-standard SRT format with proper timing (`HH:MM:SS,mmm`)
    - Complete data storage: Raw Whisper response + formatted SRT in asset metadata
    - Extended schema: Added `transcription` field with srt, duration, model, timestamps
  - **AI-Powered Segment Analysis**: Extract interesting moments using transcript analysis
    - LLM analyzes speech patterns, content quality, engagement factors
    - Configurable criteria: Funny moments, key insights, emotional peaks, action sequences
    - Engagement scoring (1-10 scale) with detailed reasoning for each segment
    - Smart timing: Customizable segment length (5-60s) with minimum gap detection
  - **Efficient Video Splitting**: Create trimmed clips without file duplication
    - Virtual trimming: New assets reference original file with trim metadata
    - Batch processing: Split multiple segments simultaneously with automatic naming
    - Node integration: Auto-creates editor nodes for easy timeline placement
    - Metadata preservation: Maintains original properties while adding trim/generation info
  - **Complete Workflow**: Upload video → Auto-transcribe → Analyze segments → Split clips → Place on timeline
    - Two new AI tools: `extractInterestingSegments` and `splitVideoAsset`
    - Schema support: Extended metadata with `trimStart`/`trimEnd` fields
    - Environment requirement: `OPENAI_API_KEY` for Whisper transcription
- **AI Background Removal** (✅):
  - **Unified Image & Video Processing**: AI-powered background removal for both images and videos using specialized models
    - Images: Uses `lucataco/remove-bg` for high-quality image background removal  
    - Videos: Uses `nateraw/video-background-remover` for video background isolation
    - Smart model selection automatically chooses appropriate tool based on asset type
    - Fire-and-forget architecture with instant loading feedback and background processing
  - **Professional Output Quality**: Creates clean assets with transparent backgrounds
    - Automatically detects and removes backgrounds while preserving main subjects
    - Perfect for overlays, compositing, and green screen effects
    - Maintains original asset quality with professional results
  - **Seamless Integration**: Works with any image or video asset through unified interface
    - Single tool handles both image and video background removal
    - Auto-creates editor nodes for easy timeline placement
    - Maintains full metadata and generation tracking for asset management
  - **Versatile Use Cases**: Essential for modern content creation workflows
    - Create overlay graphics and videos for presentations and social media
    - Prepare assets for advanced compositing workflows
    - Generate transparent elements for tutorials and marketing content
    - Build professional content elements without green screen equipment