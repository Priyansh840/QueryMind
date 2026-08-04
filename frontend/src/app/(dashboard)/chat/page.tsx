"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Send, Sparkles, Plus, MessageSquare, Bot, User } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // TODO: Connect to backend RAG endpoint
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm QueryMind AI! Once the backend is connected, I'll answer your questions using your uploaded documents with citations. 🧠",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      <Navbar title="AI Chat" subtitle="Ask questions about your knowledge" />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversation sidebar */}
        <div className="w-64 border-r border-slate-800/50 glass p-3 space-y-2 hidden lg:block">
          <button className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="mt-4">
            <p className="text-xs text-slate-500 px-3 mb-2 uppercase tracking-wider">
              Recent
            </p>
            <div className="space-y-1">
              <div className="sidebar-item active">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm truncate">Welcome Chat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center mb-6 glow-md">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Chat with your Knowledge
                </h2>
                <p className="text-slate-400 max-w-md">
                  Ask questions about your uploaded documents. QueryMind will
                  search through your knowledge base and provide answers with
                  citations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg">
                  {[
                    "Summarize my latest document",
                    "What are the key takeaways?",
                    "Explain the main concepts",
                    "Find related information",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 hover:border-indigo-500/30 hover:text-white transition-all text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                      msg.role === "user"
                        ? "bg-indigo-500/20 border border-indigo-500/30 text-white"
                        : "glass-card text-slate-200"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="glass-card px-5 py-4">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input bar */}
          <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <div className="flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your documents..."
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
