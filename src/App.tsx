/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserStatus, Message } from './types';
import MSNLogin from './components/MSNLogin';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [activeWindows, setActiveWindows] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'USER_LIST':
            setUsers(data.payload.filter((u: User) => u.id !== currentUser?.id));
            break;
            
          case 'LOGIN_SUCCESS':
            setCurrentUser(data.payload);
            break;
            
          case 'PRIVATE_MESSAGE':
            const message = data.payload;
            if (message.senderId === currentUser?.id || message.targetId === currentUser?.id) {
              const otherId = message.senderId === currentUser?.id ? message.targetId : message.senderId;
              
              setConversations(prev => ({
                ...prev,
                [otherId]: [...(prev[otherId] || []), message]
              }));

              // Open chat window for new messages
              if (message.senderId !== currentUser?.id) {
                setActiveWindows(prev => {
                  if (!prev.includes(otherId)) {
                    return [...prev, otherId];
                  }
                  return prev;
                });

                // Notification
                if (document.hidden && Notification.permission === 'granted') {
                  const sender = users.find(u => u.id === message.senderId);
                  new Notification(`New message from ${sender?.username || 'Someone'}`, {
                    body: message.text,
                    icon: '/vite.svg'
                  });
                }
              }
            }
            break;
            
          case 'NUDGE':
            if (data.payload.senderId !== currentUser?.id) {
              // Handle nudge (you could add visual feedback here)
              console.log('Received nudge from:', data.payload.senderId);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Auto-reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [currentUser, users]);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const handleLogin = (username: string, status: UserStatus, avatar: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOGIN',
        payload: { username, status, avatar }
      }));
    }
  };

  const handleLogout = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    // Clear local state
    setCurrentUser(null);
    setUsers([]);
    setConversations({});
    setActiveWindows([]);
    
    // Reconnect
    connectWebSocket();
  };

  const handleOpenChat = (userId: string) => {
    if (!activeWindows.includes(userId)) {
      setActiveWindows(prev => [...prev, userId]);
    }
  };

  const handleCloseChat = (userId: string) => {
    setActiveWindows(prev => prev.filter(id => id !== userId));
  };

  const handleSendMessage = (targetId: string, text: string) => {
    if (!currentUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      targetId,
      text,
      timestamp: Date.now(),
      type: 'text'
    };

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'PRIVATE_MESSAGE',
      payload: { targetId, text, type: 'text' }
    }));

    // Add to local conversation immediately for instant feedback
    setConversations(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), message]
    }));
  };

  const handleSendNudge = (targetId: string) => {
    if (!currentUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send nudge via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'NUDGE',
      payload: { targetId }
    }));

    // Add local nudge message for feedback
    const nudgeMsg: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      targetId,
      text: "You sent a nudge!",
      timestamp: Date.now(),
      type: 'nudge'
    };
    
    setConversations(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), nudgeMsg]
    }));
  };

  const handleStatusChange = (status: UserStatus) => {
    if (!currentUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'STATUS_CHANGE',
      payload: { status }
    }));

    setCurrentUser({ ...currentUser, status });
  };

  const handlePersonalMessageChange = (msg: string) => {
    if (!currentUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'STATUS_CHANGE',
      payload: { personalMessage: msg }
    }));

    setCurrentUser({ ...currentUser, personalMessage: msg });
  };

  if (!currentUser) {
    return <MSNLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center p-4 overflow-hidden relative font-sans">
      
      {/* Main Contact List */}
      <div className="z-10 relative">
        <ContactList 
          currentUser={currentUser}
          users={users}
          onOpenChat={handleOpenChat}
          onLogout={handleLogout}
          onStatusChange={handleStatusChange}
          onPersonalMessageChange={handlePersonalMessageChange}
        />
      </div>

      {/* Chat Windows */}
      <AnimatePresence>
        {activeWindows.map((userId, index) => {
          const targetUser = users.find(u => u.id === userId);
          if (!targetUser) return null;

          return (
            <div 
                key={userId} 
                className="absolute"
                style={{ 
                    top: `${100 + (index * 30)}px`, 
                    left: `${400 + (index * 30)}px`,
                    zIndex: 20 + index 
                }}
            >
              <ChatWindow
                currentUser={currentUser}
                targetUser={targetUser}
                messages={conversations[userId] || []}
                onSendMessage={(text) => handleSendMessage(userId, text)}
                onSendNudge={() => handleSendNudge(userId)}
                onClose={() => handleCloseChat(userId)}
              />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}