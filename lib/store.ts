import { create } from "zustand";
import { User, OnlineUser, ChatRequest } from "./types";

interface UserState {
  currentUser: User | null;
  onlineUsers: OnlineUser[];
  chatRequests: ChatRequest[];
  activeChatUserId: string | null;
  pendingOutgoingRequests: Set<string>; // Track user IDs we've sent requests to

  setCurrentUser: (user: User | null) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  updateOnlineUser: (userId: string, updates: Partial<OnlineUser>) => void;
  addChatRequest: (request: ChatRequest) => void;
  updateChatRequest: (requestId: string, updates: Partial<ChatRequest>) => void;
  removeChatRequest: (requestId: string) => void;
  addPendingOutgoingRequest: (userId: string) => void;
  removePendingOutgoingRequest: (userId: string) => void;
  hasPendingOutgoingRequest: (userId: string) => boolean;
  setActiveChatUserId: (userId: string | null) => void;
  clearSession: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  onlineUsers: [],
  chatRequests: [],
  activeChatUserId: null,
  pendingOutgoingRequests: new Set<string>(),

  setCurrentUser: (user) => set({ currentUser: user }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: [...state.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    })),

  updateOnlineUser: (userId, updates) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      ),
    })),

  addChatRequest: (request) =>
    set((state) => ({
      chatRequests: [...state.chatRequests, request],
    })),

  updateChatRequest: (requestId, updates) =>
    set((state) => ({
      chatRequests: state.chatRequests.map((r) =>
        r.id === requestId ? { ...r, ...updates } : r
      ),
    })),

  removeChatRequest: (requestId) =>
    set((state) => ({
      chatRequests: state.chatRequests.filter((r) => r.id !== requestId),
    })),

  addPendingOutgoingRequest: (userId) =>
    set((state) => {
      const newSet = new Set(state.pendingOutgoingRequests);
      newSet.add(userId);
      return { pendingOutgoingRequests: newSet };
    }),

  removePendingOutgoingRequest: (userId) =>
    set((state) => {
      const newSet = new Set(state.pendingOutgoingRequests);
      newSet.delete(userId);
      return { pendingOutgoingRequests: newSet };
    }),

  hasPendingOutgoingRequest: (userId) => {
    return get().pendingOutgoingRequests.has(userId);
  },

  setActiveChatUserId: (userId) => set({ activeChatUserId: userId }),

  clearSession: () =>
    set({
      currentUser: null,
      onlineUsers: [],
      chatRequests: [],
      activeChatUserId: null,
      pendingOutgoingRequests: new Set<string>(),
    }),
}));
