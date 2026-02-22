/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserStatus, Message, WSMessage } from './types';
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

  // Initialize WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        
        switch (data.type) {
          case 'LOGIN_SUCCESS':
            setCurrentUser(data.payload);
            break;
            
          case 'USER_LIST':
            setUsers(data.payload);
            break;
            
          case 'PRIVATE_MESSAGE': {
            const msg = data.payload as Message;
            const myId = currentUserRef.current?.id;
            if (!myId) return;

            const otherId = msg.senderId === myId ? msg.targetId : msg.senderId;
            
            setConversations(prev => ({
              ...prev,
              [otherId]: [...(prev[otherId] || []), msg]
            }));

            // If I received a message (and didn't send it), open the window if not open
            if (msg.senderId !== myId) {
              setActiveWindows(prev => {
                if (!prev.includes(otherId)) {
                  return [...prev, otherId];
                }
                return prev;
              });
              
              // Play sound?
              if (document.hidden && Notification.permission === 'granted') {
                 new Notification(`New message from ${users.find(u => u.id === otherId)?.username || 'Someone'}`, {
                    body: msg.text,
                    icon: '/vite.svg'
                 });
              }
            }
            break;
          }

          case 'NUDGE': {
            const { senderId } = data.payload;
            const myId = currentUserRef.current?.id;
            if (!myId) return;

            // Nudge is basically a message but with special type
            const nudgeMsg: Message = {
              id: crypto.randomUUID(),
              senderId,
              targetId: myId,
              text: "You received a nudge!",
              timestamp: Date.now(),
              type: 'nudge'
            };

            setConversations(prev => ({
              ...prev,
              [senderId]: [...(prev[senderId] || []), nudgeMsg]
            }));

            setActiveWindows(prev => {
              if (!prev.includes(senderId)) {
                return [...prev, senderId];
              }
              return prev;
            });
            
            // Shake effect is handled in ChatWindow
            break;
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Use a ref to access current user in WS callback
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Re-attach onmessage handler when dependencies change to avoid stale closures? 
  // Better to just handle the logic inside the callback using refs or functional state updates that don't depend on outside state.
  // But we need currentUser.id to know where to file the message.
  
  useEffect(() => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'LOGIN_SUCCESS':
            setCurrentUser(data.payload);
            break;
            
          case 'USER_LIST':
            setUsers(data.payload);
            break;
            
          case 'PRIVATE_MESSAGE': {
            const msg = data.payload as Message;
            const myId = currentUserRef.current?.id;
            if (!myId) return;

            const otherId = msg.senderId === myId ? msg.targetId : msg.senderId;
            
            setConversations(prev => ({
              ...prev,
              [otherId]: [...(prev[otherId] || []), msg]
            }));

            // If I received a message (and didn't send it), open the window if not open
            if (msg.senderId !== myId) {
              setActiveWindows(prev => {
                if (!prev.includes(otherId)) {
                  return [...prev, otherId];
                }
                return prev;
              });
              
              // Play sound?
              if (document.hidden && Notification.permission === 'granted') {
                 new Notification(`New message from ${users.find(u => u.id === otherId)?.username || 'Someone'}`, {
                    body: msg.text,
                    icon: '/vite.svg'
                 });
              }
            }
            break;
          }

          case 'NUDGE': {
            const { senderId } = data.payload;
            const myId = currentUserRef.current?.id;
            if (!myId) return;

            // Nudge is basically a message but with special type
            const nudgeMsg: Message = {
              id: crypto.randomUUID(),
              senderId,
              targetId: myId,
              text: "You received a nudge!",
              timestamp: Date.now(),
              type: 'nudge'
            };

            setConversations(prev => ({
              ...prev,
              [senderId]: [...(prev[senderId] || []), nudgeMsg]
            }));

            setActiveWindows(prev => {
              if (!prev.includes(senderId)) {
                return [...prev, senderId];
              }
              return prev;
            });
            
            // Shake effect is handled in ChatWindow
            break;
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };
  }, [users]); // Re-bind when users change to get latest user list for notifications? Actually users list might be stale in notification but that's minor.

  const handleLogin = (username: string, status: UserStatus, avatar: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOGIN',
        payload: { username, status, avatar }
      }));
    }
  };

  const handleLogout = () => {
    // Refresh page to logout for now
    window.location.reload();
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'PRIVATE_MESSAGE',
        payload: { targetId, text, type: 'text' }
      }));
    }
  };

  const handleSendNudge = (targetId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'NUDGE',
        payload: { targetId }
      }));
      
      // Add local nudge message for feedback
      if (currentUser) {
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
      }
    }
  };

  const handleStatusChange = (status: UserStatus) => {
    if (wsRef.current && currentUser) {
      setCurrentUser({ ...currentUser, status });
      wsRef.current.send(JSON.stringify({
        type: 'STATUS_CHANGE',
        payload: { status }
      }));
    }
  };

  const handlePersonalMessageChange = (msg: string) => {
    if (wsRef.current && currentUser) {
      setCurrentUser({ ...currentUser, personalMessage: msg });
      wsRef.current.send(JSON.stringify({
        type: 'STATUS_CHANGE',
        payload: { personalMessage: msg }
      }));
    }
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