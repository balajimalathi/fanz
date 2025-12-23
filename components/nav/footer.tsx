import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FloatingNav } from "@/components/nav/floating-nav";
import { Button } from "@/components/ui/button";

import { mainMenu, contentMenu } from "@/menu.config";
import Logo from "@/public/logo.svg";
import Image from "next/image";
import Link from "next/link";
import { Section, Container } from "@/components/craft";
import { siteConfig } from "@/site.config";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <Section>
        <Container className="grid md:grid-cols-[1.5fr_0.5fr_0.5fr_0.5fr] gap-12">
          <div className="flex flex-col gap-6 not-prose">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={Logo}
                alt="Chat2Base"
                className="dark:invert"
                width={32}
                height={20}
              />
              <span className="font-semibold">{siteConfig.site_name}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Extract structured data from AI Assistant and push to your favorite databases in one click.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-base mb-2">Product</h3>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="#features">
              Features
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="#use-cases">
              Use Cases
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="#pricing">
              Pricing
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="#faq">
              FAQ
            </Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-base mb-2">Resources</h3>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/posts">
              Blog
            </Link>
            {Object.entries(contentMenu).map(([key, href]) => (
              <Link
                className="text-muted-foreground hover:text-foreground transition-colors"
                key={href}
                href={href}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-base mb-2">Legal</h3>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/about">
              About Us
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/terms">
              Terms of Service
            </Link>
          </div>
        </Container>
        <Container className="border-t not-prose flex flex-col md:flex-row md:gap-2 gap-6 justify-between md:items-center pt-8">
          <p className="text-sm text-muted-foreground">
            © 2025 Chat2Base. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/aidataextractor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://discord.gg/aidataextractor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Discord
            </a>
          </div>
        </Container>
      </Section>
    </footer>
  );
};

export default Footer;