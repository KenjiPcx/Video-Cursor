'use client';

import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Markdown } from './markdown';
import type { UIMessage } from 'ai';

interface MessageProps {
    message: UIMessage;
    isLoading?: boolean;
    isLatestMessage?: boolean;
}

const ToolCallPreview = ({ toolName, args, toolCallId }: {
    toolName: string;
    args: any;
    toolCallId: string;
}) => {
    return (
        <div className="border border-zinc-700 rounded-lg p-3 bg-zinc-800/50">
            <div className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                <Code className="h-4 w-4" />
                <span>Calling tool: {toolName}</span>
            </div>
            <pre className="text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded whitespace-pre-wrap break-words">
                {JSON.stringify(args, null, 2)}
            </pre>
        </div>
    );
};

const ToolResultPreview = ({ toolName, result, args }: {
    toolName: string;
    result: any;
    args?: any;
}) => {
    const formatResult = () => {
        if (typeof result === 'string') {
            return result.length > 200 ? `${result.substring(0, 200)}...` : result;
        }
        if (typeof result === 'object') {
            return JSON.stringify(result, null, 2).length > 200
                ? `${JSON.stringify(result, null, 2).substring(0, 200)}...`
                : JSON.stringify(result, null, 2);
        }
        return String(result);
    };

    return (
        <div className="border border-zinc-600 rounded-lg p-3 bg-zinc-800/30">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Code className="h-4 w-4" />
                <span>Tool result</span>
            </div>
            <pre className="text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded whitespace-pre-wrap break-words">
                {formatResult()}
            </pre>
        </div>
    );
};

const ReasoningPreview = ({ reasoning, isLoading }: {
    reasoning: string;
    isLoading?: boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-zinc-700 rounded-lg p-3 bg-zinc-900/30">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-zinc-400 hover:text-zinc-300 mb-2 p-0 h-auto"
            >
                <Sparkles className="h-4 w-4 mr-2" />
                {isExpanded ? 'Hide reasoning' : 'Show reasoning'}
            </Button>

            {isExpanded && (
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {reasoning}
                    {isLoading && <span className="animate-pulse">▊</span>}
                </div>
            )}
        </div>
    );
};

const PureMessage = ({ message, isLoading, isLatestMessage }: MessageProps) => {
    return (
        <AnimatePresence>
            <motion.div
                data-testid={`message-${message.role}`}
                className="w-full group/message mb-4 px-4 pt-4"
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                data-role={message.role}
            >
                <div className="flex gap-4 w-full">
                    {(message.role === 'assistant' || message.role === 'system') && (
                        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-zinc-700 bg-zinc-800">
                            <Sparkles className="h-4 w-4 text-zinc-300" />
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                        {/* Handle message parts */}
                        {message.parts?.map((part, index) => {
                            const key = `message-${message.id}-part-${index}`;

                            if (part.type === 'reasoning') {
                                return (
                                    <ReasoningPreview
                                        key={key}
                                        reasoning={part.reasoning || ''}
                                        isLoading={isLoading}
                                    />
                                );
                            }

                            if (part.type === 'text') {
                                return (
                                    <div
                                        key={key}
                                        className={cn('flex flex-col gap-2', {
                                            'bg-zinc-800 text-zinc-100 px-3 py-2 rounded-xl max-w-2xl ml-auto':
                                                message.role === 'user',
                                            'text-zinc-100': message.role === 'assistant',
                                        })}
                                    >
                                        <Markdown>{part.text || ''}</Markdown>
                                    </div>
                                );
                            }

                            if (part.type === 'tool-invocation') {
                                const { toolInvocation } = part;
                                if (!toolInvocation) return null;

                                if (toolInvocation.state === 'call') {
                                    return (
                                        <ToolCallPreview
                                            key={toolInvocation.toolCallId}
                                            toolName={toolInvocation.toolName}
                                            args={toolInvocation.args}
                                            toolCallId={toolInvocation.toolCallId}
                                        />
                                    );
                                }

                                if (toolInvocation.state === 'result') {
                                    return (
                                        <ToolResultPreview
                                            key={`${toolInvocation.toolCallId}-result`}
                                            toolName={toolInvocation.toolName}
                                            result={(toolInvocation as any).result}
                                            args={toolInvocation.args}
                                        />
                                    );
                                }
                            }

                            return null;
                        })}

                        {/* Fallback to basic content if no parts */}
                        {!message.parts && message.content && (
                            <div
                                className={cn('flex flex-col gap-2', {
                                    'bg-zinc-800 text-zinc-100 px-3 py-2 rounded-xl max-w-2xl ml-auto':
                                        message.role === 'user',
                                    'text-zinc-100': message.role === 'assistant',
                                })}
                            >
                                <Markdown>{message.content}</Markdown>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export const Message = memo(PureMessage);

export const ThinkingMessage = () => {
    return (
        <motion.div
            data-testid="message-assistant-loading"
            className="w-full group/message px-4 pt-4"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
            data-role="assistant"
        >
            <div className="flex gap-4 w-full">
                <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-zinc-700 bg-zinc-800">
                    <Sparkles className="h-4 w-4 text-zinc-300" />
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col gap-4 text-zinc-400">
                        <span className="animate-pulse">Thinking...</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}; 