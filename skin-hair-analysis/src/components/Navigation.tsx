"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Droplet, Activity, Sparkles, HeartPulse, PackageSearch, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const menuItems = [
  { name: "Overview", href: "#overview", icon: Sparkles, color: "text-doom-primary" },
  { name: "Profile", href: "#profile", icon: UserRound, color: "text-doom-accent" },
  { name: "Analysis", href: "#analysis", icon: Droplet, color: "text-blue-400" },
  { name: "Products", href: "#products", icon: PackageSearch, color: "text-orange-400" },
  { name: "Insights", href: "#insights", icon: HeartPulse, color: "text-green-400" },
  { name: "Recommendations", href: "#recommendations", icon: Activity, color: "text-purple-400" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-doom-surface/95 backdrop-blur-sm border-b border-doom-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="#overview" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-doom-primary to-doom-accent rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5 text-doom-bg" />
              </div>
              <span className="text-xl font-bold text-doom-text hidden sm:block">Skin & Hair</span>
            </Link>

            <div className="hidden md:flex items-center space-x-5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-doom-bg/50 transition-colors ${item.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium text-doom-text">{item.name}</span>
                  </a>
                );
              })}
            </div>

            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg hover:bg-doom-bg/50 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6 text-doom-primary" /> : <Menu className="w-6 h-6 text-doom-primary" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-doom-surface border-l border-doom-primary/20 md:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-doom-primary/20">
                <h2 className="text-xl font-bold text-doom-text">Skin & Hair</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-doom-bg/50 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-doom-primary" />
                </button>
              </div>

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
                      <a
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-doom-bg/50 transition-colors group ${item.color}`}
                      >
                        <div className="p-2 rounded-lg bg-doom-bg/50 group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-base font-medium text-doom-text">{item.name}</span>
                      </a>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
