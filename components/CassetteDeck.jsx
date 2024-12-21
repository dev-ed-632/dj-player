'use client';

import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useRef, useEffect, useState } from 'react';

export default function CassetteDeck({ isPlaying, audioRef }) {
  const controls = useAnimation();
  const spinRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const rotationValue = useMotionValue(0);
  const lastRotation = useRef(0);

  // Animation for continuous rotation
  useEffect(() => {
    if (isPlaying && !isDragging) {
      controls.start({
        rotate: 360,
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
        lastRotation.current = rotationValue.get();
      }
    },
    onDrag: ({ movement: [x, y], velocity: [vx] }) => {
      if (!audioRef.current) return;
      
      // Calculate rotation based on drag
      const rotation = lastRotation.current + (x * 0.5);
      rotationValue.set(rotation);
      
      // Apply rotation to both reels
      const leftReel = document.querySelector('#left-reel');
      const rightReel = document.querySelector('#right-reel');
      if (leftReel && rightReel) {
        leftReel.style.transform = `rotate(${rotation}deg)`;
        rightReel.style.transform = `rotate(${rotation}deg)`;
      }
      
      // Adjust playback rate based on drag velocity
      const playbackRate = 1 + (Math.abs(vx) * 0.01);
      audioRef.current.playbackRate = playbackRate;
      
      // Add glitch effect during fast dragging
      if (Math.abs(vx) > 5) {
        audioRef.current.preservePitch = false;
        // Add visual glitch effect
        spinRef.current.style.filter = 'url(#glitch)';
      } else {
        audioRef.current.preservePitch = true;
        spinRef.current.style.filter = 'none';
      }
    },
    onDragEnd: () => {
      setIsDragging(false);
      if (audioRef.current) {
        audioRef.current.playbackRate = 1;
        audioRef.current.preservePitch = true;
      }
      lastRotation.current = rotationValue.get();
      
      if (isPlaying) {
        controls.start({
          rotate: 360,
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
    <div className="relative flex-1 flex items-center justify-center">
      {/* SVG Filter for glitch effect */}
      <svg className="hidden">
        <defs>
          <filter id="glitch">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
            <feOffset dx="3" dy="3" result="offset1" />
            <feOffset dx="-3" dy="-3" result="offset2" />
            <feBlend mode="screen" in="offset1" in2="offset2" />
          </filter>
        </defs>
      </svg>

      <motion.div
        {...bind()}
        animate={controls}
        ref={spinRef}
        style={{ rotate: rotationValue }}
        className="w-64 h-64 relative cursor-grab active:cursor-grabbing"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat"
             style={{ backgroundImage: `url('/cassette.svg')` }} />
        
        {/* Playback indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
          isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
      </motion.div>
    </div>
  );
} 