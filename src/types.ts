export type UserStatus = 'online' | 'busy' | 'away' | 'offline';

export interface User {
  id: string;
  username: string;
  status: UserStatus;
  avatar?: string; // URL or base64 placeholder
  personalMessage?: string;
}

export interface Message {
  id: string;
  senderId: string;
  targetId: string; // 'global' or userId
  text: string;
  timestamp: number;
  type: 'text' | 'nudge' | 'image';
}

export interface LoginPayload {
  username: string;
  status: UserStatus;
}

export interface WSMessage {
  type: 'LOGIN' | 'LOGIN_SUCCESS' | 'USER_LIST' | 'PRIVATE_MESSAGE' | 'STATUS_CHANGE' | 'ERROR' | 'NUDGE';
  payload: any;
}

export interface ChatState {
  currentUser: User | null;
  users: User[];
  conversations: Record<string, Message[]>; // userId -> messages
  activeWindows: string[]; // List of userIds with open chat windows
}
