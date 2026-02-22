import React, { useState, useEffect, useRef } from 'react';
import { Send, User, X, Minus, Maximize2, Smile, Image as ImageIcon, Type, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, User as UserType } from '../types';

interface ChatWindowProps {
  currentUser: UserType;
  targetUser: UserType;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendNudge: () => void;
  onClose: () => void;
}

export default function ChatWindow({ 
  currentUser, 
  targetUser, 
  messages, 
  onSendMessage, 
  onSendNudge,
  onClose 
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [isNudged, setIsNudged] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Check for last message being a nudge
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.type === 'nudge' && Date.now() - lastMsg.timestamp < 1000) {
      triggerNudge();
    }
  }, [messages]);

  const triggerNudge = () => {
    setIsNudged(true);
    setTimeout(() => setIsNudged(false), 500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleNudgeClick = () => {
    onSendNudge();
    triggerNudge();
  };

  return (
    <motion.div
      ref={windowRef}
      initial={{ scale: 0.9, opacity: 0, y: 20, rotate: 1 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        rotate: isNudged ? [-2, 2, -2, 2, 0] : 0,
        x: isNudged ? [-10, 10, -10, 10, 0] : 0
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        x: { duration: 0.4 },
        rotate: { duration: 0.4 }
      }}
      className="w-[400px] h-[500px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
    >
      {/* Title Bar */}
      <div className="bg-[#4ECDC4] border-b-4 border-black p-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white border-2 border-black" />
          <span className="text-black text-sm font-black uppercase tracking-tighter truncate max-w-[200px]">
            {targetUser.username}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="w-6 h-6 bg-white border-2 border-black flex items-center justify-center hover:bg-gray-100 active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <Minus className="w-3 h-3 text-black" strokeWidth={3} />
          </button>
          <button onClick={onClose} className="w-6 h-6 bg-[#FF6B6B] border-2 border-black flex items-center justify-center hover:bg-[#ff5252] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <X className="w-3 h-3 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#FFE66D] border-b-4 border-black p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
           {targetUser.avatar ? (
              <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-black" strokeWidth={2.5} />
            )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black text-black uppercase tracking-wide">{targetUser.username}</span>
          <span className="text-[10px] font-bold text-black/60 italic truncate max-w-[200px]">
            {targetUser.personalMessage || "No personal message"}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-[#F7F7F7] p-4 overflow-y-auto font-sans text-sm border-b-4 border-black space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-xs mt-10 font-bold uppercase tracking-widest border-2 border-dashed border-gray-300 p-4 rounded-lg">
            Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'nudge') {
              return (
                <div key={msg.id} className="text-center my-4">
                  <span className="inline-block px-4 py-1 bg-[#FF6B6B] text-black font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
                    {msg.senderId === currentUser.id ? 'You sent a nudge!' : 'NUDGE!!!'}
                  </span>
                </div>
              );
            }
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
                    {isMe ? 'You' : targetUser.username}
                  </span>
                </div>
                <div className={`
                  max-w-[80%] px-3 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  ${isMe ? 'bg-[#4ECDC4] rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-none' : 'bg-white rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-none'}
                `}>
                  <p className="text-black font-bold text-sm leading-snug">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-36 bg-white flex flex-col p-3 gap-2">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-2">
          <button onClick={handleNudgeClick} className="px-3 py-1 bg-white border-2 border-black text-black text-xs font-black uppercase hover:bg-gray-50 active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1" title="Send Nudge">
            <Bell className="w-3 h-3" /> Nudge
          </button>
          <div className="w-px h-4 bg-black mx-1" />
          <button className="p-1 hover:bg-gray-100 rounded border-2 border-transparent hover:border-black transition-all" title="Emoticons">
            <Smile className="w-4 h-4 text-black" strokeWidth={2.5} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded border-2 border-transparent hover:border-black transition-all" title="Send Image">
            <ImageIcon className="w-4 h-4 text-black" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSend} className="flex-1 flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            className="flex-1 bg-[#F7F7F7] border-2 border-black p-2 text-sm font-bold outline-none resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder:text-gray-400"
            placeholder="Type a message..."
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-[#FFD700] border-2 border-black text-black px-4 rounded-none hover:bg-[#ffea70] active:translate-y-[2px] active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:translate-y-0"
          >
            Send
          </button>
        </form>
      </div>
    </motion.div>
  );
}
