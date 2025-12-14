"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../../firebase-config";
import Navbar from "../../../components/navbar";
import { 
  Send, 
  Users, 
  ArrowLeft, 
  Loader2,
  AlertCircle 
} from "lucide-react";

const BACKEND_WS = "ws://localhost:8000";
const BACKEND_HTTP = "http://localhost:8000";

const CommunityChat = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.id;

  // Get community info from URL params (passed by communities page)
  const communityName = searchParams.get("name") || "Community";
  const communityAvatar = searchParams.get("avatar") || "/icons/default-community.png";
  const communityCategory = searchParams.get("category") || "";
  const communityDescription = searchParams.get("description") || "";
  const communityMembers = searchParams.get("members") || "0";

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load message history
  const loadMessageHistory = async (before = null) => {
    try {
      const url = new URL(`${BACKEND_HTTP}/api/communities/${communityId}/messages`);
      if (before) {
        url.searchParams.set("before", before);
      }
      url.searchParams.set("limit", "50");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to load message history");
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError("Failed to load message history");
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    if (!user) return;

    try {
      const ws = new WebSocket(`${BACKEND_WS}/ws/communities/${communityId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send hello message
        ws.send(
          JSON.stringify({
            type: "hello",
            userId: user.uid,
            userName: user.displayName || user.email || "Anonymous",
            communityName: communityName,
            communityImage: communityAvatar,
            communityDescription: communityDescription,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "ready") {
            console.log("WebSocket ready");
            setLoading(false);
          } else if (data.type === "message") {
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "typing") {
            if (data.userId !== user.uid) {
              setTypingUsers((prev) => {
                const next = new Set(prev);
                if (data.isTyping) {
                  next.add(data.userId);
                } else {
                  next.delete(data.userId);
                }
                return next;
              });
            }
          } else if (data.type === "error") {
            console.error("WebSocket error:", data.error);
            setError(data.error);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Connection error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setConnecting(true);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket();
          }, delay);
        } else {
          setError("Unable to connect. Please refresh the page.");
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to connect");
      setConnecting(false);
    }
  };

  // Initialize chat
  useEffect(() => {
    if (user && communityId) {
      loadMessageHistory();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, communityId]);

  // Send message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: "message",
        content: newMessage.trim(),
      })
    );

    setNewMessage("");
    
    // Stop typing indicator
    wsRef.current.send(
      JSON.stringify({
        type: "typing",
        isTyping: false,
      })
    );
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send typing indicator
    wsRef.current.send(
      JSON.stringify({
        type: "typing",
        isTyping: true,
      })
    );

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "typing",
            isTyping: false,
          })
        );
      }
    }, 2000);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E8DD0]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto pt-20 px-4 pb-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/communities")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <img
                src={communityAvatar}
                alt={communityName}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  e.target.src = "/icons/default-community.png";
                }}
              />
              
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {communityName}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  {communityCategory && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                      {communityCategory}
                    </span>
                  )}
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {communityMembers} members
                  </span>
                </div>
              </div>
            </div>

            {connecting && (
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Connecting...</span>
              </div>
            )}
          </div>

          {communityDescription && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {communityDescription}
            </p>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col" style={{ height: "calc(100vh - 300px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E8DD0]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.userId === user?.uid;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-[#1E8DD0] text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="text-xs font-semibold mb-1 opacity-75">
                          {msg.userName || "Anonymous"}
                        </div>
                      )}
                      <div className="break-words">{msg.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {typingUsers.size > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                Someone is typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                disabled={connecting || !wsRef.current}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E8DD0] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || connecting || !wsRef.current}
                className="px-6 py-2 bg-[#1E8DD0] hover:bg-[#145c86] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;
