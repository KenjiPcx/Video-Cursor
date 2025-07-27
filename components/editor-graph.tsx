import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useReactFlow,
    useNodesInitialized,
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    NodeTypes,
    EdgeTypes,
} from '@xyflow/react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import StartingNode, { type StartingNode as StartingNodeType } from './nodes/starting-node';
import DraftNode, { type DraftNode as DraftNodeType } from './nodes/draft-node';
import VideoAssetNode, { type VideoAssetNode as VideoAssetNodeType } from './nodes/video-asset-node';
import ImageAssetNode, { type ImageAssetNode as ImageAssetNodeType } from './nodes/image-asset-node';
import AudioAssetNode, { type AudioAssetNode as AudioAssetNodeType } from './nodes/audio-asset-node';
import GeneratingNode, { type GeneratingNode as GeneratingNodeType } from './nodes/generating-node';
import { NodeWrapper } from './nodes/node-wrapper';
import { CustomEdge } from './edges/custom-edge';
import { TimelinePanel } from './timeline/timeline-panel';
import { AssetDetailsPanel } from './asset-details-panel';
import { AssetLibrary } from './asset-library';
import { useEditorState } from '../hooks/use-editor-state';
import { useFileUpload } from '../hooks/use-file-upload';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, Upload, RefreshCw, Library, X } from 'lucide-react';

import '@xyflow/react/dist/style.css';
import { Id } from '@/convex/_generated/dataModel';

export type EditorNodeType = StartingNodeType | DraftNodeType | VideoAssetNodeType | ImageAssetNodeType | AudioAssetNodeType | GeneratingNodeType;

interface EditorGraphProps {
    threadId: string;
    projectId: Id<"projects">;
    onNodeSelect?: (nodeId: string, nodeData: any) => void;
    highlightedNodes?: Set<string>;
    selectedNode?: string | null;
}

