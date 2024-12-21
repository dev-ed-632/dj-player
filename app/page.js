'use client';

import { useState } from 'react';
import DeckSection from '@/components/DeckSection';

export default function Home() {
  const [leftDeckFile, setLeftDeckFile] = useState(null);
  const [rightDeckFile, setRightDeckFile] = useState(null);

  return (
    <main className="min-h-screen bg-[#1a1625] text-white">
      {/* Top waveform display */}
      <div className="h-32 flex">
        <div className="w-1/2 border-r border-gray-700 p-4">
          {leftDeckFile && (
            <div className="text-sm">
              <div className="text-gray-400">Track Title</div>
              <div className="flex justify-between">
                <span>0:00</span>
                <span>/ {leftDeckFile ? '0:00' : '--:--'}</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-1/2 p-4">
          {rightDeckFile && (
            <div className="text-sm">
              <div className="text-gray-400">Track Title</div>
              <div className="flex justify-between">
                <span>0:00</span>
                <span>/ {rightDeckFile ? '0:00' : '--:--'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main deck sections */}
      <div className="flex">
        <DeckSection 
          side="left"
          audioFile={leftDeckFile}
          setAudioFile={setLeftDeckFile}
          className="w-1/2 border-r border-gray-700"
        />
        <DeckSection 
          side="right"
          audioFile={rightDeckFile}
          setAudioFile={setRightDeckFile}
          className="w-1/2"
        />
      </div>
    </main>
  );
}

