'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function WaveformDisplay({ 
  analyser, 
  isPlaying, 
  currentTime, 
  duration,
  audioRef,
  onSeek 
}) {
  const canvasRef = useRef(null);
  const [audioData, setAudioData] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const containerRef = useRef(null);

  // Function to draw the waveform
  const drawWaveform = useCallback((ctx, data, width, height) => {
    ctx.clearRect(0, 0, width, height);
    const middle = height / 2;
    const barWidth = width / data.length;

    // Draw background
    ctx.fillStyle = '#1a1625';
    ctx.fillRect(0, 0, width, height);

    // Draw progress
    const progress = currentTime / duration;
    ctx.fillStyle = 'rgba(79, 70, 229, 0.2)'; // Indigo color with opacity
    ctx.fillRect(0, 0, width * progress, height);

    // Draw bars
    data.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * (height / 2);

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, middle - barHeight, 0, middle + barHeight);
      gradient.addColorStop(0, '#4f46e5'); // Indigo
      gradient.addColorStop(1, '#818cf8'); // Lighter indigo

      ctx.fillStyle = gradient;
      
      // Draw upper bar
      ctx.fillRect(x, middle - barHeight, barWidth - 1, barHeight);
      // Draw lower bar (mirrored)
      ctx.fillRect(x, middle, barWidth - 1, barHeight);
    });

    // Draw hover position
    if (hoveredPosition !== null) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(hoveredPosition, 0, 2, height);
    }

    // Draw playhead
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width * progress, 0, 2, height);
  }, [currentTime, duration, hoveredPosition]);

  // Initialize audio data
  useEffect(() => {
    if (!analyser || !audioRef.current) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    
    const processAudioData = () => {
      analyser.getFloatTimeDomainData(dataArray);
      
      // Process the data to get a smoother visualization
      const processedData = [];
      const chunks = Math.floor(dataArray.length / 100);
      
      for (let i = 0; i < 100; i++) {
        let sum = 0;
        for (let j = 0; j < chunks; j++) {
          sum += Math.abs(dataArray[i * chunks + j]);
        }
        processedData.push(sum / chunks);
      }
      
      setAudioData(processedData);
    };

    processAudioData();
    
    if (isPlaying) {
      const interval = setInterval(processAudioData, 50);
      return () => clearInterval(interval);
    }
  }, [analyser, isPlaying, audioRef]);

  // Draw the waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    drawWaveform(ctx, audioData, width, height);
  }, [audioData, drawWaveform]);

  // Handle click/touch to seek
  const handleInteraction = (e) => {
    if (!containerRef.current || !duration) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  // Handle hover
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoveredPosition(x);
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 cursor-pointer"
      onClick={handleInteraction}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredPosition(null)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={1000}
        height={96}
      />
      {hoveredPosition !== null && (
        <div 
          className="absolute top-0 text-xs bg-gray-800 px-2 py-1 rounded transform -translate-x-1/2"
          style={{ left: hoveredPosition }}
        >
          {new Date((hoveredPosition / containerRef.current?.offsetWidth * duration) * 1000)
            .toISOString().substr(14, 5)}
        </div>
      )}
    </div>
  );
} 