import { useCallback, useRef, useEffect } from 'react';
import { useNodesState, useEdgesState, Connection, addEdge, Edge } from '@xyflow/react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { EditorNodeType } from '../components/editor-graph';

interface UseEditorStateProps {
    projectId: Id<"projects">;
    flowNodes: EditorNodeType[];
    flowEdges: Edge[];
}

export function useEditorState({ projectId, flowNodes, flowEdges }: UseEditorStateProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<EditorNodeType>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Debouncing refs for position updates
    const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Mutations
    const updateNodePosition = useMutation(api.nodes.updatePosition);
    const createEdge = useMutation(api.edges.create);
    const removeEdge = useMutation(api.edges.remove);
    const removeNode = useMutation(api.nodes.remove);

    // Debounced position update function
    const debouncedPositionUpdate = useCallback((nodeId: string, position: { x: number; y: number }) => {
        // Clear existing timeout for this node
        const existingTimeout = positionUpdateTimeouts.current.get(nodeId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const newTimeout = setTimeout(async () => {
            try {
                await updateNodePosition({
                    id: nodeId as Id<"nodes">,
                    position,
                });
                positionUpdateTimeouts.current.delete(nodeId);
            } catch (error) {
                console.error('Failed to update node position:', error);
            }
        }, 500); // 500ms debounce

        positionUpdateTimeouts.current.set(nodeId, newTimeout);
    }, [updateNodePosition]);

    // Handle new edge connections
    const onConnect = useCallback(async (connection: Connection) => {
        if (!connection.source || !connection.target) return;

        // Add to local state immediately for responsiveness
        setEdges((eds) => addEdge({
            ...connection,
            id: `temp-${Date.now()}`, // Temporary ID until DB returns real one
            type: 'default',
            style: { stroke: '#6b7280', strokeWidth: 2 },
        }, eds));

        try {
            // Save to database
            await createEdge({
                projectId: projectId,
                sourceNodeId: connection.source as Id<"nodes">,
                targetNodeId: connection.target as Id<"nodes">,
            });
        } catch (error) {
            console.error('Failed to create edge:', error);
            // Remove the optimistic edge if DB save failed
            setEdges((eds) => eds.filter(e => e.id !== `temp-${Date.now()}`));
        }
    }, [setEdges, createEdge, projectId]);

    // Handle edge deletion
    const onEdgeDelete = useCallback(async (edgeId: string) => {
        console.log('🗑️ onEdgeDelete called with edgeId:', edgeId);

        // Skip temporary edges (they're not in DB yet)
        if (edgeId.startsWith('temp-')) {
            console.log('Skipping temporary edge deletion');
            return;
        }

        try {
            console.log('Attempting to delete edge from database...');
            await removeEdge({
                id: edgeId as Id<"edges">,
            });
            console.log('✅ Edge deleted successfully');
        } catch (error) {
            console.error('❌ Failed to delete edge:', error);
        }
    }, [removeEdge]);

    // Handle node deletion
    const onNodeDelete = useCallback(async (nodeId: string) => {
        console.log('🗑️ onNodeDelete called with nodeId:', nodeId);

        try {
            await removeNode({
                id: nodeId as Id<"nodes">,
            });
            console.log('✅ Node deleted successfully');
        } catch (error) {
            console.error('❌ Failed to delete node:', error);
        }
    }, [removeNode]);

    // Custom onNodesChange handler to handle position updates
    const handleNodesChange = useCallback((changes: any[]) => {
        const positionChanges = changes.filter(change => change.type === 'position');

        // Handle position changes with debouncing
        positionChanges.forEach((change) => {
            if (change.position && change.dragging === false) {
                // Only save when drag is complete
                debouncedPositionUpdate(change.id, change.position);
            }
        });

        // Apply all changes to local state
        onNodesChange(changes);
    }, [onNodesChange, debouncedPositionUpdate]);

    // Update nodes when data changes
    useEffect(() => {
        setNodes(flowNodes);
    }, [flowNodes, setNodes]);

    // Update edges when data changes
    useEffect(() => {
        setEdges(flowEdges);
    }, [flowEdges, setEdges]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            positionUpdateTimeouts.current.forEach(timeout => clearTimeout(timeout));
            positionUpdateTimeouts.current.clear();
        };
    }, []);

    return {
        nodes,
        edges,
        onNodesChange: handleNodesChange,
        onEdgesChange,
        onConnect,
        onEdgeDelete,
        onNodeDelete,
    };
} 