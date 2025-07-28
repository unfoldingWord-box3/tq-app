const fs = require('fs');
const path = require('path');
const usfm = require('usfm-js');

// Enhanced analyzer for USFM with translation section support
// This extracts \ts\* markers and creates section-based navigation

console.log('🚀 USFM Section-Aware Analyzer\n');

// Read and process USFM file
const usfmPath = path.join(__dirname, 'tests', 'fixtures', 'JON.usfm');
const usfmContent = fs.readFileSync(usfmPath, 'utf8');
const usfmJson = usfm.toJSON(usfmContent);

console.log('=== Analyzing Translation Sections ===\n');

// Extract text from verseObjects (same as before)
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

// Function to find translation section markers in verse objects
const findSectionMarkers = (verseObjects) => {
  const markers = [];
  
  verseObjects.forEach((obj, index) => {
    if (obj.tag === 'ts\\*' || (obj.tag === 'ts' && obj.content === '\\*')) {
      markers.push({
        index,
        type: 'section_break',
        marker: obj
      });
    }
  });
  
  return markers;
};

// Enhanced function to create cleaned data with section information
function createSectionAwareData(usfmJson) {
  const result = {
    book: 'Jonah',
    bookCode: 'JON',
    chapters: [],
    sections: [] // New: section information
  };

  let currentSectionId = 1;
  let sectionStartReference = null;

  if (usfmJson.chapters) {
    Object.entries(usfmJson.chapters).forEach(([chapterNumStr, chapterData]) => {
      const chapterNumber = parseInt(chapterNumStr);
      if (isNaN(chapterNumber)) return;

      const verses = [];
      let chapterSections = []; // Track sections within this chapter

      Object.entries(chapterData).forEach(([verseNumStr, verseData]) => {
        const verseNumber = parseInt(verseNumStr);
        if (isNaN(verseNumber)) return;

        if (verseData.verseObjects && Array.isArray(verseData.verseObjects)) {
          // Check for section markers in this verse
          const sectionMarkers = findSectionMarkers(verseData.verseObjects);
          
          // Extract clean text
          const cleanText = extractTextFromVerseObjects(verseData.verseObjects);
          
          if (cleanText) {
            const verseReference = `JON ${chapterNumber}:${verseNumber}`;
            
            // Handle section markers
            sectionMarkers.forEach(marker => {
              // End previous section if one exists
              if (sectionStartReference) {
                const previousSection = result.sections[result.sections.length - 1];
                if (previousSection) {
                  // Set end reference to the verse before this one
                  if (verseNumber > 1) {
                    previousSection.endReference = `JON ${chapterNumber}:${verseNumber - 1}`;
                    previousSection.endChapter = chapterNumber;
                    previousSection.endVerse = verseNumber - 1;
                  } else if (chapterNumber > 1) {
                    // End of previous chapter
                    const prevChapter = result.chapters.find(ch => ch.number === chapterNumber - 1);
                    if (prevChapter && prevChapter.verses.length > 0) {
                      const lastVerse = prevChapter.verses[prevChapter.verses.length - 1].number;
                      previousSection.endReference = `JON ${chapterNumber - 1}:${lastVerse}`;
                      previousSection.endChapter = chapterNumber - 1;
                      previousSection.endVerse = lastVerse;
                    }
                  }
                }
              }

              // Start new section
              sectionStartReference = verseReference;
              result.sections.push({
                id: `section-${currentSectionId}`,
                startReference: verseReference,
                startChapter: chapterNumber,
                startVerse: verseNumber,
                endReference: null, // Will be set when next section starts or at end
                endChapter: null,
                endVerse: null,
                title: `Section ${currentSectionId}`
              });
              currentSectionId++;
            });

            verses.push({
              number: verseNumber,
              text: cleanText,
              reference: verseReference,
              hasSectionMarker: sectionMarkers.length > 0,
              sectionMarkers: sectionMarkers.length
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

    // Close the last section
    if (result.sections.length > 0 && !result.sections[result.sections.length - 1].endReference) {
      const lastChapter = result.chapters[result.chapters.length - 1];
      if (lastChapter && lastChapter.verses.length > 0) {
        const lastVerse = lastChapter.verses[lastChapter.verses.length - 1];
        result.sections[result.sections.length - 1].endReference = lastVerse.reference;
        result.sections[result.sections.length - 1].endChapter = lastChapter.number;
        result.sections[result.sections.length - 1].endVerse = lastVerse.number;
      }
    }
  }

  return result;
}

// Process the data
const sectionData = createSectionAwareData(usfmJson);

// Save section-aware data
const sectionOutputPath = path.join(__dirname, 'jonah-sections.json');
fs.writeFileSync(sectionOutputPath, JSON.stringify(sectionData, null, 2));
console.log(`✅ Section-aware data saved to: ${sectionOutputPath}`);

// Analysis output
console.log('\n📊 Section Analysis:');
console.log(`Book: ${sectionData.book} (${sectionData.bookCode})`);
console.log(`Chapters: ${sectionData.chapters.length}`);
console.log(`Translation Sections: ${sectionData.sections.length}`);

console.log('\n📋 Translation Sections:');
sectionData.sections.forEach(section => {
  console.log(`${section.id}: ${section.startReference} - ${section.endReference || 'End'}`);
});

// Show verses with section markers
console.log('\n🎯 Verses with Section Markers:');
let sectionMarkerCount = 0;
sectionData.chapters.forEach(chapter => {
  chapter.verses.forEach(verse => {
    if (verse.hasSectionMarker) {
      console.log(`  ${verse.reference} (${verse.sectionMarkers} marker${verse.sectionMarkers > 1 ? 's' : ''})`);
      sectionMarkerCount += verse.sectionMarkers;
    }
  });
});
console.log(`Total section markers found: ${sectionMarkerCount}`);

// Test section navigation
console.log('\n🧪 Testing Section Navigation:');

// Function to get verses by section
function getVersesBySection(sectionData, sectionId) {
  const section = sectionData.sections.find(s => s.id === sectionId);
  if (!section) return [];

  const verses = [];
  
  // Iterate through chapters to find verses in range
  for (const chapter of sectionData.chapters) {
    if (chapter.number < section.startChapter || 
        (section.endChapter && chapter.number > section.endChapter)) {
      continue;
    }

    for (const verse of chapter.verses) {
      const inRange = (
        (chapter.number === section.startChapter && verse.number >= section.startVerse) ||
        (chapter.number > section.startChapter && chapter.number < section.endChapter) ||
        (chapter.number === section.endChapter && verse.number <= section.endVerse) ||
        (chapter.number > section.startChapter && !section.endChapter)
      );

      if (inRange) {
        verses.push(verse);
      }
    }
  }

  return verses;
}

// Test first few sections
const testSections = sectionData.sections.slice(0, 3);
testSections.forEach(section => {
  const verses = getVersesBySection(sectionData, section.id);
  console.log(`\n--- ${section.id} (${section.startReference} - ${section.endReference || 'End'}) ---`);
  console.log(`Verses: ${verses.length}`);
  if (verses.length > 0) {
    console.log(`First verse: ${verses[0].text.substring(0, 80)}...`);
    if (verses.length > 1) {
      console.log(`Last verse: ${verses[verses.length - 1].text.substring(0, 80)}...`);
    }
  }
});

// Create section navigation helper
function createSectionNavigator(sectionData) {
  return {
    getSections: () => sectionData.sections,
    
    getSection: (sectionId) => sectionData.sections.find(s => s.id === sectionId),
    
    getVersesBySection: (sectionId) => getVersesBySection(sectionData, sectionId),
    
    getSectionByReference: (reference) => {
      // Parse reference like "JON 1:3"
      const match = reference.match(/^([A-Z]+)\s+(\d+):(\d+)$/);
      if (!match) return null;
      
      const chapter = parseInt(match[2]);
      const verse = parseInt(match[3]);
      
      return sectionData.sections.find(section => {
        const inRange = (
          (chapter === section.startChapter && verse >= section.startVerse) &&
          (!section.endChapter || 
           (chapter < section.endChapter) ||
           (chapter === section.endChapter && verse <= section.endVerse))
        );
        return inRange;
      });
    },
    
    getNextSection: (currentSectionId) => {
      const currentIndex = sectionData.sections.findIndex(s => s.id === currentSectionId);
      return currentIndex >= 0 && currentIndex < sectionData.sections.length - 1 
        ? sectionData.sections[currentIndex + 1] 
        : null;
    },
    
    getPreviousSection: (currentSectionId) => {
      const currentIndex = sectionData.sections.findIndex(s => s.id === currentSectionId);
      return currentIndex > 0 ? sectionData.sections[currentIndex - 1] : null;
    }
  };
}

const navigator = createSectionNavigator(sectionData);

console.log('\n⚡ Section Navigator Demo:');
console.log('Finding section for JON 1:5...');
const section = navigator.getSectionByReference('JON 1:5');
if (section) {
  console.log(`Found: ${section.id} (${section.startReference} - ${section.endReference})`);
  
  const nextSection = navigator.getNextSection(section.id);
  const prevSection = navigator.getPreviousSection(section.id);
  
  console.log(`Next section: ${nextSection ? nextSection.id : 'None'}`);
  console.log(`Previous section: ${prevSection ? prevSection.id : 'None'}`);
}

console.log('\n✨ Section analysis complete!');
console.log('📱 Ready for section-based navigation in your React Native app!'); 