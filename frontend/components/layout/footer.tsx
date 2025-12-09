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
      <div className="bg-theme-card-bg px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12 border-t border-theme-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* About */}
            <div className="text-center md:text-left">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-2xl font-outfit font-bold text-theme-primary hover:text-theme-primary/80 mb-4"
              >
                <Logo width={24} height={24} />
                <span>Sahara</span>
              </Link>
              <p className="text-sm text-theme-text leading-relaxed max-w-xs mx-auto md:mx-0">
                Leveraging Solana to provide direct, transparent, and instant
                aid to disaster victims.
              </p>
            </div>

            {/* Platform Links */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-4">
                Platform
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-theme-text hover:text-theme-primary transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-sm text-theme-text hover:text-theme-primary transition-colors"
                  >
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-sm text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                {!loading && !isInitialized && (
                  <li>
                    <Link
                      href="/admin/initialize"
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                    >
                      Initialize Platform
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Resources */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/brand"
                    className="text-sm text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Brand Assets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-sm text-theme-text hover:text-theme-primary transition-colors"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="text-center md:text-left">
              <h4 className="text-theme-text-highlight font-medium mb-4">
                Stay Connected
              </h4>
              <p className="text-sm text-theme-text mb-4">
                Get the latest updates and platform news.
              </p>
              <form className="flex flex-col gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="bg-theme-background border-theme-border text-theme-text-highlight placeholder:text-theme-text/50"
                />
                <Button className="bg-theme-primary text-theme-background hover:bg-theme-secondary">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-theme-border">
            <p className="text-sm text-theme-text">
              © {new Date().getFullYear()} Sahara. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaTwitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaGithub className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/exyreams/sahara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-text hover:text-theme-primary transition-all hover:scale-110"
              >
                <FaDiscord className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
