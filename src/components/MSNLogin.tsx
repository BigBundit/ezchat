import React, { useState } from 'react';
import { User, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface MSNLoginProps {
  onLogin: (username: string, status: 'online' | 'busy' | 'away', avatar: string) => void;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Grumpy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Happy',
];

export default function MSNLogin({ onLogin }: MSNLoginProps) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'online' | 'busy' | 'away'>('online');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username, status, selectedAvatar);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] font-sans p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        className="w-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#FFD700] border-b-4 border-black p-4 flex items-center justify-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter">EzChat</h1>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-6">
          
          {/* Avatar Selection */}
          <div className="w-full">
            <label className="text-sm font-bold uppercase tracking-wide block mb-2 text-center">Choose your Avatar</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                    selectedAvatar === avatar 
                      ? 'border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105 z-10' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  {selectedAvatar === avatar && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white drop-shadow-md" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wide">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-bold placeholder:text-gray-400"
                placeholder="YOUR NAME"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wide">Status</label>
              <div className="relative">
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-bold appearance-none cursor-pointer"
                >
                  <option value="online">ONLINE</option>
                  <option value="busy">BUSY</option>
                  <option value="away">AWAY</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black"></div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full bg-[#FF6B6B] border-2 border-black text-black py-3 font-black uppercase tracking-wider hover:bg-[#ff5252] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Start Chatting <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
