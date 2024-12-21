'use client';

import { useState, useRef, useEffect } from 'react';
import Turntable from './Turntable';
import AudioControls from './AudioControls';
import AudioEffects from './AudioEffects';

export default function DeckSection({ side, audioFile, setAudioFile, className }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [bpm, setBpm] = useState(120);
  const [bassLevel, setBassLevel] = useState(0);
  const [filter, setFilter] = useState('none');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);

  // Cleanup function for audio nodes
  const cleanupAudioNodes = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }
  };

  // Initialize audio context and nodes
  const initializeAudio = async () => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume AudioContext
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Clean up existing nodes before creating new ones
      cleanupAudioNodes();

      // Create new nodes
      if (audioRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        analyserNodeRef.current = audioContextRef.current.createAnalyser();
        analyserNodeRef.current.fftSize = 2048;

        // Connect nodes
        sourceNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(audioContextRef.current.destination);
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  // Clean up everything when component unmounts
  useEffect(() => {
    return () => {
      cleanupAudioNodes();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Handle audio file changes
  useEffect(() => {
    if (audioFile) {
      // Stop playback and reset state
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Clean up existing audio nodes
      cleanupAudioNodes();
    }
  }, [audioFile]);

  // Track duration and current time
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleLoadedMetadata = async () => {
        setDuration(audio.duration);
        await initializeAudio();
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [audioFile]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioFile(url);
    }
  };

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          // Make sure audio nodes are initialized
          if (!sourceNodeRef.current) {
            await initializeAudio();
          }
          await audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  return (
    <div className={`bg-[#1a1625] p-6 ${className}`}>
      <div className="flex flex-col gap-6 h-full">
        {/* Turntable Section */}
        <div className="flex-1">
          {!audioFile ? (
            <div className="h-full flex items-center justify-center">
              <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg">
                Upload Track
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <Turntable
              audioRef={audioRef}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              currentTime={currentTime}
              duration={duration}
              analyserNode={analyserNodeRef.current}
              sourceNode={sourceNodeRef.current}
              audioContext={audioContextRef.current}
            />
          )}
        </div>

        {/* Controls Section */}
        <div className="space-y-4">
          <AudioControls 
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            volume={volume}
            setVolume={setVolume}
            audioRef={audioRef}
            onPlay={handlePlay}
            currentTime={currentTime}
            duration={duration}
          />
          
          <AudioEffects 
            bpm={bpm}
            setBpm={setBpm}
            bassLevel={bassLevel}
            setBassLevel={setBassLevel}
            filter={filter}
            setFilter={setFilter}
            audioRef={audioRef}
            audioContext={audioContextRef.current}
            sourceNode={sourceNodeRef.current}
          />
          
          <audio
            ref={audioRef}
            src={audioFile}
            preload="metadata"
          />
        </div>
      </div>
    </div>
  );
} 