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
  const lastRotation = useRef(0); // Accumulate total rotation
  const [isDragging, setIsDragging] = useState(false);
  const prevMousePosition = useRef(null); // Track mouse position for direction
  const discRef = useRef(null);

  const scratchAudioContext = useRef(null);
  const scratchBufferSource = useRef(null);
  const scratchLoopSource = useRef(null); // For continuous scratch sound

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

  const startScratchSound = () => {
    if (!scratchAudioContext.current || !scratchBufferSource.current || scratchLoopSource.current) return;
    const source = scratchAudioContext.current.createBufferSource();
    source.buffer = scratchBufferSource.current;
    source.loop = true;
    source.connect(scratchAudioContext.current.destination);
    source.start();
    scratchLoopSource.current = source;
  };

  const stopScratchSound = () => {
    if (scratchLoopSource.current) {
      scratchLoopSource.current.stop();
      scratchLoopSource.current.disconnect();
      scratchLoopSource.current = null;
    }
  };

  // Smooth rotation during playback
  useEffect(() => {
    if (isPlaying && !isDragging) {
      controls.start({
        rotate: [lastRotation.current, lastRotation.current + 360],
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

  const bind = useGesture(
    {
      onDragStart: ({ event }) => {
        event.preventDefault();
        setIsDragging(true);
        controls.stop();
        prevMousePosition.current = null; // Reset mouse tracking
        startScratchSound(); // Start continuous scratch sound
      },
      onDrag: ({ movement: [mx], event }) => {
        event.preventDefault();
        if (!discRef.current || !audioRef.current) return;
  
        const centerX = discRef.current.offsetWidth / 2;
        const centerY = discRef.current.offsetHeight / 2;
  
        const { clientX, clientY } = event;
        const mouseX = clientX - discRef.current.offsetLeft - centerX;
        const mouseY = clientY - discRef.current.offsetTop - centerY;
  
        const angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);
  
        if (prevMousePosition.current === null) {
          prevMousePosition.current = angle;
          return;
        }
  
        let angleDiff = angle - prevMousePosition.current;
  
        // Normalize angle difference to handle continuous rotation across 180/-180 threshold
        if (angleDiff > 180) {
          angleDiff -= 360;
        } else if (angleDiff < -180) {
          angleDiff += 360;
        }
  
        // Update previous mouse position for the next drag event
        prevMousePosition.current = angle;
  
        // Accumulate rotation (track forward and backward)
        lastRotation.current += angleDiff;
        rotationValue.set(lastRotation.current);
  
        // Seek in audio based on angle difference
        const seekTime = audioRef.current.currentTime + angleDiff * 0.05; // Adjust seek sensitivity
        audioRef.current.currentTime = Math.max(0, Math.min(seekTime, duration));
      },
      onDragEnd: () => {
        setIsDragging(false);
        prevMousePosition.current = null;
  
        stopScratchSound(); // Stop continuous scratch sound
  
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
