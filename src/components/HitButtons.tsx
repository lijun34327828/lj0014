import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/useGameStore.js';
import { TRACK_COLORS, getTrackGlow } from '../utils/judgementColors.js';

const TRACK_KEYS = ['d', 'f', 'j', 'k'];

export function HitButtons() {
  const hitNote = useGameStore((state) => state.hitNote);
  const status = useGameStore((state) => state.status);
  const pressedTracks = useRef<Set<number>>(new Set());

  const handleTrackPress = useCallback((track: number) => {
    if (status !== 'playing') return;
    if (pressedTracks.current.has(track)) return;

    pressedTracks.current.add(track);
    hitNote(track);

    setTimeout(() => {
      pressedTracks.current.delete(track);
    }, 50);
  }, [hitNote, status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const track = TRACK_KEYS.indexOf(e.key.toLowerCase());
      if (track !== -1) {
        e.preventDefault();
        handleTrackPress(track);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTrackPress]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, track: number) => {
    e.preventDefault();
    handleTrackPress(track);
  };

  return (
    <div className="flex justify-center gap-4 mt-4">
      {[0, 1, 2, 3].map((track) => (
        <button
          key={track}
          className={`
            w-20 h-20 rounded-full
            flex items-center justify-center
            text-white font-bold text-lg
            transition-all duration-75
            select-none
            active:scale-95
            focus:outline-none
          `}
          style={{
            backgroundColor: `${TRACK_COLORS[track]}33`,
            border: `3px solid ${TRACK_COLORS[track]}`,
            boxShadow: getTrackGlow(track),
            touchAction: 'manipulation',
          }}
          onMouseDown={(e) => handleTouchStart(e, track)}
          onTouchStart={(e) => handleTouchStart(e, track)}
        >
          <span
            className="text-2xl font-bold"
            style={{ color: TRACK_COLORS[track] }}
          >
            {TRACK_KEYS[track].toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}
