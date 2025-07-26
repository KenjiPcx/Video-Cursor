"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { useAuthToken } from "@convex-dev/auth/react";
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../convex/_generated/api';
import { LifeGraph } from './life-graph';
import { Button } from './ui/button';
import { Sparkles, Plus } from 'lucide-react';
import { Attachment } from 'ai';
import { MultimodalInput } from './chat/multimodal-input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

export function ChatOverlay() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const token = useAuthToken();

    const [attachments, setAttachments] = useState<Array<Attachment>>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
    const [isCreatingThread, setIsCreatingThread] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
    const [showAssistantMessage, setShowAssistantMessage] = useState(false);

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isOnboardingMode, setIsOnboardingMode] = useState(false);

    // Convex mutations and queries  
    const createThread = useMutation(api.chat.createThread);
    const allThreads = useQuery(api.chat.getThreads);

    useEffect(() => {
        // When the list of threads loads, decide what to do.
        if (allThreads !== undefined && !currentThreadId && !isCreatingThread) {
            if (allThreads.page.length > 0) {
                // If there are threads, select the latest one.
                setCurrentThreadId(allThreads.page[0]._id);
            } else {
                // If there are no threads, create a new one.
                (async () => {
                    setIsCreatingThread(true);
                    try {
                        const { threadId: newThreadId } = await createThread({});
                        setCurrentThreadId(newThreadId);
                    } finally {
                        setIsCreatingThread(false);
                    }
                })();
            }
        }
    }, [allThreads, currentThreadId, createThread, isCreatingThread]);

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
            message: body.messages.at(-1),
            phase: isOnboardingMode ? 'onboarding' : 'normal'
        }),
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const handleCreateNewThread = async () => {
        setIsCreatingThread(true);
        try {
            const { threadId: newThreadId } = await createThread({});
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

    if (isLoading || !currentThreadId) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    // Authentication check
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen text-white flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <Sparkles className="h-12 w-12 text-green-400" />
                        <h1 className="text-4xl font-bold">Life Copilot</h1>
                    </div>
                    <p className="text-xl text-gray-300 max-w-md">
                        AI-powered life planning and decision making
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
            {/* New Thread Button */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <Select
                    value={currentThreadId}
                    onValueChange={(value) => setCurrentThreadId(value)}
                >
                    <SelectTrigger className="w-[200px] bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10">
                        <SelectValue placeholder="Select a thread..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allThreads?.page.map((thread) => (
                            <SelectItem key={thread._id} value={thread._id}>
                                <div className="flex flex-col">
                                    <span>{thread.title || `Thread ${thread._id.slice(-4)}`}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(thread._creationTime).toLocaleDateString('en-US', {
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
                <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCreateNewThread}
                    disabled={isCreatingThread}
                    className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border-white/10"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>


            {/* Floating Assistant Message */}
            <AnimatePresence>
                {showAssistantMessage && lastMessage?.role === 'assistant' && (
                    <motion.div
                        key={lastMessage.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute left-0 right-0 p-4 flex justify-center z-10"
                    >
                        <div className="max-w-2xl w-full bg-background/80 dark:bg-zinc-900/80 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                            <div className="flex gap-4 p-4">
                                <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-sm font-semibold capitalize">Life Copilot</span>
                                    <p className="text-foreground whitespace-pre-line">{lastMessage.content}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Life Graph Background */}
            <LifeGraph
                threadId={currentThreadId}
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
        </div>
    );
} 