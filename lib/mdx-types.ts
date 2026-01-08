// Type definitions matching Contentlayer's structure

export type MDXBody = {
  code: string;
  raw: string;
};

export type Page = {
  _id: string;
  _raw: {
    sourceFilePath: string;
    sourceFileName: string;
    sourceFileDir: string;
    contentType: "mdx";
    flattenedPath: string;
  };
  type: "Page";
  title: string;
  description?: string;
  body: MDXBody;
  slug: string;
  slugAsParams: string;
  images: string[];
};

export type Doc = {
  _id: string;
  _raw: {
    sourceFilePath: string;
    sourceFileName: string;
    sourceFileDir: string;
    contentType: "mdx";
    flattenedPath: string;
  };
  type: "Doc";
  title: string;
  description?: string;
  published: boolean;
  body: MDXBody;
  slug: string;
  slugAsParams: string;
  images: string[];
};

export type Release = {
  _id: string;
  _raw: {
    sourceFilePath: string;
    sourceFileName: string;
    sourceFileDir: string;
    contentType: "mdx";
    flattenedPath: string;
  };
  type: "Release";
  title: string;
  description?: string;
  published: boolean;
  date: string;
  versionNumber?: string;
  image: string;
  body: MDXBody;
  slug: string;
  slugAsParams: string;
  images: string[];
};

export type DocumentTypes = Page | Doc | Release;
export type DocumentTypeNames = "Page" | "Doc" | "Release";
