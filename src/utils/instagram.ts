const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

/** Solo el usuario, sin @ ni URL. */
export function sanitizeInstagramUsername(input: string): string {
  let s = input.trim().replace(/^@+/, "");
  const fromUrl = s.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (fromUrl) s = fromUrl[1];
  s = s.split(/[/?#]/)[0];
  return USERNAME_RE.test(s) ? s : "";
}

export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export function isValidInstagramUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}
