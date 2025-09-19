"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, Send } from "lucide-react";

const CommunityChatPage = ({ community }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Sample preloaded messages
  const sampleMessages = [
    { id: 1, user: "Alice", text: "Hi everyone! 👋", time: "10:00 AM" },
    { id: 2, user: "Bob", text: "Hello! How's the legal advice going?", time: "10:05 AM" },
    { id: 3, user: "Charlie", text: "Check out this new document template.", time: "10:10 AM" },
  ];

  useEffect(() => {
    if (isJoined) setMessages(sampleMessages);
  }, [isJoined]);

  // Scroll to bottom when new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleJoin = () => {
    setIsJoined(true);
  };

  const handleSend = async () => {
  if (!input.trim()) return;

    try {
        const res = await fetch("/api/community/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id, userId: 123, text: input }),
        });
        const data = await res.json();
        if (data.success) {
        setMessages([...messages, data.message]); // server se actual message
        setInput("");
        }
    } catch (err) {
        console.error("Failed to send message", err);
    }
};

    useEffect(() => {
    if (isJoined) {
        fetchMessages();
    }
    }, [isJoined]);

    const fetchMessages = async () => {
    const res = await fetch(`/api/community/messages?communityId=${community.id}`);
    const data = await res.json();
    setMessages(data.messages);
    };


  if (!community) return <p>Community not found!</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={community.avatar} alt={community.name} className="w-12 h-12 rounded-full" />
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">{community.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{community.members.toLocaleString()} members</p>
          </div>
        </div>
        {!isJoined && (
          <button
            onClick={handleJoin}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Join Community
          </button>
        )}
      </div>

      {/* Chat Area */}
      {isJoined ? (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.user === "You" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-2 rounded-lg max-w-xs ${
                    msg.user === "You"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                  }`}
                >
                  <p className="text-sm font-medium">{msg.user}</p>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
          </div>

          {/* Input Area */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Join the community to start chatting!</p>
        </div>
      )}
    </div>
  );
};

// Example usage
const sampleCommunity = {
  id: 1,
  name: "Legal Advice India",
  avatar: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=LA",
  members: 15420,
};

export default function Page() {
  return <CommunityChatPage community={sampleCommunity} />;
}
