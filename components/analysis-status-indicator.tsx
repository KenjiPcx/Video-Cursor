import React from 'react';
import { Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface AnalysisStatusIndicatorProps {
    assetId: Id<"assets">;
    assetType: 'video' | 'image';
    metadata?: {
        analysis?: {
            analyzedAt?: number;
        };
        transcription?: {
            transcribedAt?: number;
        };
    };
    variant?: 'compact' | 'detailed';
    onAnalyzeComplete?: () => void;
}

export function AnalysisStatusIndicator({ 
    assetId, 
    assetType, 
    metadata, 
    variant = 'compact',
    onAnalyzeComplete 
}: AnalysisStatusIndicatorProps) {
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const triggerAnalysis = useAction(api.upload.triggerAssetAnalysis);

    const hasAnalysis = metadata?.analysis?.analyzedAt;
    const hasTranscription = metadata?.transcription?.transcribedAt;
    const isFullyAnalyzed = hasAnalysis && (assetType === 'image' || hasTranscription);

    const handleAnalyze = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering parent click events
        try {
            setIsAnalyzing(true);
            await triggerAnalysis({ assetId });
            onAnalyzeComplete?.();
        } catch (error) {
            console.error('Failed to trigger analysis:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-1">
                {isAnalyzing ? (
                    <div className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs">Analyzing...</span>
                    </div>
                ) : isFullyAnalyzed ? (
                    <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Analyzed</span>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAnalyze}
                        className="h-6 px-2 py-0 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                        <Brain className="h-3 w-3 mr-1" />
                        Analyze
                    </Button>
                )}
            </div>
        );
    }

    // Detailed variant
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    Analysis Status
                </span>
                {!isFullyAnalyzed && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="text-xs"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Brain className="h-3 w-3 mr-1" />
                                Analyze
                            </>
                        )}
                    </Button>
                )}
            </div>
            
            <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                    {hasAnalysis ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                    <span className={hasAnalysis ? 'text-green-700' : 'text-amber-700'}>
                        Visual content {hasAnalysis ? 'analyzed' : 'not analyzed'}
                    </span>
                </div>
                
                {assetType === 'video' && (
                    <div className="flex items-center gap-2">
                        {hasTranscription ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                        )}
                        <span className={hasTranscription ? 'text-green-700' : 'text-amber-700'}>
                            Audio {hasTranscription ? 'transcribed' : 'not transcribed'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
} 