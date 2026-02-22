import React, { useState } from 'react';
import { User, Search, ChevronDown, ChevronRight, LogOut, MessageSquare, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType, UserStatus } from '../types';

interface ContactListProps {
  currentUser: UserType;
  users: UserType[];
  onOpenChat: (userId: string) => void;
  onLogout: () => void;
  onStatusChange: (status: UserStatus) => void;
  onPersonalMessageChange: (msg: string) => void;
}

const StatusIcon = ({ status }: { status: UserStatus }) => {
  switch (status) {
    case 'online': return <div className="w-4 h-4 rounded-full bg-[#4ECDC4] border-2 border-black" />;
    case 'busy': return <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-black" />;
    case 'away': return <div className="w-4 h-4 rounded-full bg-[#FFD700] border-2 border-black" />;
    default: return <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-black" />;
  }
};

export default function ContactList({ 
  currentUser, 
  users, 
  onOpenChat, 
  onLogout,
  onStatusChange,
  onPersonalMessageChange
}: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(false);
  const [personalMsg, setPersonalMsg] = useState(currentUser.personalMessage || '');

  const onlineUsers = users.filter(u => u.id !== currentUser.id && u.status !== 'offline');
  const offlineUsers = users.filter(u => u.id !== currentUser.id && u.status === 'offline');

  const handlePersonalMsgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPersonalMessageChange(personalMsg);
  };

  return (
    <div className="w-80 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-sm overflow-hidden flex flex-col h-[600px] relative">
      {/* Notebook Spiral/Binding Effect (Optional decorative) */}
      <div className="absolute top-0 left-4 w-full h-4 flex gap-2 z-20 -mt-2">
         {/* Could add spiral rings here if desired */}
      </div>

      {/* Header */}
      <div className="bg-[#FF6B6B] border-b-4 border-black p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-black" />
          <span className="text-black text-lg font-black uppercase tracking-tighter">Contacts</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onLogout} className="text-black hover:bg-black hover:text-white p-1 rounded border-2 border-black transition-colors" title="Sign Out">
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 bg-[#FFE66D] border-b-4 border-black flex items-start gap-3">
        <div className="relative">
          <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-black" strokeWidth={2} />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1">
            <StatusIcon status={currentUser.status} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-black truncate text-lg">{currentUser.username}</h2>
          </div>
          <select 
              value={currentUser.status}
              onChange={(e) => onStatusChange(e.target.value as UserStatus)}
              className="text-xs font-bold border-2 border-black rounded px-1 py-0.5 bg-white text-black outline-none cursor-pointer mb-1 w-full"
            >
              <option value="online">ONLINE</option>
              <option value="busy">BUSY</option>
              <option value="away">AWAY</option>
            </select>
          <form onSubmit={handlePersonalMsgSubmit} className="mt-1">
            <input
              type="text"
              value={personalMsg}
              onChange={(e) => setPersonalMsg(e.target.value)}
              onBlur={() => onPersonalMessageChange(personalMsg)}
              placeholder="Type a personal message..."
              className="w-full text-xs font-medium text-black bg-transparent border-b-2 border-black/20 focus:border-black outline-none transition-colors italic truncate placeholder:text-black/40"
            />
          </form>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-white border-b-4 border-black">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="SEARCH..."
            className="w-full pl-9 pr-2 py-2 text-sm font-bold border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none outline-none transition-all placeholder:text-gray-400"
          />
          <Search className="w-4 h-4 text-black absolute left-3 top-2.5" strokeWidth={3} />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto bg-[#F7F7F7] p-3 space-y-4">
        {/* Online Group */}
        <div>
          <button 
            onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
            className="flex items-center gap-2 w-full text-left text-sm font-black text-black uppercase tracking-wide mb-2"
          >
            {isOnlineExpanded ? <ChevronDown className="w-4 h-4" strokeWidth={3} /> : <ChevronRight className="w-4 h-4" strokeWidth={3} />}
            Online ({onlineUsers.length})
          </button>
          
          {isOnlineExpanded && (
            <div className="space-y-2 pl-2">
              {onlineUsers.length === 0 ? (
                <div className="text-xs font-bold text-gray-400 p-2 border-2 border-dashed border-gray-300 rounded">No one is online...</div>
              ) : (
                onlineUsers
                  .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(user => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onOpenChat(user.id)}
                    className="flex items-center gap-3 p-2 bg-white border-2 border-black rounded shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#4ECDC4] border-2 border-black rounded-full flex items-center justify-center overflow-hidden">
                         {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-black" strokeWidth={2.5} />
                          )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <StatusIcon status={user.status} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-black truncate">{user.username}</span>
                      </div>
                      {user.personalMessage && (
                        <p className="text-[10px] font-bold text-gray-500 truncate">
                          {user.personalMessage}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Offline Group */}
        <div>
          <button 
            onClick={() => setIsOfflineExpanded(!isOfflineExpanded)}
            className="flex items-center gap-2 w-full text-left text-sm font-black text-gray-500 uppercase tracking-wide mb-2"
          >
            {isOfflineExpanded ? <ChevronDown className="w-4 h-4" strokeWidth={3} /> : <ChevronRight className="w-4 h-4" strokeWidth={3} />}
            Offline ({offlineUsers.length})
          </button>
          
          {isOfflineExpanded && (
            <div className="space-y-2 pl-2">
               {offlineUsers
                  .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 bg-gray-100 border-2 border-gray-300 rounded opacity-70 grayscale"
                  >
                    <div className="w-8 h-8 bg-gray-200 border-2 border-gray-400 rounded-full flex items-center justify-center">
                       <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 truncate">{user.username}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
