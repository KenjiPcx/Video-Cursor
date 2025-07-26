"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, StopCircle } from "lucide-react";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (message: string) => Promise<void>;
    isLoading: boolean;
    placeholder?: string;
}

export function ChatInput({
    value,
    onChange,
    onSubmit,
    isLoading,
    placeholder = "Send a message..."
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isLoading) return;

        const message = value.trim();
        onChange("");
        await onSubmit(message);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!isLoading && value.trim()) {
                void handleSubmit(e as any);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="min-h-[44px] max-h-[150px] resize-none pr-12 bg-gray-800 border-gray-600 focus:border-emerald-500 focus:ring-emerald-500 text-white placeholder-gray-400"
                    rows={1}
                />
            </div>

            <Button
                type="submit"
                disabled={!value.trim() || isLoading}
                size="sm"
                className="flex items-center gap-2 h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {isLoading ? (
                    <>
                        <StopCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Thinking...</span>
                    </>
                ) : (
                    <>
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                    </>
                )}
            </Button>
        </form>
    );
}