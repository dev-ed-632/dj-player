'use client';

import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useEffect, useRef, useState } from 'react';
import WaveformDisplay from './WaveformDisplay';

export default function Turntable({ 
  audioRef, 
  isPlaying, 
  onPlay, 
  currentTime, 
  duration,
  analyserNode 
}) {
  const controls = useAnimation();
  const rotationValue = useMotionValue(0);
  const lastRotation = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const discRef = useRef(null);
  const draggingInterval = useRef(null);

  const scratchAudioContext = useRef(null);
  const scratchBufferSource = useRef(null);

  // Initialize Web Audio API for scratch effects
  useEffect(() => {
    scratchAudioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    fetch('/scratch.mp3')
      .then((response) => response.arrayBuffer())
      .then((buffer) => scratchAudioContext.current.decodeAudioData(buffer))
      .then((decodedBuffer) => {
        scratchBufferSource.current = decodedBuffer;
      });
  }, []);

  const playScratchEffect = (speed) => {
    if (!scratchAudioContext.current || !scratchBufferSource.current) return;
    const source = scratchAudioContext.current.createBufferSource();
    const gainNode = scratchAudioContext.current.createGain();
    source.buffer = scratchBufferSource.current;
    source.playbackRate.value = Math.abs(speed);
    gainNode.gain.value = Math.min(Math.abs(speed * 0.2), 0.3);
    source.connect(gainNode).connect(scratchAudioContext.current.destination);
    source.start();
    source.onended = () => source.disconnect();
  };

  // Smooth rotation during playback
  useEffect(() => {
    if (isPlaying && !isDragging) {
      controls.start({
        rotate: [0, 360],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        },
      });
    } else {
      controls.stop();
    }
  }, [isPlaying, isDragging, controls]);

  useEffect(() => {
    return () => clearInterval(draggingInterval.current);
  }, []);

  const bind = useGesture(
    {
      onDragStart: ({ event }) => {
        event.preventDefault();
        setIsDragging(true);
        controls.stop();
        if (audioRef.current) {
          audioRef.current.preservesPitch = false; // Disable pitch preservation for dragging
        }
      },
      onDrag: ({ movement: [mx], velocity: [vx], direction: [dx] }) => {
        if (!audioRef.current || !discRef.current) return;

        const maxSpeed = 4; // Limit the speed for smoother control
        const speed = dx * Math.min(Math.abs(mx * 0.1), maxSpeed);

        rotationValue.set(lastRotation.current + mx);

        // Calculate playback rate
        if (speed < 0) {
          // Simulate reverse playback
          if (!draggingInterval.current) {
            draggingInterval.current = setInterval(() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 0.05);
              }
            }, 50);
          }
        } else {
          // Play normally
          clearInterval(draggingInterval.current);
          draggingInterval.current = null;
          audioRef.current.playbackRate = Math.max(Math.abs(speed), 0.5); // Ensure minimum speed
        }

        // Trigger scratch effect
        playScratchEffect(speed);
      },
      onDragEnd: () => {
        setIsDragging(false);
        clearInterval(draggingInterval.current);
        draggingInterval.current = null;

        // Reset playback to normal
        lastRotation.current = rotationValue.get();
        if (audioRef.current) {
          audioRef.current.playbackRate = 1;
          audioRef.current.preservesPitch = true; // Re-enable pitch preservation
        }

        if (isPlaying) {
          controls.start({
            rotate: [lastRotation.current, lastRotation.current + 360],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            },
          });
        }
      },
    },
    {
      drag: {
        from: () => [rotationValue.get(), 0],
        preventDefault: true,
      },
    }
  );

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Waveform Section */}
      <div className="h-24 relative bg-gray-900 rounded-lg overflow-hidden">
        <WaveformDisplay
          analyser={analyserNode}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          audioRef={audioRef}
          onSeek={handleSeek}
        />
      </div>

      {/* Turntable Section */}
      <div className="relative aspect-square">
        <motion.div
          ref={discRef}
          {...bind()}
          animate={controls}
          style={{ rotate: rotationValue }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="absolute inset-0 rounded-full bg-gray-800 shadow-lg">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-gray-600"
                style={{
                  margin: `${(i + 1) * 3}%`,
                  opacity: 1 - i * 0.05,
                }}
              />
            ))}
          </div>
          <div
            className="absolute inset-[35%] rounded-full bg-gradient-to-br from-gray-700 to-gray-500"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            <div className="absolute inset-[40%] rounded-full bg-gray-400 flex items-center justify-center">
              {isPlaying ? 'Pause' : 'Play'}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
