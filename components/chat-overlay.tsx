"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { useAuthToken } from "@convex-dev/auth/react";
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../convex/_generated/api';
import { EditorGraph } from './editor-graph';
import { Button } from './ui/button';
import { Sparkles, Plus } from 'lucide-react';
import { Attachment } from 'ai';
import { MultimodalInput } from './chat/multimodal-input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Id } from '@/convex/_generated/dataModel';
import { ProjectCreationModal } from './project-creation-modal';
import { Message, ThinkingMessage } from './chat/message';

export function ChatOverlay() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const token = useAuthToken();

    const [attachments, setAttachments] = useState<Array<Attachment>>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
    const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | undefined>();
    const [isCreatingThread, setIsCreatingThread] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
    const [showAssistantMessage, setShowAssistantMessage] = useState(false);

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isOnboardingMode, setIsOnboardingMode] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);

    // Convex mutations and queries  
    const createProject = useMutation(api.projects.create);
    const allProjects = useQuery(api.projects.list);
    const currentProject = useQuery(
        api.projects.get,
        currentProjectId ? { id: currentProjectId as Id<"projects"> } : "skip"
    );
    const createThread = useMutation(api.chat.createThread);
    const projectThreads = useQuery(
        api.threadMetadata?.getThreadsForProject,
        currentProjectId ? { projectId: currentProjectId as Id<"projects"> } : "skip"
    );

    useEffect(() => {
        // When the list of projects loads, decide what to do.
        if (allProjects !== undefined && !currentProjectId && !isCreatingProject) {
            if (allProjects.length > 0) {
                // If there are projects, select the latest one.
                setCurrentProjectId(allProjects[0]._id);
            }
            // If there are no projects, user will need to create one via the modal
        }
    }, [allProjects, currentProjectId, isCreatingProject]);

    // Remove this useEffect since we're not using active threads anymore

    // When project changes, select the most recent thread (first in list)
    useEffect(() => {
        if (currentProjectId && projectThreads && projectThreads.length > 0) {
            const mostRecentThread = projectThreads[0]; // threads are ordered by creation time

            // Only auto-select if no thread is currently selected
            if (mostRecentThread && !currentThreadId) {
                setCurrentThreadId(mostRecentThread.threadId);
            }
        }
    }, [currentProjectId, projectThreads]);

    // Check for first-time user and show onboarding
    useEffect(() => {
        if (isAuthenticated && currentThreadId) {
            const hasCompletedOnboarding = localStorage.getItem('foresight-onboarding-completed');
            if (!hasCompletedOnboarding) {
                setShowOnboarding(true);
                setIsOnboardingMode(true);
            }
        }
    }, [isAuthenticated, currentThreadId]);

    const handleOnboardingComplete = () => {
        localStorage.setItem('foresight-onboarding-completed', 'true');
        setShowOnboarding(false);
        setIsOnboardingMode(false);

        // Trigger initial onboarding conversation
        setTimeout(() => {
            append({
                role: 'user',
                content: 'Hi! I just completed the onboarding. Can you help me get started by asking me about my life to build my life graph?'
            });
        }, 500);
    };

    const { messages, input, setInput, handleSubmit, setMessages, append, status, stop } = useChat({
        id: currentThreadId,
        experimental_throttle: 100,
        sendExtraMessageFields: true,
        // The API endpoint must be declared in an env var
        api: process.env.NEXT_PUBLIC_CHAT_API!,
        experimental_prepareRequestBody: (body) => ({
            id: currentThreadId!,
            projectId: currentProjectId!,
            message: body.messages.at(-1),
            phase: isOnboardingMode ? 'onboarding' : 'normal'
        }),
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const handleCreateNewProject = async (projectData: { name: string; description: string; status: string }) => {
        setIsCreatingProject(true);
        try {
            // Create new project with proper status type
            const newProjectId = await createProject({
                name: projectData.name,
                description: projectData.description,
                status: "draft" as const,
            });

            // Create thread for the project
            const { threadId: newThreadId } = await createThread({ projectId: newProjectId });

            setCurrentProjectId(newProjectId);
            setCurrentThreadId(newThreadId);
            // useChat will re-initialize with the new threadId
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleCreateNewThread = async () => {
        if (!currentProjectId) return;

        setIsCreatingThread(true);
        try {
            // Create new thread
            const { threadId: newThreadId } = await createThread({ projectId: currentProjectId as Id<"projects"> });
            setCurrentThreadId(newThreadId);
            // useChat will re-initialize with the new threadId
        } finally {
            setIsCreatingThread(false);
        }
    };

    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

    // Handle node selection from graph
    const handleNodeSelect = useCallback((nodeId: string, nodeData: any) => {
        setSelectedNode(nodeId);
        setHighlightedNodes(new Set([nodeId]));
    }, []);

    useEffect(() => {
        let hideTimer: NodeJS.Timeout;

        if (lastMessage?.role === 'assistant') {
            setShowAssistantMessage(true);
            if (status === 'ready') {
                hideTimer = setTimeout(() => {
                    setShowAssistantMessage(false);
                }, 5000);
            }
        } else {
            setShowAssistantMessage(false);
        }

        return () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
        };
    }, [lastMessage, status]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <div className="text-gray-400">Loading video editor...</div>
            </div>
        );
    }

    // If no projects exist, show create project message
    if (allProjects !== undefined && allProjects.length === 0) {
        return (
            <div className="h-dvh w-full relative flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <Sparkles className="h-12 w-12 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white">Video Cursor</h1>
                    </div>
                    <p className="text-xl text-gray-300 max-w-md">
                        Welcome! Create your first video project to get started.
                    </p>
                    <Button
                        onClick={() => setShowProjectModal(true)}
                        disabled={isCreatingProject}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isCreatingProject ? 'Creating...' : 'Create New Project'}
                    </Button>
                </div>

                {/* Project Creation Modal */}
                <ProjectCreationModal
                    open={showProjectModal}
                    onOpenChange={setShowProjectModal}
                    onCreateProject={handleCreateNewProject}
                    isCreating={isCreatingProject}
                />
            </div>
        );
    }

    if (!currentThreadId || !currentProjectId) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <div className="text-gray-400">Loading video editor...</div>
            </div>
        );
    }

    // Authentication check
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen text-white flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <Sparkles className="h-12 w-12 text-blue-400" />
                        <h1 className="text-4xl font-bold">Video Cursor</h1>
                    </div>
                    <p className="text-xl text-gray-300 max-w-md">
                        AI-powered video editing and creation
                    </p>
                    <Button
                        onClick={() => router.push("/signin")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Sign In to Continue
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh w-full relative">
            {/* Project and Thread Selectors */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {/* Project Row */}
                <div className="flex items-center gap-2">
                    {/* Project Selector */}
                    <Select
                        value={currentProjectId}
                        onValueChange={(value) => setCurrentProjectId(value as Id<"projects">)}
                    >
                        <SelectTrigger className="w-[200px] bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10">
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allProjects?.map((project) => (
                                <SelectItem key={project._id} value={project._id}>
                                    <div className="flex flex-col">
                                        <span>{project.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(project._creationTime).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* New Project Button */}
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setShowProjectModal(true)}
                        disabled={isCreatingProject}
                        className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10"
                        title="New Project"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Thread Row */}
                <div className="flex items-center gap-2">
                    {/* Thread Selector */}
                    <Select
                        value={currentThreadId}
                        onValueChange={(value) => {
                            setCurrentThreadId(value);
                        }}
                    >
                        <SelectTrigger className="w-[200px] bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10">
                            <SelectValue placeholder="Select a thread..." />
                        </SelectTrigger>
                        <SelectContent>
                            {projectThreads?.map((threadMeta) => (
                                <SelectItem key={threadMeta._id} value={threadMeta.threadId}>
                                    <div className="flex flex-col">
                                        <span>
                                            {threadMeta.title || `Thread ${threadMeta.threadId.slice(-4)}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(threadMeta._creationTime).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* New Thread Button */}
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCreateNewThread}
                        disabled={isCreatingThread || !currentProjectId}
                        className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10"
                        title="New Thread"
                    >
                        <Plus className="h-3 w-3" />
                        <span className="text-xs ml-1">T</span>
                    </Button>
                </div>
            </div>


            {/* Floating Assistant Message */}
            <AnimatePresence>
                {((status === 'submitted' && messages.length > 0 && messages[messages.length - 1].role === 'user') ||
                    (showAssistantMessage && lastMessage?.role === 'assistant')) && (
                        <motion.div
                            key={lastMessage?.id || 'thinking'}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="absolute left-0 right-0 p-4 flex justify-center z-10"
                        >
                            <div className="max-w-2xl w-full bg-zinc-900/80 backdrop-blur-lg border border-zinc-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {status === 'submitted' && messages.length > 0 && messages[messages.length - 1].role === 'user' ? (
                                    <ThinkingMessage />
                                ) : lastMessage && (
                                    <Message
                                        message={lastMessage}
                                        isLoading={status === 'streaming'}
                                        isLatestMessage={true}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
            </AnimatePresence>

            {/* Editor Graph Background */}
            <EditorGraph
                threadId={currentThreadId}
                projectId={currentProjectId}
                onNodeSelect={handleNodeSelect}
                highlightedNodes={highlightedNodes}
                selectedNode={selectedNode}
            />

            {/* Floating Chat Input */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute bottom-0 left-0 right-0 p-4"
            >
                <div className="mx-auto max-w-2xl w-full">
                    <MultimodalInput
                        chatId={currentThreadId!}
                        projectId={currentProjectId!}
                        input={input}
                        setInput={setInput}
                        handleSubmit={handleSubmit}
                        messages={messages}
                        setMessages={setMessages}
                        append={append}
                        status={status}
                        stop={stop}
                        attachments={attachments}
                        setAttachments={setAttachments}
                        selectedVisibilityType="private"
                    />
                </div>
            </motion.div>

            {/* Project Creation Modal */}
            <ProjectCreationModal
                open={showProjectModal}
                onOpenChange={setShowProjectModal}
                onCreateProject={handleCreateNewProject}
                isCreating={isCreatingProject}
            />
        </div>
    );
} 