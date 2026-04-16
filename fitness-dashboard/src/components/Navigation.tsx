"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Dumbbell, Apple, Droplet, UtensilsCrossed, Users2, Activity, UserRound, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  color: string;
  external?: boolean;
}

interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

interface NavigationProps {
  user?: AuthUser | null;
}

  export function Navigation({ user }: NavigationProps) {
    const [urls, setUrls] = useState<{
      base: string;
      nutrition: string;
      yelp: string;
      skin: string;
      community: string;
    }>({
      base: "http://localhost:3000",
      nutrition: "http://localhost:3003",
      yelp: "http://localhost:3004",
      skin: "http://localhost:3002",
      community: "http://localhost:3006"
    });
  
    useEffect(() => {
      fetch('/api/config', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => setUrls(prev => ({...prev, ...data})))
        .catch(console.error);
    }, []);
  
    const menuItems: MenuItem[] = [
      { name: "Physical Fitness", href: `${urls.base}/fitness`, icon: Dumbbell, color: "text-doom-primary", external: true },
      { name: "Nutrition", href: urls.nutrition, icon: Apple, color: "text-green-400", external: true },
      { name: "Find Restaurants", href: urls.yelp, icon: UtensilsCrossed, color: "text-yellow-400", external: true },
      { name: "Skin & Hair Analysis", href: urls.skin, icon: Droplet, color: "text-blue-400", external: true },
      { name: "Community", href: urls.community, icon: Users2, color: "text-pink-400", external: true },
    ];

  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const getHref = (item: MenuItem) => {
    if (item.external) {
      return `/api/sso?target=${encodeURIComponent(item.href)}`;
    }
    return item.href;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${urls.base}/api/auth/logout`, { 
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("wb_agent_profile_"))
        .forEach((k) => localStorage.removeItem(k));
      window.location.href = urls.base;
    }
  };

  return (
    <>
      {/* Top Navigation Bar - Mobile Responsive */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-doom-surface/95 backdrop-blur-sm border-b border-doom-primary/20">
        <div className="px-2">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href={`/api/sso?target=${encodeURIComponent(urls.base)}`} className="flex items-center space-x-2">
              <img src="/assets/logo.jpg" alt="What Now?" className="h-9 w-auto mix-blend-screen" />
              <span className="text-xl font-bold text-doom-text hidden sm:block">What Now?</span>
            </a>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                if (item.external) {
                  return (
                    <a
                      key={item.name}
                      href={getHref(item)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-doom-bg/50 transition-colors ${item.color}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium text-doom-text">{item.name}</span>
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    href={getHref(item)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-doom-bg/50 transition-colors ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium text-doom-text">{item.name}</span>
                  </Link>
                );
              })}

              {/* Profile and Logout Section - Desktop Only */}
              {user && (
                <>
                  {/* Divider */}
                  <div className="h-8 w-px bg-doom-primary/30" />

                  {/* Profile Section */}
                  <a href={`/api/sso?target=${encodeURIComponent(`${urls.base}/profile`)}`} className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-doom-bg/30 hover:bg-doom-bg/50 transition-colors">
                    <UserRound className="w-5 h-5 text-doom-primary" />
                    <span className="text-sm font-medium text-doom-text">{user.name}</span>
                  </a>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors group"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
                    <span className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                      Logout
                    </span>
                  </button>
                </>
              )}
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
                      {item.external ? (
                        <a
                          href={getHref(item)}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-doom-bg/50 transition-colors group ${item.color}`}
                        >
                          <div className="p-2 rounded-lg bg-doom-bg/50 group-hover:scale-110 transition-transform">
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-base font-medium text-doom-text">
                            {item.name}
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={getHref(item)}
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
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Menu Footer - Profile & Logout for Mobile */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-doom-primary/20">
                {user ? (
                  <div className="space-y-3">
                    {/* Profile Info */}
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-doom-bg/30">
                      <UserRound className="w-5 h-5 text-doom-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-doom-text">{user.name}</p>
                        <p className="text-xs text-doom-muted">{user.email}</p>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <LogOut className="w-5 h-5 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-sm text-doom-muted">
                    <p>Your Complete Health</p>
                    <p className="text-doom-primary">Companion</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
