export type Mood =
  | "coffee"
  | "friend-chat"
  | "movie-night"
  | "gaming"
  | "study-buddy"
  | "just-talking";

export type Interest =
  | "music"
  | "sports"
  | "tech"
  | "movies"
  | "books"
  | "gaming"
  | "art"
  | "travel"
  | "food"
  | "fitness";

export type AvatarStyle =
  | "adventurer"
  | "avataaars"
  | "bottts"
  | "fun-emoji"
  | "lorelei"
  | "micah"
  | "miniavs"
  | "pixel-art";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  username: string;
  mood: Mood;
  interests: Interest[];
  avatar: {
    style: AvatarStyle;
    seed: string;
  };
  location: Location;
  connectedAt: number;
}

export interface OnlineUser extends User {
  lastSeen: number;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

export interface WebSocketMessage {
  type: "user-joined" | "user-left" | "user-updated" | "chat-request" | "chat-accepted" | "chat-rejected" | "offer" | "answer" | "ice-candidate";
  payload: any;
}
