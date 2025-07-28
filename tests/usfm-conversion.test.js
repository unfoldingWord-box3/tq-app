const fs = require('fs');
const path = require('path');
const usfm = require('usfm-js');

describe('USFM to JSON Conversion Tests', () => {
  let usfmContent;
  let jsonResult;

  beforeAll(() => {
    // Read the USFM file
    const usfmPath = path.join(__dirname, 'fixtures', 'JON.usfm');
    usfmContent = fs.readFileSync(usfmPath, 'utf8');
  });

  test('should successfully convert USFM to JSON', () => {
    // Convert USFM to JSON
    jsonResult = usfm.toJSON(usfmContent);
    
    // Verify conversion was successful
    expect(jsonResult).toBeDefined();
    expect(typeof jsonResult).toBe('object');
    
    console.log('JSON structure keys:', Object.keys(jsonResult));
  });

  test('should contain expected book structure', () => {
    if (!jsonResult) {
      jsonResult = usfm.toJSON(usfmContent);
    }

    // Check if we have chapters
    const chapters = Object.keys(jsonResult);
    expect(chapters.length).toBeGreaterThan(0);
    
    console.log('Available chapters:', chapters);
    
    // Check first chapter
    if (chapters.includes('1')) {
      const chapter1 = jsonResult['1'];
      expect(chapter1).toBeDefined();
      expect(typeof chapter1).toBe('object');
      
      console.log('Chapter 1 verses:', Object.keys(chapter1));
    }
  });

  test('should extract verse text for rendering', () => {
    if (!jsonResult) {
      jsonResult = usfm.toJSON(usfmContent);
    }

    // Helper function to extract clean text from verses
    const extractVerseText = (chapterData) => {
      const verses = {};
      for (const [verseNum, verseData] of Object.entries(chapterData)) {
        if (typeof verseData === 'string') {
          // Clean up the text by removing USFM markers that might remain
          verses[verseNum] = verseData
            .replace(/\\[a-z-]+\*/g, '') // Remove closing markers like \zaln-e\*
            .replace(/\\[a-z-]+/g, '') // Remove opening markers
            .replace(/\|[^\\]*\\/g, '') // Remove alignment data
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        }
      }
      return verses;
    };

    // Extract verses from chapter 1
    if (jsonResult['1']) {
      const chapter1Verses = extractVerseText(jsonResult['1']);
      
      console.log('\n=== Chapter 1 Verses for Rendering ===');
      Object.entries(chapter1Verses).forEach(([verseNum, text]) => {
        if (text && text.length > 0) {
          console.log(`Verse ${verseNum}: ${text}`);
        }
      });

      // Verify we have some readable text
      const verseTexts = Object.values(chapter1Verses).filter(text => text.length > 0);
      expect(verseTexts.length).toBeGreaterThan(0);
    }
  });

  test('should demonstrate conversion back to USFM', () => {
    if (!jsonResult) {
      jsonResult = usfm.toJSON(usfmContent);
    }

    // Convert back to USFM to verify round-trip capability
    const backToUsfm = usfm.toUSFM(jsonResult, { forcedNewLines: true });
    
    expect(backToUsfm).toBeDefined();
    expect(typeof backToUsfm).toBe('string');
    expect(backToUsfm.length).toBeGreaterThan(0);
    
    console.log('\n=== First 500 characters of converted USFM ===');
    console.log(backToUsfm.substring(0, 500));
  });

  test('should provide data structure for React component', () => {
    if (!jsonResult) {
      jsonResult = usfm.toJSON(usfmContent);
    }

    // Create a structure suitable for React rendering
    const prepareForReact = (jsonData) => {
      const chapters = [];
      
      for (const [chapterNum, chapterData] of Object.entries(jsonData)) {
        const verses = [];
        
        for (const [verseNum, verseText] of Object.entries(chapterData)) {
          if (typeof verseText === 'string' && verseText.trim()) {
            // Clean text for display
            const cleanText = verseText
              .replace(/\\[a-z-]+\*?/g, '')
              .replace(/\|[^\\]*\\/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanText) {
              verses.push({
                number: parseInt(verseNum),
                text: cleanText,
                id: `${chapterNum}:${verseNum}`
              });
            }
          }
        }
        
        if (verses.length > 0) {
          chapters.push({
            number: parseInt(chapterNum),
            verses: verses.sort((a, b) => a.number - b.number)
          });
        }
      }
      
      return {
        book: 'Jonah',
        chapters: chapters.sort((a, b) => a.number - b.number)
      };
    };

    const reactData = prepareForReact(jsonResult);
    
    console.log('\n=== React Component Data Structure ===');
    console.log('Book:', reactData.book);
    console.log('Number of chapters:', reactData.chapters.length);
    
    if (reactData.chapters.length > 0) {
      const firstChapter = reactData.chapters[0];
      console.log(`Chapter ${firstChapter.number} has ${firstChapter.verses.length} verses`);
      
      // Show first few verses
      console.log('\nFirst 3 verses:');
      firstChapter.verses.slice(0, 3).forEach(verse => {
        console.log(`${verse.id}: ${verse.text}`);
      });
    }

    // Verify the structure is suitable for React
    expect(reactData.book).toBe('Jonah');
    expect(reactData.chapters).toBeInstanceOf(Array);
    expect(reactData.chapters.length).toBeGreaterThan(0);
    
    if (reactData.chapters.length > 0) {
      const firstChapter = reactData.chapters[0];
      expect(firstChapter.number).toBe(1);
      expect(firstChapter.verses).toBeInstanceOf(Array);
      expect(firstChapter.verses.length).toBeGreaterThan(0);
    }
  });
}); 