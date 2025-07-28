const fs = require('fs');
const path = require('path');
const usfm = require('usfm-js');

// Read the USFM file
const usfmPath = path.join(__dirname, 'tests', 'fixtures', 'JON.usfm');
const usfmContent = fs.readFileSync(usfmPath, 'utf8');

console.log('=== USFM Content Sample (first 300 chars) ===');
console.log(usfmContent.substring(0, 300));
console.log('...\n');

console.log('=== Converting USFM to JSON ===');
const jsonResult = usfm.toJSON(usfmContent);

// Save the full JSON output for inspection
const outputPath = path.join(__dirname, 'jonah-usfm-output.json');
fs.writeFileSync(outputPath, JSON.stringify(jsonResult, null, 2));
console.log(`✅ Full JSON saved to: ${outputPath}`);

console.log('\n=== JSON Structure Analysis ===');
console.log('Top-level keys:', Object.keys(jsonResult));

// Analyze the structure
if (jsonResult.headers) {
  console.log('\n📖 Headers:');
  console.log('Header keys:', Object.keys(jsonResult.headers));
  console.log('Sample headers:', JSON.stringify(jsonResult.headers, null, 2));
}

if (jsonResult.chapters) {
  console.log('\n📚 Chapters:');
  const chapterKeys = Object.keys(jsonResult.chapters);
  console.log('Chapter numbers:', chapterKeys);
  console.log('Total chapters:', chapterKeys.length);
  
  // Analyze first chapter structure
  const firstChapter = chapterKeys[0];
  if (firstChapter) {
    const chapterData = jsonResult.chapters[firstChapter];
    const verseKeys = Object.keys(chapterData);
    
    console.log(`\n📝 Chapter ${firstChapter} structure:`);
    console.log('Verse keys:', verseKeys);
    console.log('Total verses:', verseKeys.length);
    
    // Show first few verses
    console.log('\n📜 Sample verses:');
    verseKeys.slice(0, 3).forEach(verseKey => {
      const verseContent = chapterData[verseKey];
      console.log(`Verse ${verseKey}:`, typeof verseContent);
      console.log(`  Content (first 100 chars): ${JSON.stringify(verseContent).substring(0, 100)}...`);
    });
  }
  
  // Check if all chapters have similar structure
  console.log('\n🔍 Chapter analysis:');
  chapterKeys.forEach(chapterNum => {
    const verses = Object.keys(jsonResult.chapters[chapterNum]);
    console.log(`Chapter ${chapterNum}: ${verses.length} verses (${verses.join(', ')})`);
  });
}

// Create a function to extract specific verses
function getVerseRange(chapters, chapterNum, verseRange) {
  const chapter = chapters[chapterNum.toString()];
  if (!chapter) {
    console.log(`❌ Chapter ${chapterNum} not found`);
    return [];
  }
  
  let verseNumbers = [];
  
  if (verseRange.includes('-')) {
    const [start, end] = verseRange.split('-').map(n => parseInt(n.trim()));
    for (let i = start; i <= end; i++) {
      verseNumbers.push(i.toString());
    }
  } else {
    verseNumbers = [verseRange.toString()];
  }
  
  const verses = [];
  verseNumbers.forEach(verseNum => {
    if (chapter[verseNum]) {
      verses.push({
        number: parseInt(verseNum),
        content: chapter[verseNum]
      });
    }
  });
  
  return verses;
}

// Test the verse extraction
console.log('\n🧪 Testing verse extraction:');
const testRanges = [
  { chapter: 1, range: '1' },
  { chapter: 1, range: '1-3' },
  { chapter: 1, range: '3-5' },
  { chapter: 2, range: '1' },
];

testRanges.forEach(test => {
  console.log(`\n--- JON ${test.chapter}:${test.range} ---`);
  const verses = getVerseRange(jsonResult.chapters, test.chapter, test.range);
  verses.forEach(verse => {
    console.log(`Verse ${verse.number}: ${JSON.stringify(verse.content).substring(0, 150)}...`);
  });
});

// Create a cleaned version for React components using the real structure
function createCleanedData(usfmJson) {
  // Extract text from verseObjects (similar to the TypeScript version)
  const extractTextFromVerseObjects = (verseObjects) => {
    const textParts = [];

    const processVerseObject = (obj) => {
      if (obj.type === 'text') {
        if (obj.text) {
          textParts.push(obj.text);
        }
      } else if (obj.tag === 'w' && obj.type === 'word') {
        if (obj.text) {
          textParts.push(obj.text);
        }
      } else if (obj.tag === 'zaln' && obj.type === 'milestone') {
        if (obj.children) {
          obj.children.forEach(child => {
            processVerseObject(child);
          });
        }
      }
    };

    verseObjects.forEach(processVerseObject);
    return textParts.join('').trim();
  };

  const result = {
    book: 'Jonah',
    bookCode: 'JON',
    chapters: []
  };

  if (usfmJson.chapters) {
    Object.entries(usfmJson.chapters).forEach(([chapterNum, chapterData]) => {
      const chapterNumber = parseInt(chapterNum);
      if (isNaN(chapterNumber)) return; // Skip non-numeric chapters

      const verses = [];
      
      Object.entries(chapterData).forEach(([verseNum, verseData]) => {
        const verseNumber = parseInt(verseNum);
        if (isNaN(verseNumber)) return; // Skip non-numeric verses (like 'front')

        if (verseData.verseObjects && Array.isArray(verseData.verseObjects)) {
          const cleanText = extractTextFromVerseObjects(verseData.verseObjects);
          if (cleanText) {
            verses.push({
              number: verseNumber,
              text: cleanText,
              reference: `JON ${chapterNumber}:${verseNumber}`,
              raw: verseData
            });
          }
        }
      });
      
      if (verses.length > 0) {
        result.chapters.push({
          number: chapterNumber,
          verses: verses.sort((a, b) => a.number - b.number)
        });
      }
    });
  }

  return result;
}

const cleanedData = createCleanedData(jsonResult);

// Save cleaned data
const cleanedOutputPath = path.join(__dirname, 'jonah-cleaned.json');
fs.writeFileSync(cleanedOutputPath, JSON.stringify(cleanedData, null, 2));
console.log(`\n✅ Cleaned data saved to: ${cleanedOutputPath}`);

console.log('\n📊 Cleaned Data Summary:');
console.log(`Book: ${cleanedData.book}`);
console.log(`Chapters: ${cleanedData.chapters.length}`);
cleanedData.chapters.forEach(chapter => {
  console.log(`  Chapter ${chapter.number}: ${chapter.verses.length} verses`);
});

// Show sample cleaned verses
console.log('\n🧹 Sample cleaned verses:');
if (cleanedData.chapters.length > 0) {
  const firstChapter = cleanedData.chapters[0];
  firstChapter.verses.slice(0, 3).forEach(verse => {
    console.log(`${firstChapter.number}:${verse.number} - ${verse.text}`);
  });
}

console.log('\n✨ Analysis complete! Check the JSON files for full data.'); 