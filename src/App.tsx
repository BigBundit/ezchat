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
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // API Base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'https://ezchat-jdm6.onrender.com';

  // API Functions
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${endpoint}`;
    console.log('API Request:', url); // Debug log
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return response.json();
  };

  // Polling functions
  const pollUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await apiRequest('/api/users');
      if (result.success) {
        setUsers(result.users.filter((u: User) => u.id !== currentUser.id));
      }
    } catch (error) {
      console.error('Failed to poll users:', error);
    }
  }, [currentUser, API_BASE]);

  const pollMessages = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await apiRequest(`/api/messages?userId=${currentUser.id}&since=${lastMessageTimestamp}`);
      if (result.success && result.messages.length > 0) {
        // Update conversations
        const newConversations = { ...conversations };
        let maxTimestamp = lastMessageTimestamp;

        result.messages.forEach((msg: Message) => {
          const otherId = msg.senderId === currentUser.id ? msg.targetId : msg.senderId;
          if (!newConversations[otherId]) {
            newConversations[otherId] = [];
          }
          newConversations[otherId].push(msg);
          maxTimestamp = Math.max(maxTimestamp, msg.timestamp);
        });

        setConversations(newConversations);
        setLastMessageTimestamp(maxTimestamp);

        // Open windows for new messages
        result.messages.forEach((msg: Message) => {
          if (msg.senderId !== currentUser.id) {
            const otherId = msg.senderId;
            setActiveWindows(prev => {
              if (!prev.includes(otherId)) {
                return [...prev, otherId];
              }
              return prev;
            });

            // Notification
            if (document.hidden && Notification.permission === 'granted') {
              new Notification(`New message from ${users.find(u => u.id === otherId)?.username || 'Someone'}`, {
                body: msg.text,
                icon: '/vite.svg'
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  }, [currentUser, lastMessageTimestamp, conversations, users, API_BASE]);

  // Start polling when user logs in
  useEffect(() => {
    if (currentUser) {
      // Initial poll
      pollUsers();
      pollMessages();

      // Start polling every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollUsers();
        pollMessages();
      }, 2000);
    } else {
      // Stop polling when logged out
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentUser, pollUsers, pollMessages]);

  const handleLogin = async (username: string, status: UserStatus, avatar: string) => {
    try {
      const result = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, status, avatar })
      });

      if (result.success) {
        setCurrentUser(result.user);
        setLastMessageTimestamp(Date.now()); // Reset message polling timestamp
      } else {
        console.error('Login failed:', result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await apiRequest('/api/logout', {
          method: 'POST',
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear local state
    setCurrentUser(null);
    setUsers([]);
    setConversations({});
    setActiveWindows([]);
    setLastMessageTimestamp(0);
  };

  const handleOpenChat = (userId: string) => {
    if (!activeWindows.includes(userId)) {
      setActiveWindows(prev => [...prev, userId]);
    }
  };

  const handleCloseChat = (userId: string) => {
    setActiveWindows(prev => prev.filter(id => id !== userId));
  };

  const handleSendMessage = async (targetId: string, text: string) => {
    if (!currentUser) return;

    try {
      const result = await apiRequest('/api/message', {
        method: 'POST',
        body: JSON.stringify({
          senderId: currentUser.id,
          targetId,
          text,
          type: 'text'
        })
      });

      if (result.success) {
        // Add message to local conversation
        const message = result.message;
        setConversations(prev => ({
          ...prev,
          [targetId]: [...(prev[targetId] || []), message]
        }));
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleSendNudge = async (targetId: string) => {
    if (!currentUser) return;

    try {
      // Send nudge as a special message
      const result = await apiRequest('/api/message', {
        method: 'POST',
        body: JSON.stringify({
          senderId: currentUser.id,
          targetId,
          text: "You received a nudge!",
          type: 'nudge'
        })
      });

      if (result.success) {
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
      }
    } catch (error) {
      console.error('Send nudge error:', error);
    }
  };

  const handleStatusChange = async (status: UserStatus) => {
    if (!currentUser) return;

    try {
      const result = await apiRequest('/api/status', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser.id,
          status
        })
      });

      if (result.success) {
        setCurrentUser({ ...currentUser, status });
      }
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handlePersonalMessageChange = async (msg: string) => {
    if (!currentUser) return;

    try {
      const result = await apiRequest('/api/status', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser.id,
          personalMessage: msg
        })
      });

      if (result.success) {
        setCurrentUser({ ...currentUser, personalMessage: msg });
      }
    } catch (error) {
      console.error('Personal message change error:', error);
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