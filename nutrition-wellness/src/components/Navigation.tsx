import Link from "next/link";
import { Apple } from "lucide-react";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-doom-surface/95 backdrop-blur-sm border-b border-doom-primary/20">
      <div className="w-full px-1 sm:px-2 lg:px-3">
        <div className="flex items-center h-16">
          <Link href="#overview" className="flex items-center space-x-2 text-doom-text">
            <div className="w-8 h-8 bg-gradient-to-br from-doom-primary to-doom-accent rounded-lg flex items-center justify-center">
              <Apple className="w-5 h-5 text-doom-bg" />
            </div>
            <span className="text-xl font-bold">Nutrition Wellness</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
