"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCw,
  Copy,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

const suggestedQueries = [
  "Summarize my recent uploads",
  "What do I know about machine learning?",
  "Compare my notes on transformers vs RNNs",
  "List my top skills and interests",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      content:
        "Hello! I'm your QueryMind AI assistant. I have access to your knowledge vault, memories, and preferences. What would you like to explore?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        content: `Based on your knowledge vault, here's what I found regarding "${userMsg.content}":\n\nThis is a placeholder response. Once the backend RAG pipeline is connected, I'll search through your documents, extract relevant passages, and synthesize an answer with citations.`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <>
      <Navbar title="AI Chat" />
      <div className="flex flex-col h-[calc(100vh-56px)] bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-gray-700" />
                </div>
              )}
              <div
                className={`max-w-[75%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-gray-900 text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center gap-2 mt-3 pt-2 border-t ${msg.role === "user" ? "border-gray-700" : "border-gray-100"}`}>
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${msg.role === "user" ? "text-gray-400" : "text-gray-400"}`}>
                    <Clock className="w-3 h-3" />
                    {msg.timestamp}
                  </span>
                  {msg.role === "ai" && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <RotateCw className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-gray-700" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-700 animate-pulse" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white border border-gray-200 shadow-sm rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm flex items-center"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 pt-2 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask QueryMind anything..."
              className="flex-1 bg-transparent px-3 outline-none text-[15px] text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3 font-medium">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </>
  );
}
