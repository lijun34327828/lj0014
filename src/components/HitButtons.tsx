import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/useGameStore.js';
import { TRACK_COLORS, getTrackGlow } from '../utils/judgementColors.js';

const TRACK_KEYS = ['d', 'f', 'j', 'k'];

export function HitButtons() {
  const hitNote = useGameStore((state) => state.hitNote);
  const status = useGameStore((state) => state.status);
  const pressedKeys = useRef<Set<string>>(new Set());
  const activePointers = useRef<Map<number, number>>(new Map());

  const handleTrackPress = useCallback((track: number) => {
    if (status !== 'playing') return;
    console.log('[HitButtons] Track pressed:', track);
    hitNote(track);
  }, [hitNote, status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const track = TRACK_KEYS.indexOf(key);
      if (track === -1) return;
      if (pressedKeys.current.has(key)) return;

      pressedKeys.current.add(key);
      e.preventDefault();
      console.log('[HitButtons] KeyDown detected:', key, '-> track', track);
      handleTrackPress(track);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTrackPress]);

  const handlePointerDown = (e: React.PointerEvent, track: number) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, track);
    console.log('[HitButtons] PointerDown track:', track);
    handleTrackPress(track);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    activePointers.current.delete(e.pointerId);
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
            touch-none
          `}
          style={{
            backgroundColor: `${TRACK_COLORS[track]}33`,
            border: `3px solid ${TRACK_COLORS[track]}`,
            boxShadow: getTrackGlow(track),
            touchAction: 'none',
          }}
          onPointerDown={(e) => handlePointerDown(e, track)}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
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
