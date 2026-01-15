import { bundleMDX } from "mdx-bundler";
import matter from "gray-matter";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { visit } from "unist-util-visit";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Page, Doc, Release } from "./mdx-types";

const contentDir = join(process.cwd(), "content");

// Extract images from MDX content (matching Contentlayer's computed field)
function extractImages(content: string): string[] {
  const matches = content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g);
  return matches || [];
}

// Generate slug from file path (matching Contentlayer's logic)
function generateSlug(filePath: string, contentDir: string): {
  slug: string;
  slugAsParams: string;
} {
  // Remove contentDir prefix and .mdx extension
  const relativePath = filePath
    .replace(contentDir, "")
    .replace(/\\/g, "/") // Normalize Windows paths
    .replace(/^\//, "") // Remove leading slash
    .replace(/\.mdx$/, "");

  const slug = `/${relativePath}`;
  const slugAsParams = relativePath.split("/").slice(1).join("/");

  return { slug, slugAsParams };
}

// Compile MDX with the same plugins as Contentlayer
async function compileMDX(source: string): Promise<string> {
  const { code } = await bundleMDX({
    source,
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm];
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
        () => (tree: any) => {
          visit(tree, (node) => {
            if (node?.type === "element" && node?.tagName === "pre") {
              const [codeEl] = node.children;

              if (codeEl.tagName !== "code") return;

              node.__rawString__ = codeEl.children?.[0].value;
            }
          });
        },
        [
          rehypePrettyCode,
          {
            theme: "github-dark",
            keepBackground: false,
            onVisitLine(node: any) {
              // Prevent lines from collapsing in `display: grid` mode, and allow empty lines to be copy/pasted
              if (node.children.length === 0) {
                node.children = [{ type: "text", value: " " }];
              }
            },
          },
        ],
        () => (tree: any) => {
          visit(tree, (node) => {
            if (node?.type === "element" && node?.tagName === "figure") {
              if (!("data-rehype-pretty-code-figure" in node.properties)) {
                return;
              }

              const preElement = node.children.at(-1);
              if (preElement.tagName !== "pre") {
                return;
              }

              preElement.properties["__rawString__"] = node.__rawString__;
            }
          });
        },
        [
          rehypeAutolinkHeadings,
          {
            properties: {
              className: ["subheading-anchor"],
              ariaLabel: "Link to section",
            },
          },
        ],
      ];
      return options;
    },
  });

  return code;
}

// Read and process a single MDX file
async function readMdxFile<T extends Page | Doc | Release>(
  filePath: string,
  type: "Page" | "Doc" | "Release"
): Promise<T> {
  const fileContent = readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  const { slug, slugAsParams } = generateSlug(filePath, contentDir);
  const images = extractImages(content);
  const compiledCode = await compileMDX(content);

  const baseData = {
    _id: filePath,
    _raw: {
      sourceFilePath: filePath,
      sourceFileName: filePath.split(/[/\\]/).pop() || "",
      sourceFileDir: dirname(filePath),
      contentType: "mdx" as const,
      flattenedPath: slug.replace(/^\//, ""),
    },
    type,
    body: {
      code: compiledCode,
      raw: content,
    },
    slug,
    slugAsParams,
    images,
  };

  if (type === "Page") {
    return {
      ...baseData,
      title: data.title,
      description: data.description,
    } as T;
  } else if (type === "Doc") {
    return {
      ...baseData,
      title: data.title,
      description: data.description,
      published: data.published ?? true,
    } as T;
  } else {
    return {
      ...baseData,
      title: data.title,
      description: data.description,
      published: data.published ?? true,
      date: data.date,
      versionNumber: data.versionNumber,
      image: data.image,
    } as T;
  }
}

// Recursively get all MDX files in a directory
function getAllMdxFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getAllMdxFiles(filePath, fileList);
    } else if (file.endsWith(".mdx")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Get all pages
export async function getAllPages(): Promise<Page[]> {
  const pagesDir = join(contentDir, "pages");
  const files = getAllMdxFiles(pagesDir);
  const pages = await Promise.all(
    files.map((file) => readMdxFile<Page>(file, "Page"))
  );
  return pages;
}

// Get all docs
export async function getAllDocs(): Promise<Doc[]> {
  const docsDir = join(contentDir, "docs");
  const files = getAllMdxFiles(docsDir);
  const docs = await Promise.all(
    files.map((file) => readMdxFile<Doc>(file, "Doc"))
  );
  return docs.filter((doc) => doc.published);
}

// Get all releases
export async function getAllReleases(): Promise<Release[]> {
  const releasesDir = join(contentDir, "releases");
  const files = getAllMdxFiles(releasesDir);
  const releases = await Promise.all(
    files.map((file) => readMdxFile<Release>(file, "Release"))
  );
  return releases.filter((release) => release.published);
}

// Get a page by slug
export async function getPageBySlug(slug: string): Promise<Page | null> {
  const pages = await getAllPages();
  return pages.find((page) => page.slugAsParams === slug) || null;
}

// Get a doc by slug
export async function getDocBySlug(slug: string): Promise<Doc | null> {
  const docs = await getAllDocs();
  return docs.find((doc) => doc.slugAsParams === slug) || null;
}

// Get a release by slug
export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const releases = await getAllReleases();
  return releases.find((release) => release.slugAsParams === slug) || null;
}
