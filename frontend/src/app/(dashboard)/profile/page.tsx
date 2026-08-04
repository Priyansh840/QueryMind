"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { User, Mail, Briefcase, BookOpen, Target, Heart, Camera } from "lucide-react";

export default function ProfilePage() {
  return (
    <>
      <Navbar title="Profile" subtitle="Manage your account" />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Avatar section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 flex items-center gap-6"
        >
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold">
              P
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Priyansh</h2>
            <p className="text-sm text-slate-400">Student • Developer</p>
            <p className="text-xs text-slate-500 mt-1">
              Member since August 2026
            </p>
          </div>
        </motion.div>

        {/* Info fields */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Personal Information
          </h3>

          {[
            { label: "Full Name", value: "Priyansh", icon: User },
            { label: "Email", value: "priyansh@example.com", icon: Mail },
            { label: "Occupation", value: "Student", icon: Briefcase },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                {field.label}
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <field.icon className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  defaultValue={field.value}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Skills, Interests, Goals */}
        {[
          { title: "Skills", icon: BookOpen, items: ["Python", "JavaScript", "React", "FastAPI"], color: "indigo" },
          { title: "Interests", icon: Heart, items: ["AI/ML", "Web Development", "System Design"], color: "cyan" },
          { title: "Career Goals", icon: Target, items: ["Full Stack Developer", "AI Engineer"], color: "purple" },
        ].map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <section.icon className={`w-5 h-5 text-${section.color}-400`} />
              {section.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item) => (
                <span
                  key={item}
                  className={`px-3 py-1.5 rounded-full bg-${section.color}-500/10 border border-${section.color}-500/20 text-${section.color}-400 text-xs font-medium`}
                >
                  {item}
                </span>
              ))}
              <button className="px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-500 text-xs hover:text-white transition-all">
                + Add
              </button>
            </div>
          </motion.div>
        ))}

        {/* Save button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          Save Changes
        </motion.button>
      </div>
    </>
  );
}
