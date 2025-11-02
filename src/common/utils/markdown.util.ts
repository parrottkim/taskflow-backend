export function extractImages(content: string): string[] {
  const regex = /!\[.*?\]\((.*?)\)/g;
  const urls: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}
