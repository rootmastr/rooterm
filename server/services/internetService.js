import axios from 'axios';
import * as cheerio from 'cheerio';
import cacheService from './cacheService.js';

class InternetService {
  constructor() {
    this.timeout = 10000; // 10s timeout for requests
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36';
  }

  /**
   * Detect intent of the query
   */
  detectIntent(query) {
    const q = query.toLowerCase();
    if (q.includes('install') || q.includes('pasang') || q.includes('setup')) return 'INSTALLATION';
    if (q.includes('error') || q.includes('fail') || q.includes('fix') || q.includes('perbaiki')) return 'TROUBLESHOOTING';
    return 'INFO_QUERY';
  }

  /**
   * Main entry point for fetching internet data
   */
  async fetchData(query) {
    const q = query.toLowerCase();
    // Only search for substantial queries
    const needsSearch = q.length > 5 && !['hai', 'halo', 'hello', 'thanks', 'terima'].some(k => q.includes(k));
    if (!needsSearch) return '';

    const cached = cacheService.get(query);
    if (cached) return cached;

    // Strict 4s timeout for internet fetching to keep AI responsive
    try {
      const data = await Promise.race([
        this._executeFetch(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Internet fetch timeout')), 4000))
      ]);
      cacheService.set(query, data);
      return data;
    } catch (e) {
      console.warn(`[Internet] Skipping internet data for "${query}": ${e.message}`);
      return 'Internet data unavailable or timed out.';
    }
  }

  async _executeFetch(query) {
    const intent = this.detectIntent(query);
    console.log(`[Internet] Gathering ${intent} data for: ${query}`);

    let data = '';
    if (this.isCryptoQuery(query)) {
      data = await this.getCryptoData(query);
    } else {
      data = await this.searchAndScrape(query);
    }
    return data;
  }

  isCryptoQuery(query) {
    return /(btc|eth|sol|doge|bitcoin|ethereum|price|harga)/i.test(query);
  }

  async getCryptoData(query) {
    try {
      const symbol = query.match(/(btc|eth|sol|doge|bitcoin|ethereum)/i)?.[0] || 'btc';
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`, { timeout: 5000 });
      return JSON.stringify(res.data);
    } catch (e) {
      return '';
    }
  }

  async searchAndScrape(query) {
    try {
      // 1. Search via DuckDuckGo HTML (Scrape-friendly)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const links = [];
      
      $('.result__a').slice(0, 3).each((i, el) => {
        links.push($(el).attr('href'));
      });

      if (links.length === 0) {
        // Fallback: Use the snippets from search page itself
        return this.extractSnippets($);
      }

      // 2. Scrape the first two links in parallel
      const scrapeResults = await Promise.allSettled(
        links.slice(0, 2).map(link => this.scrapeUrl(link))
      );

      return scrapeResults
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
        .join('\n---\n');

    } catch (error) {
      console.error('[Internet] Search/Scrape failed:', error.message);
      return '';
    }
  }

  extractSnippets($) {
    let snippets = [];
    $('.result__snippet').each((i, el) => {
      snippets.push($(el).text().trim());
    });
    return snippets.join('\n');
  }

  async scrapeUrl(url) {
    try {
      console.log(`[Internet] Scraping: ${url}`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 7000
      });

      const $ = cheerio.load(response.data);
      
      // Feature 2: Data Cleaning
      // Remove noise
      $('script, style, nav, footer, header, ads, .ads, .sidebar').remove();

      // Extract only relevant content (paragraphs, code blocks)
      let text = '';
      $('p, code, pre').each((i, el) => {
        const content = $(el).text().trim();
        if (content.length > 20) {
          text += content + '\n';
        }
      });

      return text.slice(0, 3000); // Limit to 3000 chars for context
    } catch (e) {
      return null;
    }
  }
}

export default new InternetService();
