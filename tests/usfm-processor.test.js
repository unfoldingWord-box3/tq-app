const fs = require('fs');
const path = require('path');
const USFMProcessor = require('../components/USFMProcessor');

describe('USFMProcessor Utility Tests', () => {
  let usfmContent;
  let processedData;

  beforeAll(() => {
    // Read the USFM file
    const usfmPath = path.join(__dirname, 'fixtures', 'JON.usfm');
    usfmContent = fs.readFileSync(usfmPath, 'utf8');
    
    // Process the USFM content
    processedData = USFMProcessor.processUSFM(usfmContent, 'Jonah');
  });

  test('should process USFM content successfully', () => {
    expect(processedData).toBeDefined();
    expect(processedData.book).toBe('Jonah');
    expect(processedData.chapters).toBeInstanceOf(Array);
    expect(processedData.chapters.length).toBeGreaterThan(0);
    expect(processedData.chapterCount).toBeGreaterThan(0);
    expect(processedData.totalVerses).toBeGreaterThan(0);
    
    console.log(`Processed book: ${processedData.book}`);
    console.log(`Chapters: ${processedData.chapterCount}`);
    console.log(`Total verses: ${processedData.totalVerses}`);
  });

  test('should clean verse text properly', () => {
    const rawText = '\\zaln-s |x-strong="H3068" x-lemma="יְהֹוָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="יְהוָ֔ה"\\*\\w Yahweh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*';
    const cleanText = USFMProcessor.cleanVerseText(rawText);
    
    expect(cleanText).toBe('Yahweh');
    console.log('Raw text:', rawText);
    console.log('Clean text:', cleanText);
  });

  test('should get specific verses correctly', () => {
    // Get verse 1 from chapter 1
    const verse1 = USFMProcessor.getVerse(processedData, 1, 1);
    
    expect(verse1).toBeDefined();
    expect(verse1.number).toBe(1);
    expect(verse1.text).toBeDefined();
    expect(verse1.text.length).toBeGreaterThan(0);
    
    console.log('Jonah 1:1 -', verse1.text);
  });

  test('should get verse ranges correctly', () => {
    // Get verses 1-3 from chapter 1
    const verses1to3 = USFMProcessor.getVerseRange(processedData, 1, '1-3');
    
    expect(verses1to3).toBeInstanceOf(Array);
    expect(verses1to3.length).toBe(3);
    expect(verses1to3[0].number).toBe(1);
    expect(verses1to3[2].number).toBe(3);
    
    console.log('\n=== Jonah 1:1-3 ===');
    verses1to3.forEach(verse => {
      console.log(`${verse.number}: ${verse.text}`);
    });
  });

  test('should format verses for display', () => {
    const verses = USFMProcessor.getVerseRange(processedData, 1, '1-2');
    
    // With verse numbers
    const withNumbers = USFMProcessor.formatVerses(verses, true);
    expect(withNumbers).toContain('1 ');
    expect(withNumbers).toContain('2 ');
    
    // Without verse numbers
    const withoutNumbers = USFMProcessor.formatVerses(verses, false);
    expect(withoutNumbers).not.toMatch(/^\d+\s/);
    
    console.log('\nWith numbers:', withNumbers.substring(0, 100) + '...');
    console.log('Without numbers:', withoutNumbers.substring(0, 100) + '...');
  });

  test('should handle verse ranges that match community screen usage', () => {
    // Test the ranges used in the community screen: '1-2', '3', '5-7', '8'
    const ranges = ['1-2', '3', '5-7', '8'];
    
    ranges.forEach(range => {
      const verses = USFMProcessor.getVerseRange(processedData, 1, range);
      expect(verses.length).toBeGreaterThan(0);
      
      console.log(`\n=== Jonah 1:${range} ===`);
      const formatted = USFMProcessor.formatVerses(verses, true);
      console.log(formatted);
    });
  });

  test('should provide data structure compatible with ScriptureRenderer', () => {
    // Create a function that mimics how the ScriptureRenderer might use the data
    const createScriptureData = (chapterNum, verseRange) => {
      const verses = USFMProcessor.getVerseRange(processedData, chapterNum, verseRange);
      
      return {
        chapter: chapterNum,
        verses: verses.map(verse => ({
          number: verse.number,
          text: verse.text,
          id: `${chapterNum}:${verse.number}`
        }))
      };
    };

    // Test with range "3" (similar to what's used in community.tsx)
    const scriptureData = createScriptureData(1, '3');
    
    expect(scriptureData.chapter).toBe(1);
    expect(scriptureData.verses).toBeInstanceOf(Array);
    expect(scriptureData.verses.length).toBe(1);
    expect(scriptureData.verses[0].number).toBe(3);
    expect(scriptureData.verses[0].id).toBe('1:3');
    
    console.log('\n=== Scripture Data for Renderer ===');
    console.log('Chapter:', scriptureData.chapter);
    console.log('Verses:', scriptureData.verses);
  });

  test('should handle all chapters in Jonah', () => {
    // Jonah should have 4 chapters
    const allChapters = processedData.chapters;
    
    console.log('\n=== All Chapters in Jonah ===');
    allChapters.forEach(chapter => {
      console.log(`Chapter ${chapter.number}: ${chapter.verseCount} verses`);
      
      // Show first verse of each chapter
      if (chapter.verses.length > 0) {
        const firstVerse = chapter.verses[0];
        console.log(`  ${firstVerse.number}: ${firstVerse.text.substring(0, 50)}...`);
      }
    });
    
    expect(allChapters.length).toBe(4); // Jonah has 4 chapters
  });

  test('should demonstrate integration with React component state', () => {
    // Simulate how this might be used in a React component
    const simulateReactState = {
      book: processedData.book,
      selectedChapter: 1,
      selectedVerseRange: '3',
      chapters: processedData.chapters
    };

    // Function to get current verses (as might be used in a React component)
    const getCurrentVerses = (state) => {
      return USFMProcessor.getVerseRange(
        { chapters: state.chapters }, 
        state.selectedChapter, 
        state.selectedVerseRange
      );
    };

    const currentVerses = getCurrentVerses(simulateReactState);
    
    expect(currentVerses.length).toBeGreaterThan(0);
    expect(currentVerses[0].number).toBe(3);
    
    console.log('\n=== React State Simulation ===');
    console.log('Selected:', `${simulateReactState.book} ${simulateReactState.selectedChapter}:${simulateReactState.selectedVerseRange}`);
    console.log('Text:', USFMProcessor.formatVerses(currentVerses, false));
  });
}); 