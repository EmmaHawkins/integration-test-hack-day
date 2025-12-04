import { SitemapUrl } from './types';

export class SitemapBuilder {
  /**
   * Generates a valid sitemap XML string from an array of URLs
   * Follows the sitemap.org protocol specification
   * 
   * @param urls - Array of URLs with metadata
   * @returns Valid sitemap.xml content as string
   */
  static buildSitemapXml(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => {
      let entry = `  <url>\n    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        entry += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        entry += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        entry += `    <priority>${url.priority}</priority>\n`;
      }
      
      entry += `  </url>`;
      return entry;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Escapes special XML characters to prevent injection attacks
   * Critical for security when URLs come from user input
   */
  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Validates that a URL is well-formed
   * Prevents invalid URLs from breaking the sitemap
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}