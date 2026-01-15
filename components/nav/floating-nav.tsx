"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mainMenu } from "@/menu.config";
import { cn } from "@/lib/utils";

import Logo from "@/public/logo.svg";

export function FloatingNav() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      setIsOpen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl",
          "rounded-2xl border px-4 py-3",
          "transition-all duration-300 ease-out",
          isScrolled
            ? "bg-background/80 backdrop-blur-xl shadow-lg border-border/50"
            : "bg-background/60 backdrop-blur-md border-transparent"
        )}
      >
        <div className="flex items-center justify-between">
          {/* Logo - Left */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity" 
          >
            <Image
              src={Logo}
              alt="Exclusivz"
              width={32}
              height={20}
              className="dark:invert"
            />
          </Link>

          {/* Menu - Center (Desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {Object.entries(mainMenu).map(([key, href]) => (
              <Link
                key={href}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-accent transition-all duration-200"
                )}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Link>
            ))}
          </div>

          {/* Right side - Login + Theme + Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-lg"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            {/* Login Button (Desktop) */}
            <Button asChild className="hidden sm:flex rounded-lg">
              <Link href="/login">Login</Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-lg"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-out",
            isOpen ? "max-h-80 mt-4 pt-4 border-t" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-2">
            {Object.entries(mainMenu).map(([key, href]) => (
              <Link
                key={href}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded-lg",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-accent transition-all duration-200"
                )}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Link>
            ))}
            <Button asChild className="mt-2 rounded-lg">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
