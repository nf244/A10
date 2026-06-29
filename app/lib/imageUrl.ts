export function resolveImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return url;

  // drive.google.com/file/d/{id}/view  or  /file/d/{id}/
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;

  // drive.google.com/open?id={id}
  const openMatch = url.match(/drive\.google\.com\/open\?(?:.*&)?id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;

  // drive.google.com/uc?id={id}  (already a direct link, just normalise)
  const ucMatch = url.match(/drive\.google\.com\/uc\?(?:.*&)?id=([^&]+)/);
  if (ucMatch) return `https://drive.google.com/uc?export=view&id=${ucMatch[1]}`;

  // drive.google.com/thumbnail?id={id}
  const thumbMatch = url.match(/drive\.google\.com\/thumbnail\?(?:.*&)?id=([^&]+)/);
  if (thumbMatch) return `https://drive.google.com/uc?export=view&id=${thumbMatch[1]}`;

  return url;
}

export function isGooglePhotosUrl(url: string): boolean {
  return /photos\.google\.com|photos\.app\.goo\.gl/.test(url);
}
