import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
import { avataaars } from "@dicebear/collection";
import { bottts } from "@dicebear/collection";
import { funEmoji } from "@dicebear/collection";
import { lorelei } from "@dicebear/collection";
import { micah } from "@dicebear/collection";
import { miniavs } from "@dicebear/collection";
import { pixelArt } from "@dicebear/collection";
import { AvatarStyle } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateAvatarUrl(style: AvatarStyle, seed: string): string {
  let collection: any;

  switch (style) {
    case "adventurer":
      collection = adventurer;
      break;
    case "avataaars":
      collection = avataaars;
      break;
    case "bottts":
      collection = bottts;
      break;
    case "fun-emoji":
      collection = funEmoji;
      break;
    case "lorelei":
      collection = lorelei;
      break;
    case "micah":
      collection = micah;
      break;
    case "miniavs":
      collection = miniavs;
      break;
    case "pixel-art":
      collection = pixelArt;
      break;
    default:
      collection = adventurer;
  }

  const avatar = createAvatar(collection, {
    seed,
    size: 128,
  });
  return avatar.toDataUri();
}

export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
