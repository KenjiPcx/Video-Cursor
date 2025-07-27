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
10. **Timeline Editing**: Add drag-and-drop, trimming, and gap management (NEXT)
11. **Asset-Scene Linking**: Connect real assets to draft scenes

### Recent Completions (✅)
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

### Recent Updates (✅ ARCHITECTURE COMPLETE)
- **Decoupled Node-Asset Architecture** (✅ Complete):
  - **Clean Separation**: Assets are pure file records, nodes are UI/graph elements only
  - **Simplified Upload**: `upload.store` always just creates assets with consistent return type
  - **Explicit Node Creation**: New `nodes.createFromAsset` helper for when nodes are needed
  - **Removed Complexity**: Eliminated `storeWithoutNode`, `createWithoutNode` variants
  
- **Enhanced Loading Node System** (✅ Complete):
  - Added `"generatingAsset"` node type for immediate loading feedback
  - AI generation creates loading nodes instantly, then updates them when complete
  - **New Functions**:
    - `nodes.createGeneratingNode` - creates loading node with generation metadata
    - `nodes.updateGeneratingNodeToAsset` - updates loading node to final asset node  
    - `nodes.createFromAsset` - explicit node creation from existing assets
  
- **Updated AI Generation Flow** (✅ Complete):
  1. **Schedule** → **Loading node appears instantly** → **Node updates when done**
  2. All 4 AI tools use loading pattern (Runway, Flux, Hailuo, Fish Audio)
  3. Clean asset creation without auto-node complexity
  
- **Ready for Testing**: Decoupling complete! All linter errors resolved. Push changes to regenerate Convex API types, then test improved UX.

## Development Commands

### Development workflow
Always design and propose your solution first, talking about the different ways to implement, their pros and cons, or ask clarifying questions to get my confirmation before proceeding

Never call the run commands to build and dev the app, let me do that myself

### Convex tips
Never use the return field for queries, actions or mutations

### Development Server
```bash
npm run dev          # Start both frontend and backend in parallel
npm run dev:frontend # Start Next.js frontend only
npm run dev:backend  # Start Convex backend only
```

### Build and Deploy
```bash
npm run build  # Build Next.js app for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

### Setup
```bash
npm install    # Install dependencies
npm run predev # Initialize Convex, run setup script, open dashboard
```

### Environment Variables
Required for AI asset generation:
```bash
# Add to .env.local or Convex dashboard
REPLICATE_API_TOKEN=your_replicate_token_here
FISH_AUDIO_API_KEY=your_fish_audio_key_here
```

Get API keys from:
- [Replicate](https://replicate.com/account/api-tokens) for image/video generation
- [Fish Audio](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech) for voice generation