import { DocsConfig } from "types";

export const docsConfig: DocsConfig = {
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Docs",
      href: "/docs",
    },
    {
      title: "Releases",
      href: "/releases"
    },
    {
      title: "Blog",
      href: "/blog",
    },
    {
      title: "Pricing",
      href: "/pricing",
    },
    {
      title: "About Us",
      href: "/about"
    },
    {
      title: "Contact",
      href: "/contact-us"
    },
  ],
  sidebarNav: [
    {
      title: "Getting Started",
      items: [
        {
          title: "Introduction",
          href: "/docs",
        },
        {
          title: "Sandbox",
          href: "/docs/sandbox",
        },
        {
          title: "Setup",
          href: "/docs/setup",
        },
      ],
    },
    {
      title: "Integrations",
      items: [
        {
          title: "Twitter",
          href: "/docs/integration/twitter",
        },
        // {
        //   title: "Authentification",
        //   href: "/docs/configuration/authentification",
        // },
        // {
        //   title: "Blog",
        //   href: "/docs/configuration/blog",
        // },
        // {
        //   title: "Components",
        //   href: "/docs/configuration/components",
        // },
        // {
        //   title: "Config files",
        //   href: "/docs/configuration/config-files",
        // },
        // {
        //   title: "Database",
        //   href: "/docs/configuration/database",
        // },
        // {
        //   title: "Email",
        //   href: "/docs/configuration/email",
        // },
        // {
        //   title: "Layouts",
        //   href: "/docs/configuration/layouts",
        // },
        // {
        //   title: "Markdown files",
        //   href: "/docs/configuration/markdown-files",
        // },
        // {
        //   title: "Subscriptions",
        //   href: "/docs/configuration/subscriptions",
        // },
      ],
    },
    {
      title: "Troubleshooting",
      items: [
        {
          title: "Github",
          href: "/docs/troubleshooting/github",
        },
        {
          title: "Repo",
          href: "/docs/troubleshooting/repo",
        },
        {
          title: "Slack",
          href: "/docs/troubleshooting/slack",
        },
      ],
    },
  ],
};
