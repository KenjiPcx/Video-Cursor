import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
    useNodesInitialized,
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    NodeTypes,
} from '@xyflow/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import GoalNode, { type GoalNode as GoalNodeType } from './nodes/GoalNode';
import ProjectNode, { type ProjectNode as ProjectNodeType } from './nodes/ProjectNode';
import TempEntityNode, { type TempEntityNode as TempEntityNodeType } from './nodes/TempEntityNode';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = {
    goal: GoalNode,
    project: ProjectNode,
    tempEntity: TempEntityNode,
};

type NodeType = GoalNodeType | ProjectNodeType | TempEntityNodeType;

interface LifeGraphProps {
    threadId: string;
    onNodeSelect?: (nodeId: string, nodeData: any) => void;
    highlightedNodes?: Set<string>;
    selectedNode?: string | null;
}

function LifeGraphFlow({ threadId, onNodeSelect, highlightedNodes, selectedNode }: LifeGraphProps) {
    const { fitView } = useReactFlow();
    const initialized = useNodesInitialized();
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Get visualization data
    const visualizationData = useQuery(api.visualization.getVisualizationData, {
        threadId: threadId,
    });
    const [nodes, setNodes, onNodesChange] = useNodesState<NodeType>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Convert data to React Flow nodes
    const flowNodes = useMemo(() => {
        if (!visualizationData) return [];

        const allNodes: NodeType[] = [];

        // Add goal nodes
        visualizationData.goals.forEach((goal) => {
            allNodes.push({
                id: goal._id,
                type: 'goal',
                position: {
                    x: goal.coordinates.x,
                    y: goal.coordinates.y
                },
                data: {
                    name: goal.name,
                    description: goal.description,
                    status: goal.status,
                },
                className: highlightedNodes?.has(goal._id) ? 'highlighted' : '',
            });
        });

        // Add project nodes
        visualizationData.projects.forEach((project) => {
            allNodes.push({
                id: project._id,
                type: 'project',
                position: {
                    x: project.coordinates.x,
                    y: project.coordinates.y
                },
                data: {
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    completed: project.completed,
                },
                className: highlightedNodes?.has(project._id) ? 'highlighted' : '',
            });
        });

        // Add temp entity nodes
        visualizationData.tempEntities.forEach((entity) => {
            allNodes.push({
                id: entity._id,
                type: 'tempEntity',
                position: {
                    x: entity.coordinates.x,
                    y: entity.coordinates.y
                },
                data: {
                    name: entity.name,
                    description: entity.description,
                    type: entity.type,
                    similarityScores: entity.similarityScores,
                },
                className: highlightedNodes?.has(entity._id) ? 'highlighted' : '',
            });
        });

        return allNodes;
    }, [visualizationData, highlightedNodes]);

    // Convert data to React Flow edges with hover-based visibility
    const flowEdges = useMemo(() => {
        if (!visualizationData) return [];

        const allEdges: Edge[] = [];

        // Create edges from projects to their linked goals
        visualizationData.projects.forEach((project) => {
            project.goalIds.forEach((goalId) => {
                const isVisible = hoveredNode === project._id || hoveredNode === goalId;
                allEdges.push({
                    id: `${project._id}-${goalId}`,
                    source: project._id,
                    target: goalId,
                    type: 'straight',
                    style: {
                        stroke: '#6366f1',
                        strokeWidth: 2,
                        opacity: isVisible ? 0.8 : 0,
                        transition: 'opacity 0.2s ease'
                    },
                    animated: false,
                    hidden: !isVisible,
                });
            });

            // Create edges for parent-child project relationships
            if (project.parentProjectId) {
                const isVisible = hoveredNode === project._id || hoveredNode === project.parentProjectId;
                allEdges.push({
                    id: `${project.parentProjectId}-${project._id}`,
                    source: project.parentProjectId,
                    target: project._id,
                    type: 'straight',
                    style: {
                        stroke: '#3b82f6',
                        strokeWidth: 1.5,
                        opacity: isVisible ? 0.7 : 0,
                        transition: 'opacity 0.2s ease'
                    },
                    animated: false,
                    hidden: !isVisible,
                });
            }
        });

        return allEdges;
    }, [visualizationData, hoveredNode]);

    // Calculate project counts by status
    const projectCounts = useMemo(() => {
        if (!visualizationData) return { planning: 0, inProgress: 0, completed: 0 };

        return visualizationData.projects.reduce((counts, project) => {
            if (project.completed || project.status === 'completed') {
                counts.completed++;
            } else if (project.status === 'in-progress') {
                counts.inProgress++;
            } else if (project.status === 'planning') {
                counts.planning++;
            } else {
                counts.inProgress++; // default to in-progress for projects without explicit status
            }
            return counts;
        }, { planning: 0, inProgress: 0, completed: 0 });
    }, [visualizationData]);

    // Update nodes and edges when data changes
    useEffect(() => {
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [flowNodes, flowEdges, setNodes, setEdges]);

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

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                Loading your life graph...
            </div>
        );
    }

    if (flowNodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="text-xl mb-4">🎯 Your Life Graph</div>
                <div className="text-gray-400 text-center max-w-md">
                    Start chatting with your Life Copilot to create goals and projects.
                    They'll appear here as connected nodes showing your life's direction.
                </div>
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
                    pointer-events: none;
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
                nodeTypes={nodeTypes}
                fitView
                className=""
                colorMode="dark"
                defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
                minZoom={0.5}
                maxZoom={3}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
            >
                <Background color="#374151" size={2} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'goal': return '#10b981';
                            case 'project': {
                                // Get project data to determine color
                                const projectData = visualizationData?.projects.find(p => p._id === node.id);
                                if (projectData?.completed || projectData?.status === 'completed') {
                                    return '#059669'; // emerald-600
                                } else if (projectData?.status === 'in-progress') {
                                    return '#2563eb'; // blue-600
                                } else if (projectData?.status === 'planning') {
                                    return '#0284c7'; // sky-600
                                }
                                return '#2563eb'; // default blue
                            }
                            case 'tempEntity': return '#f59e0b';
                            default: return '#6b7280';
                        }
                    }}
                    className="!bg-gray-800 !border-gray-600"
                    pannable
                    zoomable
                />
                <Panel position="top-left">
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 shadow-lg">
                        <div className="text-white text-sm font-semibold mb-2">Your Life Graph</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-green-500 rounded-full border border-green-400"></div>
                                <span className="text-gray-300">{visualizationData.goals.length} goals</span>
                            </div>

                            {/* Project breakdown by status */}
                            {projectCounts.planning > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 bg-sky-500 rounded-full border border-sky-400"></div>
                                    <span className="text-gray-300">{projectCounts.planning} planning</span>
                                </div>
                            )}

                            {projectCounts.inProgress > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full border border-blue-400"></div>
                                    <span className="text-gray-300">{projectCounts.inProgress} in progress</span>
                                </div>
                            )}

                            {projectCounts.completed > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full border border-emerald-400"></div>
                                    <span className="text-gray-300">{projectCounts.completed} completed</span>
                                </div>
                            )}

                            {visualizationData.tempEntities.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full border border-orange-400 border-dashed"></div>
                                    <span className="text-gray-300">{visualizationData.tempEntities.length} considering</span>
                                </div>
                            )}
                        </div>
                        <div className="text-gray-400 text-xs mt-2">
                            Hover over dots to see details and connections
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

export function LifeGraph(props: LifeGraphProps) {
    if (!props.threadId) {
        return <div className="flex items-center justify-center h-full text-white">Select a thread to view the graph.</div>;
    }

    return (
        <ReactFlowProvider>
            <LifeGraphFlow {...props} />
        </ReactFlowProvider>
    );
} 