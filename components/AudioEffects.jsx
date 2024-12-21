'use client';

import { useEffect, useState, useRef } from 'react';

export default function AudioEffects({
  bpm,
  setBpm,
  bassLevel,
  setBassLevel,
  filter,
  setFilter,
  audioRef,
  audioContext
}) {
  const [audioNodes, setAudioNodes] = useState(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    const initializeAudio = () => {
      try {
        if (!audioContext || !audioRef.current) return;

        // Reuse the existing sourceNodeRef or create a new one
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContext.createMediaElementSource(audioRef.current);
        }

        const bassEQ = audioContext.createBiquadFilter();
        const filterNode = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();

        // Configure initial node settings
        bassEQ.type = 'lowshelf';
        bassEQ.frequency.value = 200;
        filterNode.type = 'allpass';

        // Connect the nodes
        sourceNodeRef.current.connect(bassEQ);
        bassEQ.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        setAudioNodes({ bassEQ, filterNode, gainNode });

        return () => {
          bassEQ.disconnect();
          filterNode.disconnect();
          gainNode.disconnect();
        };
      } catch (error) {
        console.error("Error initializing audio nodes:", error);
      }
    };

    initializeAudio();

    // Cleanup function
    return () => {
      if (audioNodes) {
        audioNodes.bassEQ?.disconnect();
        audioNodes.filterNode?.disconnect();
        audioNodes.gainNode?.disconnect();
      }
    };
  }, [audioContext, audioRef]);

  // Effect for bass level changes
  useEffect(() => {
    if (audioNodes?.bassEQ) {
      audioNodes.bassEQ.gain.value = bassLevel;
    }
  }, [bassLevel, audioNodes]);

  // Effect for filter changes
  useEffect(() => {
    if (audioNodes?.filterNode) {
      switch (filter) {
        case 'lowpass':
          audioNodes.filterNode.type = 'lowpass';
          audioNodes.filterNode.frequency.value = 1000;
          break;
        case 'highpass':
          audioNodes.filterNode.type = 'highpass';
          audioNodes.filterNode.frequency.value = 500;
          break;
        case 'bandpass':
          audioNodes.filterNode.type = 'bandpass';
          audioNodes.filterNode.frequency.value = 750;
          break;
        default:
          audioNodes.filterNode.type = 'allpass';
      }
    }
  }, [filter, audioNodes]);

  // Effect for BPM changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = bpm / 120;
    }
  }, [bpm, audioRef]);

  return (
    <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-lg">
      <div>
        <label htmlFor="bpm" className="block text-sm font-medium text-gray-300 mb-1">
          BPM
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            id="bpm"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-300 w-12">{bpm}</span>
        </div>
      </div>

      <div>
        <label htmlFor="bass" className="block text-sm font-medium text-gray-300 mb-1">
          Bass
        </label>
        <input
          type="range"
          id="bass"
          min="-12"
          max="12"
          value={bassLevel}
          onChange={(e) => setBassLevel(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label htmlFor="filter" className="block text-sm font-medium text-gray-300 mb-1">
          Filter
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="lowpass">Low Pass</option>
          <option value="highpass">High Pass</option>
          <option value="bandpass">Band Pass</option>
        </select>
      </div>
    </div>
  );
}
