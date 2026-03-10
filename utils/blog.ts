import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const contentDirectory = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
}

export function getAllPosts(locale: string = 'en'): BlogPost[] {
  const postsDirectory = locale === 'en' 
    ? contentDirectory 
    : path.join(contentDirectory, locale);
  
  // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);

      return {
        slug,
        title: matterResult.data.title,
        description: matterResult.data.description,
        date: matterResult.data.date,
        content: matterResult.content,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string, locale: string = 'en'): BlogPost | null {
  try {
    const postsDirectory = locale === 'en' 
      ? contentDirectory 
      : path.join(contentDirectory, locale);
    
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    return {
      slug,
      title: matterResult.data.title,
      description: matterResult.data.description,
      date: matterResult.data.date,
      content: matterResult.content,
    };
  } catch (error) {
    return null;
  }
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown);
  let htmlContent = result.toString();
  
  // Convert external links to open in new window, but keep Satoshi Assistant links in same window
  htmlContent = htmlContent.replace(
    /<a href="(https?:\/\/[^"]*)"([^>]*)>/g, 
    (match, url, attrs) => {
      // Keep Satoshi Assistant links in same window
      if (url.includes('whentobuybtc.xyz')) {
        return match;
      }
      // Add target="_blank" to external links if not already present
      if (!attrs.includes('target=')) {
        return `<a href="${url}"${attrs} target="_blank" rel="noopener noreferrer">`;
      }
      return match;
    }
  );
  
  return htmlContent;
}