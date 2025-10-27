"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Badge } from "./ui/badge";
import { MOODS, INTERESTS, AVATAR_STYLES } from "@/lib/constants";
import { Mood, Interest, AvatarStyle } from "@/lib/types";
import { generateAvatarUrl, generateRandomSeed } from "@/lib/utils";
import { useUserStore } from "@/lib/store";
import Image from "next/image";

export function RegistrationForm() {
  const router = useRouter();
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);

  const [username, setUsername] = useState("");
  const [selectedMood, setSelectedMood] = useState<Mood>("friend-chat");
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("adventurer");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Generate avatar seed only on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    setAvatarSeed(generateRandomSeed());
  }, []);

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const regenerateAvatar = () => {
    setAvatarSeed(generateRandomSeed());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    if (selectedInterests.length === 0) {
      alert("Please select at least one interest");
      return;
    }

    if (!avatarSeed) {
      alert("Avatar is still loading, please wait a moment");
      return;
    }

    // Request location permission
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const user = {
          id: crypto.randomUUID(),
          username: username.trim(),
          mood: selectedMood,
          interests: selectedInterests,
          avatar: {
            style: avatarStyle,
            seed: avatarSeed,
          },
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          connectedAt: Date.now(),
        };

        // Store user in session storage and state
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        setCurrentUser(user);

        // Navigate to globe
        router.push("/globe");
      },
      (error) => {
        alert(
          "Location access is required to use this app. Please enable location services and try again."
        );
        console.error("Geolocation error:", error);
      }
    );
  };

  const avatarUrl = isClient && avatarSeed ? generateAvatarUrl(avatarStyle, avatarSeed) : "";

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Join the Globe</CardTitle>
        <CardDescription>
          Connect with people around the world in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-4">
            <Label>Choose Your Avatar</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-gray-100 dark:bg-gray-800">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_STYLES.map((style) => (
                    <Button
                      key={style.value}
                      type="button"
                      variant={avatarStyle === style.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAvatarStyle(style.value)}
                      className="text-xs"
                    >
                      {style.label}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={regenerateAvatar}
                  className="w-full"
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-3">
            <Label>What&apos;s your mood?</Label>
            <RadioGroup value={selectedMood} onValueChange={(value) => setSelectedMood(value as Mood)}>
              <div className="grid grid-cols-2 gap-3">
                {MOODS.map((mood) => (
                  <div
                    key={mood.value}
                    className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={mood.value} id={mood.value} />
                    <Label
                      htmlFor={mood.value}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{mood.emoji}</span>
                        <span className="font-medium">{mood.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mood.description}
                      </p>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Interest Selection */}
          <div className="space-y-3">
            <Label>Your Interests (select multiple)</Label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <Badge
                  key={interest.value}
                  variant={
                    selectedInterests.includes(interest.value)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer text-sm py-2 px-3"
                  onClick={() => toggleInterest(interest.value)}
                >
                  <span className="mr-1">{interest.emoji}</span>
                  {interest.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            Enter the Globe
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you&apos;ll be asked to share your location. No personal data
            is stored on our servers. Your session is temporary and will be cleared
            when you leave.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
