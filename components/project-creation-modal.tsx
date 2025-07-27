"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface ProjectCreationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateProject: (data: { name: string; description: string; status: string }) => Promise<void>;
    isCreating: boolean;
}

export function ProjectCreationModal({
    open,
    onOpenChange,
    onCreateProject,
    isCreating,
}: ProjectCreationModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        await onCreateProject({
            name: name.trim(),
            description: description.trim(),
            status: 'draft',
        });

        // Reset form and close modal
        setName('');
        setDescription('');
        onOpenChange(false);
    };

    const handleCancel = () => {
        setName('');
        setDescription('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Create a new video project to organize your work.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                            id="project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name..."
                            required
                            disabled={isCreating}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project-description">Description</Label>
                        <Textarea
                            id="project-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your project..."
                            rows={3}
                            disabled={isCreating}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isCreating || !name.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isCreating ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 