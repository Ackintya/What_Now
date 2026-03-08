"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Dumbbell, Apple, Droplet, Moon, Pill, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { name: "Physical Fitness", href: "/fitness", icon: Dumbbell, color: "text-doom-primary" },
  { name: "Nutrition", href: "/nutrition", icon: Apple, color: "text-green-400" },
  { name: "Skin Analysis", href: "/skin", icon: Droplet, color: "text-blue-400" },
  { name: "Hair Analysis", href: "/hair", icon: Activity, color: "text-purple-400" },
  { name: "Sleep Tracking", href: "/sleep", icon: Moon, color: "text-indigo-400" },
  { name: "Supplements", href: "/supplements", icon: Pill, color: "text-orange-400" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Top Navigation Bar - Mobile Responsive */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-doom-surface/95 backdrop-blur-sm border-b border-doom-primary/20">
        <div className="px-2">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-doom-primary to-doom-accent rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-doom-bg" />
              </div>
              <span className="text-xl font-bold text-doom-text hidden sm:block">
                WellBeing
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-doom-bg/50 transition-colors ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium text-doom-text">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Hamburger Button - Mobile Only */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-doom-bg/50 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-6 h-6 text-doom-primary" />
              ) : (
                <Menu className="w-6 h-6 text-doom-primary" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Slide-in Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-doom-surface border-l border-doom-primary/20 md:hidden overflow-y-auto"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-doom-primary/20">
                <h2 className="text-xl font-bold text-doom-text">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-doom-bg/50 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-doom-primary" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-doom-bg/50 transition-colors group ${item.color}`}
                      >
                        <div className="p-2 rounded-lg bg-doom-bg/50 group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-base font-medium text-doom-text">
                          {item.name}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-doom-primary/20">
                <div className="text-center text-sm text-doom-muted">
                  <p>Your Complete Health</p>
                  <p className="text-doom-primary">Companion</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
