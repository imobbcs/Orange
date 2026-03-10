import { GetServerSideProps } from 'next';
import fs from 'fs';
import path from 'path';

export default function Home({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const filePath = path.join(process.cwd(), 'public', 'app.html');
  const html = fs.readFileSync(filePath, 'utf8');
  // Extract body content only
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  return { props: { html: body } };
};
