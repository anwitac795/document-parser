"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

export default function CommunityChatPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();

  // --- Hooks always at top ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // --- Community info ---
  const name = searchParams.get("name");
  const avatar = searchParams.get("avatar");
  const members = searchParams.get("members");

  const community = name ? { id, name, avatar, members } : null;

  // --- Preloaded dummy messages, only once ---
  useEffect(() => {
    if (mounted && community && messages.length === 0) {
      const sampleMessages = [
        { id: 1, user: "Aarav", text: "Hi everyone! 👋", time: "10:00 AM", color: "bg-red-300 border-red-500" },
        { id: 2, user: "Diya", text: "Hello! Has anyone reviewed the new rental agreement template?", time: "10:02 AM", color: "bg-green-300 border-green-500" },
        { id: 3, user: "Rohan", text: "Yes, I checked it yesterday. Some clauses seem unfair for tenants.", time: "10:05 AM", color: "bg-yellow-300 border-yellow-500" },
        { id: 4, user: "Priya", text: "We wanted to remind you that the payment due under invoice number(s) has not been received yet, and we kindly request you to clear the outstanding amount as soon as possible to avoid any inconvenience.", time: "10:08 AM", color: "bg-purple-300 border-purple-500" },
        { id: 5, user: "Siddharth", text: "Make sure you include a clause about the interest rate on late payments.", time: "10:12 AM", color: "bg-pink-300 border-pink-500" },
        ];
        setMessages(sampleMessages);

    }
  }, [mounted, community, messages.length]);

  // --- Scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        user: "You",
        text: input,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };


// Colors for members (except "You")
const memberColors = [
  { bg: "bg-[#DDAE9E]/10 dark:bg-red-700", border: "border-[#CE9381] dark:border-red-400" },
  { bg: "bg-[#BAA7C7]/10 dark:bg-green-700", border: "border-[#9F86AE] dark:border-green-400" },
  { bg: "bg-[#ACBECC]/10 dark:bg-yellow-700", border: "border-[#8095AA] dark:border-yellow-400" },
  { bg: "bg-[#E9D5A0]/10 dark:bg-purple-700", border: "border-[#E0C785] dark:border-purple-400" },
  { bg: "bg-[#EEB9C1]/10 dark:bg-pink-700", border: "border-[#E595A2] dark:border-pink-400" },
  { bg: "bg-[#B8C8AD]/10 dark:bg-indigo-700", border: "border-[#94AA86] dark:border-indigo-400" },
];

// Helper to pick color based on member name
const getMemberStyle = (user) => {
  if (user === "You") return { bg: "bg-blue-500 text-white", border: "border-blue-600" };
  const index = user.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % memberColors.length;
  return memberColors[index];
};



  // --- Render ---
  if (!mounted) return null;
  if (!community) return <p className="p-4">Community not found!</p>;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  {/* Header */}
  <div className="flex items-center p-4 bg-white dark:bg-gray-800 shadow-md z-10">
    <img src={avatar} alt={name} className="w-20 h-20 rounded-full" />
    <div className="ml-4">
      <h2 className="text-2xl font-extrabold text-[#155d84] dark:text-white">{name}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{members} members</p>
    </div>
  </div>

  {/* Messages - Scrollable */}
  <div className="flex-1 overflow-y-auto p-4 space-y-3 gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    {messages.map((msg) => {
      const style = getMemberStyle(msg.user);
      return (
        <div
          key={msg.id}
          className={`flex ${msg.user === "You" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`p-3 rounded-lg max-w-xl border ${style.bg} ${style.border} text-gray-900 dark:text-white`}
          >
            <p className="text-m font-bold">{msg.user}</p>
            <p className="text-sm">{msg.text}</p>
            <p className="text-xs text-gray-500 mt-1 flex justify-end">{msg.time}</p>
          </div>
        </div>
      );
    })}
    <div ref={messagesEndRef}></div>
  </div>

  {/* Input - Fixed bottom */}
  <div className="flex items-center p-5 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
    <input
      type="text"
      placeholder="Type a message..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1EA7FF]"
      onKeyDown={(e) => e.key === "Enter" && handleSend()}
    />
    <button onClick={handleSend} className="ml-2 bg-[#1EA7FF] text-white px-4 py-2 rounded-lg">
      <Send className="w-5 h-5" />
    </button>
  </div>
</div>

  );
}
