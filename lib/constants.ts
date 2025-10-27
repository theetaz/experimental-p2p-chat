import { Mood, Interest, AvatarStyle } from "./types";

export const MOODS: { value: Mood; label: string; emoji: string; description: string }[] = [
  {
    value: "coffee",
    label: "Coffee Chat",
    emoji: "☕",
    description: "Casual conversation over virtual coffee",
  },
  {
    value: "friend-chat",
    label: "Friend Chat",
    emoji: "💬",
    description: "Looking for friendly conversations",
  },
  {
    value: "movie-night",
    label: "Movie Night",
    emoji: "🎬",
    description: "Want to talk about movies or watch together",
  },
  {
    value: "gaming",
    label: "Gaming",
    emoji: "🎮",
    description: "Looking for gaming buddies",
  },
  {
    value: "study-buddy",
    label: "Study Buddy",
    emoji: "📚",
    description: "Need someone to study with",
  },
  {
    value: "just-talking",
    label: "Just Talking",
    emoji: "🗣️",
    description: "Open to any conversation",
  },
];

export const INTERESTS: { value: Interest; label: string; emoji: string }[] = [
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "tech", label: "Technology", emoji: "💻" },
  { value: "movies", label: "Movies", emoji: "🎬" },
  { value: "books", label: "Books", emoji: "📚" },
  { value: "gaming", label: "Gaming", emoji: "🎮" },
  { value: "art", label: "Art", emoji: "🎨" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "fitness", label: "Fitness", emoji: "💪" },
];

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "adventurer", label: "Adventurer" },
  { value: "avataaars", label: "Avataaars" },
  { value: "bottts", label: "Robots" },
  { value: "fun-emoji", label: "Fun Emoji" },
  { value: "lorelei", label: "Lorelei" },
  { value: "micah", label: "Micah" },
  { value: "miniavs", label: "Miniavs" },
  { value: "pixel-art", label: "Pixel Art" },
];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8787";
