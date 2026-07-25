/**
 * Content-Disposition must be ASCII ByteString-safe.
 * Use a slug filename + RFC 5987 filename* for the display name.
 */
export function attachmentDisposition(filenameBase: string, ext: string): string {
  const safeExt = ext.replace(/^\./, "");
  const ascii =
    filenameBase
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "export";
  const utf8Name = `${filenameBase}.${safeExt}`;
  const encoded = encodeURIComponent(utf8Name)
    .replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}.${safeExt}"; filename*=UTF-8''${encoded}`;
}
