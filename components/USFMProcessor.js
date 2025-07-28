const usfm = require('usfm-js');

/**
 * USFMProcessor - Utility class for converting USFM to React-friendly data structures
 */
class USFMProcessor {
  
  /**
   * Convert USFM text to JSON
   * @param {string} usfmText - Raw USFM content
   * @returns {Object} JSON representation of the USFM
   */
  static toJSON(usfmText) {
    try {
      return usfm.toJSON(usfmText);
    } catch (error) {
      console.error('Error converting USFM to JSON:', error);
      return null;
    }
  }

  /**
   * Clean verse text by removing USFM markers and alignment data
   * @param {string} text - Raw verse text with USFM markers
   * @returns {string} Clean, readable text
   */
  static cleanVerseText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remove USFM alignment markers and their content (handle escaped and unescaped)
      .replace(/\\zaln-[se]\s*\|[^\\]*\\?\*/g, '')
      .replace(/zaln-[se]\s*\|[^\\]*\\?\*/g, '')
      // Remove word markers (handle both escaped and unescaped)
      .replace(/\\w\s*([^\\|]*)\|[^\\]*\\w\*/g, '$1')
      .replace(/w\s*([^\\|]*)\|[^\\]*w\*/g, '$1')
      // Remove any remaining USFM markers (both with and without backslashes)
      .replace(/\\[a-z-]+\*?/g, '')
      .replace(/[a-z-]+\\\*/g, '')
      // Remove pipe-separated metadata
      .replace(/\|[^\\|]*\\?/g, '')
      // Remove any remaining backslash-asterisk combinations
      .replace(/\\\*/g, '')
      // Remove multiple spaces and normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract verses from a chapter with cleaned text
   * @param {Object} chapterData - Chapter data from USFM JSON
   * @returns {Array} Array of verse objects
   */
  static extractVerses(chapterData) {
    const verses = [];
    
    for (const [verseNum, verseText] of Object.entries(chapterData)) {
      if (typeof verseText === 'string' && verseText.trim()) {
        const cleanText = this.cleanVerseText(verseText);
        
        if (cleanText) {
          verses.push({
            number: parseInt(verseNum),
            text: cleanText,
            raw: verseText // Keep raw text for debugging
          });
        }
      }
    }
    
    return verses.sort((a, b) => a.number - b.number);
  }

  /**
   * Convert USFM JSON to a structure suitable for React components
   * @param {Object} usfmJson - JSON from usfm.toJSON()
   * @param {string} bookName - Name of the book (optional)
   * @returns {Object} React-friendly data structure
   */
  static prepareForReact(usfmJson, bookName = 'Unknown') {
    if (!usfmJson || typeof usfmJson !== 'object') {
      return {
        book: bookName,
        chapters: [],
        error: 'Invalid USFM JSON data'
      };
    }

    const chapters = [];
    
    // Handle the actual structure returned by usfm-js
    // It returns { headers: {...}, chapters: { "1": {...}, "2": {...} } }
    const chaptersData = usfmJson.chapters || usfmJson;
    
    for (const [chapterNum, chapterData] of Object.entries(chaptersData)) {
      // Skip non-numeric keys (like 'headers')
      if (isNaN(parseInt(chapterNum))) continue;
      
      const verses = this.extractVerses(chapterData);
      
      if (verses.length > 0) {
        chapters.push({
          number: parseInt(chapterNum),
          verses: verses,
          verseCount: verses.length
        });
      }
    }
    
    return {
      book: bookName,
      chapters: chapters.sort((a, b) => a.number - b.number),
      chapterCount: chapters.length,
      totalVerses: chapters.reduce((total, ch) => total + ch.verseCount, 0)
    };
  }

  /**
   * Get a specific verse by chapter and verse number
   * @param {Object} reactData - Data from prepareForReact()
   * @param {number} chapterNum - Chapter number
   * @param {number} verseNum - Verse number
   * @returns {Object|null} Verse object or null if not found
   */
  static getVerse(reactData, chapterNum, verseNum) {
    const chapter = reactData.chapters.find(ch => ch.number === chapterNum);
    if (!chapter) return null;
    
    return chapter.verses.find(v => v.number === verseNum) || null;
  }

  /**
   * Get verses within a range (e.g., "1-3" or "5-7")
   * @param {Object} reactData - Data from prepareForReact()
   * @param {number} chapterNum - Chapter number
   * @param {string} verseRange - Range like "1-3" or single verse "5"
   * @returns {Array} Array of verse objects
   */
  static getVerseRange(reactData, chapterNum, verseRange) {
    const chapter = reactData.chapters.find(ch => ch.number === chapterNum);
    if (!chapter) return [];
    
    if (verseRange.includes('-')) {
      const [start, end] = verseRange.split('-').map(n => parseInt(n.trim()));
      return chapter.verses.filter(v => v.number >= start && v.number <= end);
    } else {
      const verseNum = parseInt(verseRange.trim());
      const verse = chapter.verses.find(v => v.number === verseNum);
      return verse ? [verse] : [];
    }
  }

  /**
   * Format verses for display with verse numbers
   * @param {Array} verses - Array of verse objects
   * @param {boolean} showNumbers - Whether to show verse numbers
   * @returns {string} Formatted text
   */
  static formatVerses(verses, showNumbers = true) {
    if (!Array.isArray(verses)) return '';
    
    return verses.map(verse => {
      return showNumbers ? `${verse.number} ${verse.text}` : verse.text;
    }).join(' ');
  }

  /**
   * Process a complete USFM file for use in React
   * @param {string} usfmContent - Raw USFM file content
   * @param {string} bookName - Name of the book
   * @returns {Object} Complete processed data
   */
  static processUSFM(usfmContent, bookName = 'Unknown') {
    const jsonData = this.toJSON(usfmContent);
    if (!jsonData) {
      return {
        book: bookName,
        chapters: [],
        error: 'Failed to convert USFM to JSON'
      };
    }

    return this.prepareForReact(jsonData, bookName);
  }
}

module.exports = USFMProcessor; 