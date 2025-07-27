import { useCallback, useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { useUploadFile } from '@convex-dev/r2/react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface UseFileUploadProps {
    projectId: Id<"projects">;
}

export function useFileUpload({ projectId }: UseFileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const uploadFile = useUploadFile(api.upload);
    const createAsset = useAction(api.upload.createAssetFromUpload);

    // Handle file upload using useUploadFile hook
    const handleFileUpload = useCallback(async (files: FileList) => {
        if (!files.length) return;

        console.log('📁 Starting file upload for', files.length, 'files');
        setUploading(true);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                console.log('📤 Uploading file:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

                // Upload file directly to R2 (handles large files without size limits)
                const key = await uploadFile(file);

                console.log('📦 File uploaded to R2 with key:', key);

                // Create asset record in database
                await createAsset({
                    key,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    projectId,
                    category: "upload",
                });

                console.log('✅ File uploaded successfully:', file.name);

            } catch (error) {
                console.error('❌ Failed to upload file:', file.name, error);
                throw error;
            }
        }

        setUploading(false);
        console.log('📁 Upload process completed');
    }, [uploadFile, createAsset, projectId]);

    // Handle drag and drop
    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            console.log('🎯 Files dropped:', files.length);
            handleFileUpload(files);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
    }, []);

    return {
        uploading,
        handleFileUpload,
        handleDrop,
        handleDragOver,
    };
} 