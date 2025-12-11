"use client";

import Link from "next/link";
import { FaDiscord, FaGithub, FaTwitter } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { usePlatformConfig } from "@/hooks/use-platform-config";

export function Footer() {
  const { config, loading } = usePlatformConfig();
  const isInitialized = !loading && config !== null;

  return (
    <footer className="relative bg-theme-background">
      {/* Footer Content */}
      <div className="bg-theme-card-bg px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 border-t border-theme-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* About */}
            <div className="text-center md:text-left">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xl font-outfit font-bold text-theme-primary hover:text-theme-primary/80 mb-3"
              >
                <Logo width={20} height={20} />
                <span>Sahara</span>
              </Link>
              <p className="text-xs text-theme-text leading-relaxed max-w-xs mx-auto md:mx-0">
                Leveraging Solana to provide direct, transparent, and instant
                aid to disaster victims.
              </p>
            </div>

            {/* Platform Links */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-3 text-sm">
                Platform
              </h4>
              <ul className="space-y-1.5">
                <li>
                  <Link
                    href="/about"
                    className="text-xs text-theme-text hover:text-theme-primary transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-xs text-theme-text hover:text-theme-primary transition-colors"
                  >
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-xs text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                {!loading && !isInitialized && (
                  <li>
                    <Link
                      href="/admin/initialize"
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                    >
                      Initialize Platform
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Resources */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-3 text-sm">
                Resources
              </h4>
              <ul className="space-y-1.5">
                <li>
                  <Link
                    href="/brand"
                    className="text-xs text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Brand Assets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-xs text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-3 text-sm">
                Stay Connected
              </h4>
              <p className="text-xs text-theme-text mb-3">
                Get the latest updates and platform news.
              </p>
              <form className="flex flex-col gap-1.5">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="bg-theme-background border-theme-border text-theme-text-highlight placeholder:text-theme-text/50 text-xs py-1.5 px-2 h-8"
                />
                <Button
                  size="sm"
                  className="bg-theme-primary text-theme-background hover:bg-theme-secondary text-xs py-1.5 h-8"
                >
                  Subscribe
                </Button>
              </form>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 border-t border-theme-border">
            <p className="text-xs text-theme-text">
              © {new Date().getFullYear()} Sahara. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaTwitter className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaGithub className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaDiscord className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
