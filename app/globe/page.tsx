"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe3D } from "@/components/globe-3d";
import { useUserStore } from "@/lib/store";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, Globe as GlobeIcon } from "lucide-react";
import { generateAvatarUrl } from "@/lib/utils";
import { MOODS, INTERESTS } from "@/lib/constants";
import Image from "next/image";

export default function GlobePage() {
  const router = useRouter();
  const { currentUser, onlineUsers, chatRequests, setCurrentUser, clearSession } = useUserStore();
  const [isClient, setIsClient] = useState(false);

  const { sendChatRequest, respondToChatRequest, disconnect } = useWebSocket(currentUser, {
    onChatAccepted: (peerId) => {
      // Navigate to chat page when chat is accepted
      router.push(`/chat?peer=${peerId}`);
    },
  });

  useEffect(() => {
    setIsClient(true);

    // Restore user from session storage
    const storedUser = sessionStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      // Redirect to home if no user found
      router.push("/");
    }
  }, [setCurrentUser, router]);

  const handleLogout = () => {
    disconnect();
    sessionStorage.removeItem("currentUser");
    clearSession();
    router.push("/");
  };

  const handlePokeUser = (userId: string) => {
    if (userId === currentUser?.id) {
      return; // Can't poke yourself
    }
    sendChatRequest(userId);
  };

  const handleChatResponse = (requestId: string, accepted: boolean) => {
    respondToChatRequest(requestId, accepted);
  };

  if (!isClient || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentMood = MOODS.find((m) => m.value === currentUser.mood);
  const avatarUrl = generateAvatarUrl(currentUser.avatar.style, currentUser.avatar.seed);

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col relative z-10">
        {/* User Profile */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
              <Image src={avatarUrl} alt={currentUser.username} width={48} height={48} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{currentUser.username}</h3>
              <p className="text-sm text-gray-400">
                {currentMood?.emoji} {currentMood?.label}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentUser.interests.map((interest) => {
              const interestData = INTERESTS.find((i) => i.value === interest);
              return (
                <Badge key={interest} variant="secondary" className="text-xs">
                  {interestData?.emoji} {interestData?.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Online Users Count */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {onlineUsers.length} {onlineUsers.length === 1 ? "person" : "people"} online
            </span>
          </div>
        </div>

        {/* Chat Requests */}
        {chatRequests.length > 0 && (
          <div className="p-4 border-b border-gray-800">
            <h4 className="text-sm font-semibold text-white mb-3">Chat Requests</h4>
            <div className="space-y-2">
              {chatRequests.map((request) => {
                const fromUser = onlineUsers.find((u) => u.id === request.fromUserId);
                if (!fromUser) return null;

                const fromAvatarUrl = generateAvatarUrl(
                  fromUser.avatar.style,
                  fromUser.avatar.seed
                );

                return (
                  <Card key={request.id} className="bg-gray-800 border-gray-700 relative z-20">
                    <CardHeader className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={fromAvatarUrl}
                            alt={fromUser.username}
                            width={32}
                            height={32}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-white">
                            {fromUser.username}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            wants to chat
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 cursor-pointer relative z-30"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Accept clicked for request:", request.id);
                            handleChatResponse(request.id, true);
                          }}
                          type="button"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 cursor-pointer relative z-30"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Decline clicked for request:", request.id);
                            handleChatResponse(request.id, false);
                          }}
                          type="button"
                        >
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 flex-1 overflow-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <GlobeIcon className="h-4 w-4" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ul className="text-xs text-gray-400 space-y-2">
                <li>• Click on any user marker on the globe to send a chat request</li>
                <li>• Wait for them to accept your request</li>
                <li>• Start chatting peer-to-peer</li>
                <li>• All conversations are ephemeral and private</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Globe View */}
      <div className="flex-1 relative z-0">
        <Globe3D users={onlineUsers} onPokeUser={handlePokeUser} />
      </div>
    </div>
  );
}
