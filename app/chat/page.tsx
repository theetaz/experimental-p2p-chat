"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/store";
import { useWebSocket } from "@/lib/websocket";
import { useWebRTC, WebRTCMessage } from "@/lib/webrtc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { generateAvatarUrl } from "@/lib/utils";
import Image from "next/image";
import { format } from "date-fns";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get("peer");

  const { currentUser, onlineUsers, setCurrentUser } = useUserStore();
  const [messages, setMessages] = useState<WebRTCMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handleOfferRef = useRef<any>(null);
  const handleAnswerRef = useRef<any>(null);
  const handleIceCandidateRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  const peerUser = onlineUsers.find((u) => u.id === peerId);

  const { sendMessage: sendWsMessage, endChat } = useWebSocket(currentUser, {
    onSignalingMessage: (message) => {
      // Handle WebRTC signaling messages
      if (message.type === "offer" && handleOfferRef.current) {
        handleOfferRef.current(message.payload.offer);
      } else if (message.type === "answer" && handleAnswerRef.current) {
        handleAnswerRef.current(message.payload.answer);
      } else if (message.type === "ice-candidate" && handleIceCandidateRef.current) {
        handleIceCandidateRef.current(message.payload.candidate);
      }
    },
    onChatEnded: (endedPeerId) => {
      console.log("🔚 Chat ended by peer:", endedPeerId);
      // Close the WebRTC connection
      closeConnection();
      // Redirect to globe page
      router.push("/globe");
    },
  });

  const {
    isConnected,
    isConnecting,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    sendMessage: sendRtcMessage,
    closeConnection,
  } = useWebRTC({
    localUserId: currentUser?.id || "",
    remoteUserId: peerId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    sendSignal: (signal) => {
      sendWsMessage(signal);
    },
  });

  // Assign refs for signaling handlers
  handleOfferRef.current = handleOffer;
  handleAnswerRef.current = handleAnswer;
  handleIceCandidateRef.current = handleIceCandidate;

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;

    setIsClient(true);

    // Restore user from session storage
    const storedUser = sessionStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      router.push("/");
      return;
    }

    if (!peerId) {
      router.push("/globe");
      return;
    }

    // Mark as initialized
    hasInitialized.current = true;

    // Start WebRTC connection
    setTimeout(() => {
      createOffer();
    }, 100);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !isConnected) return;

    const message = sendRtcMessage(inputText.trim());
    if (message) {
      setMessages((prev) => [...prev, message]);
      setInputText("");
    }
  };

  const handleBack = () => {
    console.log("🔙 User leaving chat");
    // Notify the peer that we're ending the chat
    if (peerId) {
      endChat(peerId);
    }
    // Close the WebRTC connection
    closeConnection();
    // Redirect to globe page
    router.push("/globe");
  };

  if (!isClient || !currentUser || !peerUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const peerAvatarUrl = generateAvatarUrl(peerUser.avatar.style, peerUser.avatar.seed);
  const currentUserAvatarUrl = generateAvatarUrl(
    currentUser.avatar.style,
    currentUser.avatar.seed
  );

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary">
            <Image src={peerAvatarUrl} alt={peerUser.username} width={40} height={40} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white">{peerUser.username}</h2>
            <p className="text-xs text-gray-400">
              {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isConnected && !isConnecting && (
          <div className="text-center text-gray-400 text-sm mt-8">
            Establishing secure peer-to-peer connection...
          </div>
        )}

        {messages.length === 0 && isConnected && (
          <div className="text-center text-gray-400 text-sm mt-8">
            Start your conversation! All messages are peer-to-peer and ephemeral.
          </div>
        )}

        {messages.map((message, index) => {
          const isOwnMessage = message.senderId === currentUser.id;
          const avatarUrl = isOwnMessage ? currentUserAvatarUrl : peerAvatarUrl;

          return (
            <div
              key={index}
              className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image src={avatarUrl} alt="Avatar" width={32} height={32} />
              </div>
              <div
                className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}
              >
                <Card
                  className={`p-3 ${
                    isOwnMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                </Card>
                <span className="text-xs text-gray-500 mt-1">
                  {format(new Date(message.timestamp), "HH:mm")}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        {isConnected ? (
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 border-gray-700 text-white"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm">
            Waiting for connection...
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
