import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/useGameStore.js';
import type { Note } from '../../shared/types.js';
import { TRACK_COLORS, JUDGEMENT_COLORS } from '../utils/judgementColors.js';

interface GameCanvasProps {
  width: number;
  height: number;
}

const FALL_DURATION = 2000;
const JUDGE_LINE_Y = 0.85;
const TRACK_COUNT = 4;

export function GameCanvas({ width, height }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }>>([]);

  const {
    notes,
    hitNotes,
    currentTime,
    status,
    judgementEffects,
    clearJudgementEffects,
  } = useGameStore();

  const trackWidth = width / TRACK_COUNT;
  const judgeLineY = height * JUDGE_LINE_Y;

  const calculateNoteY = useCallback((note: Note, gameTime: number) => {
    const speed = note.speedMultiplier || 1;
    const adjustedFall = FALL_DURATION / speed;
    const timeUntilHit = note.hitTime - gameTime;
    const progress = 1 - timeUntilHit / adjustedFall;
    return judgeLineY * (1 - progress);
  }, [judgeLineY]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a1f');
    gradient.addColorStop(0.5, '#0d0d2b');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      const x = (i * 37 + currentTime * 0.02) % width;
      const y = (i * 23 + currentTime * 0.01) % height;
      const size = 1 + (i % 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [width, height, currentTime]);

  const drawTracks = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < TRACK_COUNT; i++) {
      const x = i * trackWidth;
      const color = TRACK_COLORS[i];

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + trackWidth, 0);
      ctx.lineTo(x + trackWidth, height);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const trackGradient = ctx.createLinearGradient(x, 0, x, judgeLineY);
      trackGradient.addColorStop(0, 'transparent');
      trackGradient.addColorStop(1, `${color}10`);
      ctx.fillStyle = trackGradient;
      ctx.fillRect(x + 1, 0, trackWidth - 2, judgeLineY);
    }
  }, [width, height, trackWidth, judgeLineY]);

  const drawJudgeLine = useCallback((ctx: CanvasRenderingContext2D) => {
    const pulseIntensity = 0.5 + 0.5 * Math.sin(currentTime * 0.01);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 * pulseIntensity;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(width, judgeLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 0; i < TRACK_COUNT; i++) {
      const centerX = i * trackWidth + trackWidth / 2;
      const color = TRACK_COLORS[i];
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * pulseIntensity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, judgeLineY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [width, judgeLineY, trackWidth, currentTime]);

  const drawNote = useCallback((ctx: CanvasRenderingContext2D, note: Note, gameTime: number) => {
    const y = calculateNoteY(note, gameTime);

    if (y < -50 || y > height + 50) return;

    if (note.isHidden && note.hitTime - gameTime < FALL_DURATION * 0.3) {
      return;
    }

    const x = note.track * trackWidth + trackWidth / 2;
    const color = TRACK_COLORS[note.track];

    if (y < judgeLineY + 50 && y > judgeLineY - 50) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
    }

    const noteWidth = trackWidth * 0.85;
    const noteHeight = note.type === 'hold' && note.duration
      ? Math.min((note.duration / FALL_DURATION) * height * 0.5, 200)
      : 25;

    const opacity = note.isHidden ? 0.3 + 0.7 * Math.max(0, 1 - (note.hitTime - gameTime) / (FALL_DURATION * 0.5)) : 1;
    ctx.globalAlpha = opacity;

    const gradient = ctx.createLinearGradient(x - noteWidth / 2, y - noteHeight, x + noteWidth / 2, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}88`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x - noteWidth / 2, y - noteHeight, noteWidth, noteHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = opacity * 0.5;
    ctx.fillRect(x - noteWidth / 2 + 5, y - noteHeight + 3, noteWidth - 10, 4);

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (note.type === 'hold' && note.duration) {
      ctx.globalAlpha = opacity * 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(x - noteWidth / 2 + 10, y - noteHeight - 50, noteWidth - 20, 50);
      ctx.globalAlpha = 1;
    }
  }, [trackWidth, height, judgeLineY, calculateNoteY]);

  const drawJudgementEffects = useCallback((ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    judgementEffects.forEach((effect) => {
      const age = now - effect.timestamp;
      if (age > 500) return;

      const progress = age / 500;
      const x = effect.track * trackWidth + trackWidth / 2;
      const y = judgeLineY - 50 - progress * 60;
      const scale = 1 + progress * 0.5;
      const opacity = 1 - progress;

      ctx.globalAlpha = opacity;
      ctx.font = `bold ${Math.floor(24 * scale)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = JUDGEMENT_COLORS[effect.judgement];
      ctx.shadowColor = JUDGEMENT_COLORS[effect.judgement];
      ctx.shadowBlur = 15;
      ctx.fillText(effect.judgement.toUpperCase(), x, y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (progress < 0.1) {
        spawnParticles(x, judgeLineY, JUDGEMENT_COLORS[effect.judgement], 15);
      }
    });
  }, [judgementEffects, trackWidth, judgeLineY, spawnParticles]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;

      if (p.life <= 0) return false;

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let gameTime = currentTime;
    if (status === 'idle' && notes.length > 0) {
      startTimeRef.current = Date.now();
    }

    ctx.clearRect(0, 0, width, height);

    drawBackground(ctx);
    drawTracks(ctx);
    drawJudgeLine(ctx);

    notes.forEach((note) => {
      if (!hitNotes.has(note.id)) {
        drawNote(ctx, note, gameTime);
      }
    });

    drawJudgementEffects(ctx);
    drawParticles(ctx);

    if (status !== 'ended') {
      animationRef.current = requestAnimationFrame(render);
    }
  }, [
    width,
    height,
    currentTime,
    status,
    notes,
    hitNotes,
    drawBackground,
    drawTracks,
    drawJudgeLine,
    drawNote,
    drawJudgementEffects,
    drawParticles,
  ]);

  useEffect(() => {
    if (status === 'playing') {
      animationRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, render]);

  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      clearJudgementEffects();
    }, 100);

    return () => clearInterval(interval);
  }, [status, clearJudgementEffects]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
      style={{
        boxShadow: '0 0 30px rgba(139, 0, 255, 0.3)',
      }}
    />
  );
}
