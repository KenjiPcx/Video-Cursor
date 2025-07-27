import { interpolate } from 'remotion';
import React from 'react';

type SubtitleItem = {
    id: number;
    start: number;
    end: number;
    text: string;
};
export const Word: React.FC<{
    item: SubtitleItem;
    frame: number;
}> = ({ item, frame }) => {

    const opacity = interpolate(frame, [item.start, item.start + 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const isSpeaking = frame >= item.start && frame <= item.end;

    return (
        <span
            style={{
                display: 'inline-block',
                opacity,
                fontSize: '3rem',
                marginRight: '0.5rem',
                fontWeight: 'bold',
                color: isSpeaking ? '#FFD700' : 'white',
                textShadow: isSpeaking
                    ? '0 0 10px #FFD700, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000'
                    : '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                transition: 'color 0.2s ease-in-out, text-shadow 0.2s ease-in-out',
            }}
        >
            {item.text}
        </span>
    );
};