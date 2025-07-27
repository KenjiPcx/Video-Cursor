import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { Word } from './word';
import { Caption, createTikTokStyleCaptions } from '@remotion/captions';

export const Subtitles: React.FC<{
    captions: Caption[];
    linesPerPage: number;
    subtitlesZoomMeasurerSize: number;
    subtitlesLineHeight: number;
    fps: number;
}> = ({
    captions,
    fps,
    linesPerPage,
    subtitlesLineHeight
}) => {
        const frame = useCurrentFrame();

        const { pages } = useMemo(() => createTikTokStyleCaptions({
            captions: captions.map((c, i) => ({
                ...c,
                text: `${i === 0 ? "" : " "}${c.text}`,
            })),
            combineTokensWithinMilliseconds: 1000,
        }), [captions]);

        const currentPage = pages.find((p) => {
            const startFrame = p.startMs / 1000 * fps;
            const endFrame = (p.startMs + p.durationMs) / 1000 * fps;
            return frame >= startFrame && frame < endFrame;
        });

        if (!currentPage) {
            return null;
        }

        const maxCharsPerLine = 42;
        const lines: (typeof currentPage.tokens)[] = [];
        let currentLine: (typeof currentPage.tokens) = [];

        currentPage.tokens.forEach((token) => {
            const lineText = [...currentLine, token].map((t) => t.text).join('').trim();
            if (lineText.length > maxCharsPerLine && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [token];
            } else {
                currentLine.push(token);
            }
        });
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        return (
            <div
                className="w-[80%] mx-auto flex justify-center items-center"
                style={{
                    wordWrap: 'break-word',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                }}
            >
                <div style={{ lineHeight: `${subtitlesLineHeight}px` }}>
                    {lines.slice(0, linesPerPage).map((line, i) => (
                        <div key={i}>
                            {line.map((token, j) => {
                                const originalIndex = currentPage.tokens.findIndex(t => t === token);
                                const item = {
                                    id: originalIndex,
                                    start: token.fromMs / 1000 * fps,
                                    end: token.toMs / 1000 * fps,
                                    text: token.text,
                                }
                                return <Word key={`${i}-${j}`} frame={frame} item={item} />
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

declare global {
    interface Array<T> {
        findLastIndex(
            predicate: (value: T, index: number, obj: T[]) => unknown,
            thisArg?: unknown
        ): number;
    }
}