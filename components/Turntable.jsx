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
  const scratchSoundRef = useRef(null);

  // Load scratch sound
  useEffect(() => {
    scratchSoundRef.current = new Audio('/scratch.mp3'); // You'll need to add this sound file
    scratchSoundRef.current.loop = true;
  }, []);

  // Normal playback rotation
  useEffect(() => {
    if (isPlaying && !isDragging) {
      controls.start({
        rotate: [0, 360],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }
      });
    } else {
      controls.stop();
    }
  }, [isPlaying, isDragging, controls]);

  const bind = useGesture({
    onDragStart: () => {
      setIsDragging(true);
      controls.stop();
      if (audioRef.current) {
        audioRef.current.preservePitch = false;
      }
    },
    onDrag: ({ movement: [x], velocity: [vx], direction: [dx] }) => {
      if (!audioRef.current) return;

      // Calculate rotation based on drag
      const newRotation = lastRotation.current + (x * 0.5);
      rotationValue.set(newRotation % 360);

      // Calculate playback rate based on velocity
      const direction = dx > 0 ? 1 : -1;
      const speed = Math.min(Math.abs(vx) * 0.005, 4); // Reduced multiplier for more control
      const playbackRate = direction * (speed || 1);

      // Ensure playback rate is within valid range (-16 to 16)
      const clampedRate = Math.max(-16, Math.min(16, playbackRate));
      
      // Apply playback effects
      try {
        audioRef.current.playbackRate = Math.abs(clampedRate) < 0.1 ? 0 : clampedRate;

        // Handle scratch sound
        if (Math.abs(vx) > 1) {
          if (scratchSoundRef.current && !scratchSoundRef.current.playing) {
            scratchSoundRef.current.play();
            scratchSoundRef.current.volume = Math.min(Math.abs(vx) * 0.001, 0.3);
          }
        } else if (scratchSoundRef.current) {
          scratchSoundRef.current.pause();
          scratchSoundRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error('Playback rate error:', error);
      }
    },
    onDragEnd: () => {
      setIsDragging(false);
      lastRotation.current = rotationValue.get();

      if (audioRef.current) {
        audioRef.current.playbackRate = 1;
        audioRef.current.preservePitch = true;
      }

      if (scratchSoundRef.current) {
        scratchSoundRef.current.pause();
        scratchSoundRef.current.currentTime = 0;
      }

      if (isPlaying) {
        controls.start({
          rotate: [lastRotation.current, lastRotation.current + 360],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }
        });
      }
    }
  });

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto">
      {/* Vinyl record with grooves */}
      <motion.div
        {...bind()}
        animate={controls}
        style={{ rotate: rotationValue }}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        <div className="relative w-full h-full">
          {/* Main vinyl disc */}
          <div className="absolute inset-0 rounded-full bg-[#2d2d2d] shadow-lg">
            {/* Grooves */}
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-[#222]"
                style={{
                  margin: `${(i + 1) * 2.5}%`,
                  opacity: 1 - (i * 0.02)
                }}
              />
            ))}

            {/* Center label */}
            <div 
              className="absolute inset-[30%] rounded-full bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center"
              onClick={onPlay}
            >
              <div className="absolute inset-[40%] rounded-full bg-[#111] flex items-center justify-center">
                <div className="w-6 h-6 text-white">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tonearm */}
      <div className="absolute top-0 right-0 w-1/3 h-1/2 origin-bottom-right rotate-45">
        <div className="w-1 h-full bg-gray-600 transform -translate-x-1/2">
          <div className="absolute bottom-0 w-4 h-4 bg-gray-500 rounded-full transform -translate-x-1/2" />
        </div>
      </div>

      {/* Waveform overlay */}
      <div className="absolute inset-0 opacity-30">
        <WaveformDisplay 
          analyser={analyserNode}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
        />
      </div>
    </div>
  );
} 