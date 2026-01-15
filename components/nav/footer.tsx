import { mainMenu } from "@/menu.config";
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
                alt="Exclusivz"
                className="dark:invert"
                width={32}
                height={20}
              />
              <span className="font-semibold">{siteConfig.site_name}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              A creator-first platform for creators and global audiences. Monetize your content with subscriptions, tips, and exclusive content sharing.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-base mb-2">Product</h3>
            {Object.entries(mainMenu).map(([key, href]) => (
              <Link
                key={href}
                className="text-muted-foreground hover:text-foreground transition-colors capitalize"
                href={href}
              >
                {key}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-base mb-2">Creators</h3>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/signup">
              Start Creating
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/login">
              Creator Login
            </Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/#how-it-works">
              How It Works
            </Link>
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
            © {new Date().getFullYear()} {siteConfig.site_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/exclusivz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://instagram.com/exclusivz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Instagram
            </a>
          </div>
        </Container>
      </Section>
    </footer>
  );
};

export default Footer;
