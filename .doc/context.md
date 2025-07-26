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

### Next Steps
1. **Frontend Components**: Update the graph component to display video timeline
2. **Asset Upload**: Implement file upload functionality
3. **Timeline UI**: Design timeline visualization for video editing
4. **Chat Integration**: Connect the existing chat to video editing tools

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