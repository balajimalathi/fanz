import { DocsConfig } from "types";

export const docsConfig: DocsConfig = {
  mainNav: [
  ],
  sidebarNav: [
    {
      title: "Getting Started",
      items: [
        {
          title: "Introduction",
          href: "/docs",
        },
      ],
    },
    {
      title: "Integrations",
      items: [
        {
          title: "Airtable",
          href: "/docs/integration/airtable",
        },
        {
          title: "Google Sheets",
          href: "/docs/integration/google-sheets",
        },
      ],
    }
  ],
};