function EditorGraphFlow({ threadId, projectId, onNodeSelect, highlightedNodes, selectedNode }: EditorGraphProps) {
    const { fitView } = useReactFlow();
    const initialized = useNodesInitialized();
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showAssetLibrary, setShowAssetLibrary] = useState(false);

    // Asset details panel state
    const [assetDetailsPanel, setAssetDetailsPanel] = useState<{
        isOpen: boolean;
        assetId?: Id<"assets">;
    }>({ isOpen: false });

    // Get project data for timeline
    const projectData = useQuery(api.projects.get, {
        id: projectId,
    });

    // Get nodes from database
    const projectNodes = useQuery(api.nodes.listByProject, {
        projectId: projectId,
    });

    // Get edges from database
    const projectEdges = useQuery(api.edges.listByProject, {
        projectId: projectId,
    });

    // Get assets for this project (for asset nodes)
    const projectAssets = useQuery(api.assets.listByProject, {
        projectId: projectId,
    });

    // Mutation to create starting node
    const createNode = useMutation(api.nodes.create);

    // Use file upload hook
    const { uploading, handleFileUpload, handleDrop, handleDragOver } = useFileUpload({
        projectId,
    });

    // URL refresh mutation
    const refreshUrls = useMutation(api.assets.refreshProjectUrls);
    const [refreshing, setRefreshing] = useState(false);

    // Convert database edges to React Flow edges
    const flowEdges = useMemo(() => {
        if (!projectEdges) return [];

        return projectEdges.map((dbEdge) => ({
            id: dbEdge._id,
            source: dbEdge.sourceNodeId,
            target: dbEdge.targetNodeId,
            type: 'default',
            style: { stroke: '#6b7280', strokeWidth: 2 },
            animated: false,
        }));
    }, [projectEdges]);

    // Convert database nodes to React Flow nodes
    const flowNodes = useMemo(() => {
        if (!projectData || !projectNodes) return [];

        const nodes: EditorNodeType[] = [];

        // Function to handle asset details click
        const handleAssetDetailsClick = (dbNode: any) => {
            setAssetDetailsPanel({
                isOpen: true,
                assetId: dbNode.data.assetId,
            });
        };

        // Check if starting node exists, if not we'll create one
        const hasStartingNode = projectNodes.some(node => node.type === 'starting');

        // Convert database nodes to flow nodes
        projectNodes.forEach((dbNode) => {
            if (dbNode.type === 'starting') {
                nodes.push({
                    id: dbNode._id,
                    type: 'starting',
                    position: dbNode.position,
                    data: dbNode.data,
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            } else if (dbNode.type === 'draft') {
                nodes.push({
                    id: dbNode._id,
                    type: 'draft',
                    position: dbNode.position,
                    data: dbNode.data,
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            } else if (dbNode.type === 'videoAsset') {
                nodes.push({
                    id: dbNode._id,
                    type: 'videoAsset',
                    position: dbNode.position,
                    data: {
                        ...dbNode.data,
                        onDetailsClick: () => handleAssetDetailsClick(dbNode),
                    },
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            } else if (dbNode.type === 'imageAsset') {
                nodes.push({
                    id: dbNode._id,
                    type: 'imageAsset',
                    position: dbNode.position,
                    data: {
                        ...dbNode.data,
                        onDetailsClick: () => handleAssetDetailsClick(dbNode),
                    },
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            } else if (dbNode.type === 'audioAsset') {
                nodes.push({
                    id: dbNode._id,
                    type: 'audioAsset',
                    position: dbNode.position,
                    data: {
                        ...dbNode.data,
                        onDetailsClick: () => handleAssetDetailsClick(dbNode),
                    },
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            } else if (dbNode.type === 'generatingAsset') {
                nodes.push({
                    id: dbNode._id,
                    type: 'generatingAsset',
                    position: dbNode.position,
                    data: dbNode.data,
                    className: highlightedNodes?.has(dbNode._id) ? 'highlighted' : '',
                });
            }
        });

        // NOTE: Removed temporary asset node creation logic since real nodes 
        // are now automatically created when assets are uploaded
        // (see convex/assets.ts create mutation)

        return nodes;
    }, [projectData, projectNodes, projectAssets, highlightedNodes]);

    // Use the editor state hook
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onEdgeDelete,
        onNodeDelete,
        createFromAsset
    } = useEditorState({
        projectId,
        flowNodes,
        flowEdges,
    });

    // Handle asset drop from library to canvas
    const handleAssetDrop = useCallback(async (assetId: Id<"assets">, position: { x: number, y: number }) => {
        try {
            // Find the asset to determine its type
            const asset = projectAssets?.find(a => a._id === assetId);
            if (!asset) return;

            // Use createFromAsset mutation to properly populate node data
            await createFromAsset({
                projectId,
                assetId,
                assetType: asset.type as "video" | "audio" | "image",
                position
            });
        } catch (error) {
            console.error("Failed to create node from asset:", error);
        }
    }, [createFromAsset, projectId, projectAssets]);

    // Memoize node and edge types to prevent React Flow re-renders
    const nodeTypes: NodeTypes = useMemo(() => ({
        starting: (props) => (
            <NodeWrapper node={props} onDelete={() => { }} isDeletable={false}>
                <StartingNode {...props} />
            </NodeWrapper>
        ),
        draft: (props) => (
            <NodeWrapper node={props} onDelete={onNodeDelete}>
                <DraftNode {...props} />
            </NodeWrapper>
        ),
        videoAsset: (props) => (
            <NodeWrapper node={props} onDelete={onNodeDelete}>
                <VideoAssetNode {...props} />
            </NodeWrapper>
        ),
        imageAsset: (props) => (
            <NodeWrapper node={props} onDelete={onNodeDelete}>
                <ImageAssetNode {...props} />
            </NodeWrapper>
        ),
        audioAsset: (props) => (
            <NodeWrapper node={props} onDelete={onNodeDelete}>
                <AudioAssetNode {...props} />
            </NodeWrapper>
        ),
        generatingAsset: (props) => (
            <NodeWrapper node={props} onDelete={onNodeDelete}>
                <GeneratingNode {...props} />
            </NodeWrapper>
        ),
    }), [onNodeDelete]);

    const edgeTypes: EdgeTypes = useMemo(() => ({
        default: (props) => (
            <CustomEdge {...props} onDelete={onEdgeDelete} />
        ),
    }), [onEdgeDelete]);


    // Create starting node if it doesn't exist
    useEffect(() => {
        if (projectData && projectNodes) {
            const hasStartingNode = projectNodes.some(node => node.type === 'starting');
            if (!hasStartingNode) {
                createNode({
                    projectId: projectId,
                    type: 'starting',
                    position: { x: 100, y: 200 },
                    data: {
                        label: 'Start Timeline',
                    },
                });
            }
        }
    }, [projectData, projectNodes, projectId, createNode]);

    // Fit view when nodes are initialized
    useEffect(() => {
        if (initialized && flowNodes.length > 0) {
            setTimeout(() => fitView({ duration: 1000, padding: 0.2 }), 100);
        }
    }, [initialized, flowNodes.length, fitView]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        onNodeSelect?.(node.id, node.data);
    }, [onNodeSelect]);

    const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
        setHoveredNode(node.id);
    }, []);

    const handleNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, []);

    const handleRefreshUrls = useCallback(async () => {
        if (refreshing) return;

        setRefreshing(true);
        try {
            const result = await refreshUrls({ projectId });
            console.log('URLs refreshed:', result);
            // You could add a toast notification here if you have a toast system
        } catch (error) {
            console.error('Failed to refresh URLs:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshUrls, projectId, refreshing]);

    // Handle drag and drop on canvas
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();

        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));
            if (data.type === 'asset' && data.assetId) {
                // Get the drop position relative to the canvas
                const reactFlowBounds = event.currentTarget.getBoundingClientRect();
                const position = {
                    x: event.clientX - reactFlowBounds.left,
                    y: event.clientY - reactFlowBounds.top,
                };

                handleAssetDrop(data.assetId, position);
            }
        } catch (error) {
            console.error('Failed to parse drop data:', error);
        }
    }, [handleAssetDrop]);

    if (!projectData) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                Loading video editor...
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <style jsx global>{`
                .react-flow__node {
                    z-index: 1;
                }
                .react-flow__node:hover {
                    z-index: 1000 !important;
                }
                .highlighted {
                    filter: drop-shadow(0 0 8px #fbbf24);
                }
                .react-flow__edge {
                    pointer-events: all;
                    cursor: pointer;
                }
                .react-flow__edge:hover {
                    stroke: #3b82f6 !important;
                    stroke-width: 3px !important;
                }
                .react-flow__edge.selected {
                    stroke: #10b981 !important;
                    stroke-width: 3px !important;
                }
                /* Node Resizer Styles for better visibility */
                .react-flow__resize-control {
                    background: white !important;
                    border: 2px solid #3b82f6 !important;
                    border-radius: 4px !important;
                    width: 12px !important;
                    height: 12px !important;
                    opacity: 1 !important;
                }
                .react-flow__resize-control:hover {
                    background: #3b82f6 !important;
                    transform: scale(1.2);
                }
                .react-flow__resize-control.nodrag {
                    cursor: nw-resize !important;
                }
                .react-flow__resize-control.top {
                    cursor: n-resize !important;
                }
                .react-flow__resize-control.bottom {
                    cursor: s-resize !important;
                }
                .react-flow__resize-control.left {
                    cursor: w-resize !important;
                }
                .react-flow__resize-control.right {
                    cursor: e-resize !important;
                }
                .react-flow__resize-control.top.left {
                    cursor: nw-resize !important;
                }
                .react-flow__resize-control.top.right {
                    cursor: ne-resize !important;
                }
                .react-flow__resize-control.bottom.left {
                    cursor: sw-resize !important;
                }
                .react-flow__resize-control.bottom.right {
                    cursor: se-resize !important;
                }
            `}</style>



            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={handleNodeMouseEnter}
                onNodeMouseLeave={handleNodeMouseLeave}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                className=""
                colorMode="dark"
                defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
                minZoom={0.5}
                maxZoom={3}
                nodesDraggable={true}
                nodesConnectable={true}
                selectNodesOnDrag={false}
                elementsSelectable={true}
                deleteKeyCode={['Backspace', 'Delete']}
                zoomOnDoubleClick={true}
            >
                <Background color="#374151" size={2} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'starting': return '#10b981';
                            case 'draft': return '#3f3f46';
                            case 'videoAsset': return '#2563eb';
                            case 'imageAsset': return '#7c3aed';
                            case 'audioAsset': return '#16a34a';
                            case 'generatingAsset': return '#f59e0b';
                            default: return '#52525b';
                        }
                    }}
                    className="!bg-zinc-900/80 !border-zinc-700"
                    pannable
                    zoomable
                />

                <Panel position="top-right">
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-700 shadow-lg">
                        <div className="text-white text-sm font-semibold mb-2">Video Editor</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-zinc-300">Starting point</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-zinc-600 rounded-full"></div>
                                <span className="text-zinc-300">{nodes.filter(n => n.type === 'draft').length} draft scenes</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-zinc-300">{nodes.filter(n => n.type === 'videoAsset').length} video assets</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span className="text-zinc-300">{nodes.filter(n => n.type === 'imageAsset').length} image assets</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-zinc-300">{nodes.filter(n => n.type === 'audioAsset').length} audio assets</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                <span className="text-zinc-300">{edges.length} connections</span>
                            </div>
                        </div>
                        <div className="text-zinc-400 text-xs mt-2">
                            Connect nodes to starting point for main timeline
                        </div>
                        <div className="text-zinc-500 text-xs mt-1">
                            Hover edges to delete • Drag nodes to reposition
                        </div>
                    </div>
                </Panel>

                <Panel position="top-center">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAssetLibrary(!showAssetLibrary)}
                            className="bg-zinc-900/80 border-zinc-700 text-white"
                        >
                            <Library className="h-4 w-4" />
                            Assets
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowTimeline(!showTimeline)}
                            className="bg-zinc-900/80 border-zinc-700 text-white"
                        >
                            {showTimeline ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            Timeline
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowUpload(true)}
                            disabled={uploading}
                            className="bg-zinc-900/80 border-zinc-700 text-white"
                        >
                            <Upload className="h-4 w-4" />
                            {uploading ? 'Uploading...' : 'Add Assets'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRefreshUrls}
                            disabled={refreshing}
                            className="bg-zinc-900/80 border-zinc-700 text-white"
                            title="Refresh all asset URLs (extends expiration to 1 day)"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh URLs'}
                        </Button>
                    </div>
                </Panel>
            </ReactFlow>

            {/* Upload Overlay Component */}
            {showUpload && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 max-w-[90vw]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Add Assets</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUpload(false)}
                                className="h-6 w-6 p-0 hover:bg-zinc-800"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div
                            className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center hover:border-zinc-500 transition-colors"
                            onDrop={(e) => {
                                handleDrop(e);
                                if (e.dataTransfer.files.length > 0) {
                                    const filesWithDescriptions = Array.from(e.dataTransfer.files).map(file => ({
                                        file,
                                        description: ''
                                    }));
                                    handleFileUpload(filesWithDescriptions);
                                    setShowUpload(false);
                                }
                            }}
                            onDragOver={handleDragOver}
                        >
                            <Upload className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                            <p className="text-white mb-2">Drop files here or click to browse</p>
                            <p className="text-zinc-400 text-sm mb-4">Supports video, audio, and image files</p>

                            <input
                                type="file"
                                multiple
                                accept="video/*,audio/*,image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const filesWithDescriptions = Array.from(e.target.files).map(file => ({
                                            file,
                                            description: ''
                                        }));
                                        handleFileUpload(filesWithDescriptions);
                                        setShowUpload(false);
                                    }
                                }}
                                className="hidden"
                                id="file-upload"
                            />
                            <Button
                                onClick={() => document.getElementById('file-upload')?.click()}
                                disabled={uploading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {uploading ? 'Uploading...' : 'Choose Files'}
                            </Button>
                        </div>

                        {uploading && (
                            <div className="mt-4 text-center">
                                <div className="text-white text-sm">Uploading files...</div>
                                <div className="text-zinc-400 text-xs mt-1">This may take a moment</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Asset Library Panel */}
            {showAssetLibrary && (
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-xl max-h-[70vh] w-80">
                        <AssetLibrary
                            projectId={projectId}
                            onAssetDrop={handleAssetDrop}
                            onClose={() => setShowAssetLibrary(false)}
                        />
                    </div>
                </div>
            )}

            {/* Timeline Component */}
            <TimelinePanel
                showTimeline={showTimeline}
                nodes={nodes}
                edges={edges}
                projectData={projectData}
                projectId={projectId}
            />

            {/* Asset Details Panel */}
            {assetDetailsPanel.isOpen && assetDetailsPanel.assetId && (
                <AssetDetailsPanel
                    isOpen={assetDetailsPanel.isOpen}
                    onClose={() => setAssetDetailsPanel({ isOpen: false })}
                    assetId={assetDetailsPanel.assetId}
                />
            )}
        </div>
    );
}

export function EditorGraph(props: EditorGraphProps) {
    if (!props.threadId || !props.projectId) {
        return <div className="flex items-center justify-center h-full text-white">Select a project to view the editor.</div>;
    }

    return (
        <ReactFlowProvider>
            <EditorGraphFlow {...props} />
        </ReactFlowProvider>
    );
} 