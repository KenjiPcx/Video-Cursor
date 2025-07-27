import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, ChevronRight, Upload, Sparkles, Search, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AssetLibraryProps {
    projectId: Id<"projects">;
    onAssetDrop?: (assetId: Id<"assets">, position: { x: number, y: number }) => void;
    onClose?: () => void;
}

export function AssetLibrary({ projectId, onAssetDrop, onClose }: AssetLibraryProps) {
    const [uploadExpanded, setUploadExpanded] = useState(true);
    const [artifactExpanded, setArtifactExpanded] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch all assets for the project
    const allAssets = useQuery(api.assets.listByProject, { projectId });

    // Filter and categorize assets
    const uploadAssets = allAssets?.filter(asset =>
        asset.category === "upload" &&
        (searchTerm === "" || asset.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const artifactAssets = allAssets?.filter(asset =>
        asset.category === "artifact" &&
        (searchTerm === "" || asset.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const handleDragStart = (e: React.DragEvent, assetId: Id<"assets">) => {
        e.dataTransfer.setData("application/json", JSON.stringify({
            type: "asset",
            assetId: assetId
        }));
        e.dataTransfer.effectAllowed = "copy";
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-white">Asset Library</h2>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-6 w-6 p-0 hover:bg-zinc-800"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400"
                    />
                </div>
            </div>

            {/* Asset Sections */}
            <div className="flex-1 overflow-y-auto">
                {/* Upload Assets Section */}
                <div className="border-b border-zinc-700">
                    <button
                        onClick={() => setUploadExpanded(!uploadExpanded)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            {uploadExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Upload className="h-4 w-4 text-blue-400" />
                            <span className="font-medium text-white">Uploads</span>
                            <span className="text-xs text-zinc-400">({uploadAssets.length})</span>
                        </div>
                    </button>

                    {uploadExpanded && (
                        <div className="pb-2">
                            {uploadAssets.map((asset) => (
                                <AssetCard
                                    key={asset._id}
                                    asset={asset}
                                    onDragStart={handleDragStart}
                                />
                            ))}
                            {uploadAssets.length === 0 && (
                                <div className="px-4 py-6 text-center text-zinc-400 text-sm">
                                    No upload assets found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Artifact Assets Section */}
                <div>
                    <button
                        onClick={() => setArtifactExpanded(!artifactExpanded)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            {artifactExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-white">AI Generated</span>
                            <span className="text-xs text-zinc-400">({artifactAssets.length})</span>
                        </div>
                    </button>

                    {artifactExpanded && (
                        <div className="pb-2">
                            {artifactAssets.map((asset) => (
                                <AssetCard
                                    key={asset._id}
                                    asset={asset}
                                    onDragStart={handleDragStart}
                                />
                            ))}
                            {artifactAssets.length === 0 && (
                                <div className="px-4 py-6 text-center text-zinc-400 text-sm">
                                    No AI generated assets found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface AssetCardProps {
    asset: any; // We'll properly type this when we have the asset type
    onDragStart: (e: React.DragEvent, assetId: Id<"assets">) => void;
}

function AssetCard({ asset, onDragStart }: AssetCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(asset.description || "");
    const updateDescription = useMutation(api.assets.updateDescription);

    const getAssetIcon = () => {
        switch (asset.type) {
            case "video": return "🎬";
            case "image": return "🖼️";
            case "audio": return "🎵";
            default: return "📄";
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return "";
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return "";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, asset._id)}
            className="mx-2 mb-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 cursor-grab active:cursor-grabbing transition-colors group"
        >
            <div className="flex items-start gap-3">
                {/* Asset Preview/Icon */}
                <div className="flex-shrink-0">
                    {asset.type === "image" || asset.type === "video" ? (
                        <div className="w-12 h-12 bg-zinc-700 rounded overflow-hidden">
                            {asset.url ? (
                                asset.type === "image" ? (
                                    <img
                                        src={asset.url}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <video
                                        src={asset.url}
                                        className="w-full h-full object-cover"
                                        muted
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">
                                    {getAssetIcon()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-12 h-12 bg-zinc-700 rounded flex items-center justify-center text-lg">
                            {getAssetIcon()}
                        </div>
                    )}
                </div>

                {/* Asset Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <h4 className="font-medium text-white text-sm truncate" title={asset.name}>
                            {asset.name}
                        </h4>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    Edit Description
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Asset Metadata */}
                    <div className="text-xs text-zinc-400 mt-1">
                        {asset.metadata?.duration && formatDuration(asset.metadata.duration)}
                        {asset.metadata?.duration && asset.metadata?.size && " • "}
                        {asset.metadata?.size && formatFileSize(asset.metadata.size)}
                    </div>

                    {/* Description */}
                    {isEditing ? (
                        <div className="mt-2">
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add description..."
                                className="text-xs bg-zinc-700 border-zinc-600"
                                onBlur={async () => {
                                    setIsEditing(false);
                                    if (description !== (asset.description || "")) {
                                        try {
                                            await updateDescription({
                                                id: asset._id,
                                                description: description
                                            });
                                        } catch (error) {
                                            console.error("Failed to update description:", error);
                                            setDescription(asset.description || "");
                                        }
                                    }
                                }}
                                onKeyDown={async (e) => {
                                    if (e.key === "Enter") {
                                        setIsEditing(false);
                                        if (description !== (asset.description || "")) {
                                            try {
                                                await updateDescription({
                                                    id: asset._id,
                                                    description: description
                                                });
                                            } catch (error) {
                                                console.error("Failed to update description:", error);
                                                setDescription(asset.description || "");
                                            }
                                        }
                                    }
                                    if (e.key === "Escape") {
                                        setIsEditing(false);
                                        setDescription(asset.description || "");
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                    ) : (
                        asset.description && (
                            <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                                {asset.description}
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
} 