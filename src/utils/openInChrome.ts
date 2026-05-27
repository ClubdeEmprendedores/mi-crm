function isGoogleChrome(): boolean {
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
}

/**
 * Abre la URL en Google Chrome.
 * - Si el CRM ya corre en Chrome → nueva pestaña en Chrome.
 * - Si no → intenta el protocolo `googlechrome://` del sistema.
 */
export function openInChrome(url: string): void {
  if (isGoogleChrome()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const path = url.replace(/^https?:\/\//, "");
  const chromeUrl = `googlechrome://${path}`;

  const link = document.createElement("a");
  link.href = chromeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
