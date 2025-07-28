const usfmJs = require('usfm-js');
const fs = require('fs');
const path = require('path');

// Since we can't directly import TypeScript modules in Node.js, 
// we'll recreate the essential processing functions here

/**
 * Extract readable text from a verseObjects array
 */
function extractTextFromVerseObjects(verseObjects) {
  const textParts = [];

  const processVerseObject = (obj) => {
    if (obj.type === 'text') {
      if (obj.text) {
        // Clean up USFM artifacts and normalize text
        let cleanText = obj.text
          .replace(/\\\\?\*/g, '') // Remove \* and \\* markers
          .replace(/\n\n/g, ' ') // Replace double newlines with space
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        if (cleanText) {
          textParts.push(cleanText);
        }
      }
    } else if (obj.tag === 'w' && obj.type === 'word') {
      if (obj.text && obj.text !== '*') {
        // Clean word text and avoid asterisks
        let cleanWord = obj.text.replace(/\*/g, '').trim();
        if (cleanWord) {
          textParts.push(cleanWord);
        }
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
  
  // Join with spaces and clean up the final result
  return textParts.join(' ')
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s*,\s*/g, ', ') // Fix comma spacing
    .replace(/\s*\.\s*/g, '. ') // Fix period spacing
    .replace(/\s*;\s*/g, '; ') // Fix semicolon spacing
    .replace(/\s*:\s*/g, ': ') // Fix colon spacing
    .replace(/\s*\?\s*/g, '? ') // Fix question mark spacing
    .replace(/\s*!\s*/g, '! ') // Fix exclamation spacing
    .replace(/\s+$/, '') // Remove trailing spaces
    .trim();
}

/**
 * Get indent level for poetry and other indented paragraphs
 */
function getIndentLevel(style) {
  switch (style) {
    case 'q': return 1;
    case 'q1': return 1;
    case 'q2': return 2;
    case 'q3': return 3;
    case 'q4': return 4;
    case 'm': return 0; // Margin paragraph, no indent
    case 'mi': return 1; // Margin paragraph with indent
    case 'pc': return 1; // Centered paragraph
    default: return 0;
  }
}

/**
 * Determine if a paragraph style is poetry/quote
 */
function isPoetryStyle(style) {
  return style === 'q' || /^q\d+$/.test(style);
}

/**
 * Extract a clean verse from USFM verse data
 */
function extractCleanVerse(verseNumber, verseData, bookCode, chapterNumber) {
  if (!verseData.verseObjects || verseData.verseObjects.length === 0) {
    return null;
  }

  const text = extractTextFromVerseObjects(verseData.verseObjects);
  
  if (!text || text.trim().length === 0) {
    return null;
  }

  return {
    number: parseInt(verseNumber),
    text: text.trim(),
    reference: `${bookCode} ${chapterNumber}:${verseNumber}`
  };
}

/**
 * Group verses into paragraphs based on USFM paragraph markers
 */
function groupVersesIntoParagraphs(chapterData, verses, chapterNumber) {
  if (!verses || verses.length === 0) return [];

  const paragraphs = [];
  let currentParagraphStyle = 'p'; // Default paragraph style
  let currentParagraphVerses = [];
  let paragraphIndex = 1;

  // Check front matter for initial paragraph style
  if (chapterData.front && chapterData.front.verseObjects) {
    chapterData.front.verseObjects.forEach((obj) => {
      if (obj.type === 'paragraph' || obj.type === 'quote') {
        currentParagraphStyle = obj.tag;
      }
    });
  }

  // Process verses sequentially to group them into paragraphs
  verses.forEach(verse => {
    const verseData = chapterData[verse.number.toString()];
    if (!verseData || !verseData.verseObjects) {
      currentParagraphVerses.push(verse);
      return;
    }

    // Check if this verse starts a new paragraph
    let startsNewParagraph = false;
    let newStyle = currentParagraphStyle;

    verseData.verseObjects.forEach((obj) => {
      if (obj.type === 'paragraph' || obj.type === 'quote') {
        startsNewParagraph = true;
        newStyle = obj.tag;
      }
    });

    // If new paragraph starts, finish the previous one
    if (startsNewParagraph && currentParagraphVerses.length > 0) {
      const firstVerse = currentParagraphVerses[0];
      const lastVerse = currentParagraphVerses[currentParagraphVerses.length - 1];
      
      if (firstVerse && lastVerse) {
        const paragraphId = `chapter-${chapterNumber}-paragraph-${paragraphIndex}`;
        
        paragraphs.push({
          id: paragraphId,
          type: isPoetryStyle(currentParagraphStyle) ? 'quote' : 'paragraph',
          style: currentParagraphStyle,
          indentLevel: getIndentLevel(currentParagraphStyle),
          startVerse: firstVerse.number,
          endVerse: lastVerse.number,
          verseCount: currentParagraphVerses.length,
          verseNumbers: currentParagraphVerses.map(v => v.number),
          combinedText: currentParagraphVerses.map(v => v.text).join(' '),
          verses: [...currentParagraphVerses]
        });
      }
      
      paragraphIndex++;
      currentParagraphVerses = [];
      currentParagraphStyle = newStyle;
    }

    // Add current verse to the paragraph
    currentParagraphVerses.push(verse);
  });

  // Add the final paragraph
  if (currentParagraphVerses.length > 0) {
    const firstVerse = currentParagraphVerses[0];
    const lastVerse = currentParagraphVerses[currentParagraphVerses.length - 1];
    
    if (firstVerse && lastVerse) {
      const paragraphId = `chapter-${chapterNumber}-paragraph-${paragraphIndex}`;
      
      paragraphs.push({
        id: paragraphId,
        type: isPoetryStyle(currentParagraphStyle) ? 'quote' : 'paragraph',
        style: currentParagraphStyle,
        indentLevel: getIndentLevel(currentParagraphStyle),
        startVerse: firstVerse.number,
        endVerse: lastVerse.number,
        verseCount: currentParagraphVerses.length,
        verseNumbers: currentParagraphVerses.map(v => v.number),
        combinedText: currentParagraphVerses.map(v => v.text).join(' '),
        verses: [...currentParagraphVerses]
      });
    }
  }

  return paragraphs;
}

/**
 * Detect translation sections by scanning for \ts\* markers
 */
function extractSections(usfmDoc, bookCode) {
  const sections = [];
  let sectionIndex = 1;
  let currentSectionStart = null;

  Object.entries(usfmDoc.chapters).forEach(([chapterNumStr, chapterData]) => {
    const chapterNum = parseInt(chapterNumStr);
    if (isNaN(chapterNum)) return;

    Object.entries(chapterData).forEach(([verseNumStr, verseData]) => {
      const verseNum = parseInt(verseNumStr);
      if (isNaN(verseNum)) return;

      // Check if this verse has section markers
      if (verseData.verseObjects) {
        const hasTranslationSection = verseData.verseObjects.some(obj => 
          obj.type === 'milestone' && obj.tag === 'ts'
        );

        if (hasTranslationSection) {
          // Close previous section if exists
          if (currentSectionStart) {
            sections.push({
              id: `section-${sectionIndex - 1}`,
              title: `Section ${sectionIndex - 1}`,
              startReference: `${bookCode} ${currentSectionStart.chapter}:${currentSectionStart.verse}`,
              endReference: `${bookCode} ${chapterNum}:${verseNum - 1}`,
              startChapter: currentSectionStart.chapter,
              startVerse: currentSectionStart.verse,
              endChapter: chapterNum,
              endVerse: verseNum - 1,
              verseCount: 0, // Will calculate later
              paragraphIds: [] // Will populate later
            });
          }

          // Start new section
          currentSectionStart = { chapter: chapterNum, verse: verseNum };
          sectionIndex++;
        }
      }
    });
  });

  // Close final section
  if (currentSectionStart) {
    sections.push({
      id: `section-${sectionIndex - 1}`,
      title: `Section ${sectionIndex - 1}`,
      startReference: `${bookCode} ${currentSectionStart.chapter}:${currentSectionStart.verse}`,
      endReference: null, // Open ended
      startChapter: currentSectionStart.chapter,
      startVerse: currentSectionStart.verse,
      endChapter: null,
      endVerse: null,
      verseCount: 0,
      paragraphIds: []
    });
  }

  return sections;
}

/**
 * Add cross-references to verses (paragraphId, sectionId)
 */
function addCrossReferences(verses, paragraphs, sections) {
  return verses.map(verse => {
    // Find paragraph for this verse
    const paragraph = paragraphs.find(p => 
      verse.number >= p.startVerse && verse.number <= p.endVerse
    );

    // Find section for this verse
    const section = sections.find(s => {
      if (s.endVerse === null) {
        // Open-ended section
        return verse.number >= s.startVerse;
      }
      return verse.number >= s.startVerse && verse.number <= s.endVerse;
    });

    return {
      ...verse,
      paragraphId: paragraph?.id || null,
      sectionId: section?.id || null
    };
  });
}

/**
 * Process USFM document into clean scripture data with optimal structure
 */
function processUSFMDocument(usfmDoc, bookName, bookCode) {
  const chapters = [];
  let totalVerses = 0;
  let totalParagraphs = 0;

  // Extract sections first
  const sections = extractSections(usfmDoc, bookCode);

  Object.entries(usfmDoc.chapters).forEach(([chapterNumStr, chapterData]) => {
    const chapterNum = parseInt(chapterNumStr);
    if (isNaN(chapterNum)) return; // Skip non-numeric chapter keys

    const verses = [];

    Object.entries(chapterData).forEach(([verseNumStr, verseData]) => {
      // Skip non-numeric verse keys (like 'front')
      const verseNum = parseInt(verseNumStr);
      if (isNaN(verseNum)) return;

      const cleanVerse = extractCleanVerse(verseNumStr, verseData, bookCode, chapterNum);
      if (cleanVerse) {
        verses.push(cleanVerse);
      }
    });

    if (verses.length > 0) {
      const sortedVerses = verses.sort((a, b) => a.number - b.number);
      const paragraphs = groupVersesIntoParagraphs(chapterData, sortedVerses, chapterNum) || [];
      
      // Add cross-references to verses
      const versesWithRefs = addCrossReferences(sortedVerses, paragraphs, sections);
      
      totalVerses += versesWithRefs.length;
      totalParagraphs += paragraphs.length;
      
      chapters.push({
        number: chapterNum,
        verseCount: versesWithRefs.length,
        paragraphCount: paragraphs.length,
        verses: versesWithRefs,
        paragraphs
      });
    }
  });

  const sortedChapters = chapters.sort((a, b) => a.number - b.number);

  return {
    book: bookName,
    bookCode,
    metadata: {
      totalChapters: sortedChapters.length,
      totalVerses,
      totalParagraphs,
      processingDate: new Date().toISOString().split('T')[0],
      version: "1.0"
    },
    chapters: sortedChapters,
    sections
  };
}

// Load Jonah USFM from the embedded TypeScript file
function loadJonahUSFM() {
  try {
    const jonahFile = fs.readFileSync(path.join(__dirname, 'assets/usfm/jonah.ts'), 'utf8');
    const match = jonahFile.match(/export const JONAH_USFM = `([^`]+)`/s);
    if (match) {
      return match[1];
    } else {
      throw new Error('Could not extract USFM content from jonah.ts');
    }
  } catch (error) {
    console.error('Error loading USFM file:', error.message);
    return null;
  }
}

// Main analysis function
function analyzeJSONOutput() {
  console.log('=== USFM to JSON Analysis ===\n');

  // 1. Load USFM content
  console.log('📖 Loading Jonah USFM content...');
  const jonahUsfm = loadJonahUSFM();
  if (!jonahUsfm) {
    console.error('❌ Failed to load USFM content');
    return;
  }
  console.log(`✅ Loaded USFM content (${jonahUsfm.length} characters)\n`);

  // 2. Convert USFM to JSON using usfm-js
  console.log('🔄 Converting USFM to JSON...');
  let rawJson;
  try {
    rawJson = usfmJs.toJSON(jonahUsfm);
    console.log('✅ USFM converted to JSON successfully\n');
  } catch (error) {
    console.error('❌ Error converting USFM to JSON:', error.message);
    return;
  }

  // 3. Process using our paragraph-aware processor
  console.log('🧩 Processing with paragraph-aware processor...');
  let processedScripture;
  try {
    processedScripture = processUSFMDocument(rawJson, 'Jonah', 'JON');
    console.log('✅ Processed scripture with paragraph grouping\n');
  } catch (error) {
    console.error('❌ Error processing scripture:', error.message);
    return;
  }

  // 4. Output analysis
  console.log('📊 ANALYSIS RESULTS:');
  console.log('==================');
  console.log(`Book: ${processedScripture.book} (${processedScripture.bookCode})`);
  console.log(`Total Chapters: ${processedScripture.metadata.totalChapters}`);
  console.log(`Total Verses: ${processedScripture.metadata.totalVerses}`);
  console.log(`Total Paragraphs: ${processedScripture.metadata.totalParagraphs}`);
  console.log(`Total Sections: ${processedScripture.sections.length}`);
  console.log(`Processing Date: ${processedScripture.metadata.processingDate}`);
  
  // Chapter analysis
  processedScripture.chapters.forEach(chapter => {
    console.log(`\nChapter ${chapter.number}:`);
    console.log(`  Verses: ${chapter.verseCount}`);
    console.log(`  Paragraphs: ${chapter.paragraphCount}`);
    
    chapter.paragraphs.forEach((paragraph, index) => {
      const poetryMarker = paragraph.type === 'quote' ? '🎵' : '📝';
      console.log(`    ${poetryMarker} ${index + 1}. ${paragraph.style} (${paragraph.type})`);
      console.log(`       Verses: ${paragraph.startVerse}-${paragraph.endVerse} (${paragraph.verseCount} verses)`);
      console.log(`       Indent: ${paragraph.indentLevel}`);
      console.log(`       Preview: "${paragraph.combinedText.substring(0, 80)}..."`);
    });
  });

  // Section analysis
  console.log(`\n📑 SECTIONS:`);
  processedScripture.sections.forEach((section, index) => {
    const endRef = section.endReference || 'end of book';
    console.log(`  ${index + 1}. ${section.title}`);
    console.log(`     Range: ${section.startReference} - ${endRef}`);
  });

  // 5. Write detailed outputs to files
  console.log('\n📁 Writing output files...');
  
  try {
    // Write raw usfm-js JSON output
    fs.writeFileSync('raw-usfm-json.json', JSON.stringify(rawJson, null, 2));
    console.log('✅ Written: raw-usfm-json.json');

    // Write processed scripture JSON
    fs.writeFileSync('processed-scripture.json', JSON.stringify(processedScripture, null, 2));
    console.log('✅ Written: processed-scripture.json');

    // Write paragraph analysis
    const analysis = {
      summary: processedScripture.metadata,
      structure: {
        hasMetadata: true,
        hasCrossReferences: true,
        hasCleanText: true,
        hasOptimalStructure: true
      },
      chapterAnalysis: processedScripture.chapters.map(chapter => ({
        chapter: chapter.number,
        verseCount: chapter.verseCount,
        paragraphCount: chapter.paragraphCount,
        paragraphs: chapter.paragraphs.map(p => ({
          id: p.id,
          style: p.style,
          type: p.type,
          indentLevel: p.indentLevel,
          verseRange: `${p.startVerse}-${p.endVerse}`,
          verseCount: p.verseCount,
          verseNumbers: p.verseNumbers,
          preview: p.combinedText.substring(0, 120) + '...',
          isPoetry: p.type === 'quote'
        }))
      })),
      sectionAnalysis: processedScripture.sections.map(section => ({
        id: section.id,
        title: section.title,
        startReference: section.startReference,
        endReference: section.endReference,
        verseRange: `${section.startVerse}-${section.endVerse || 'end'}`,
        chaptersSpanned: section.endChapter ? section.endChapter - section.startChapter + 1 : 1
      }))
    };

    fs.writeFileSync('paragraph-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('✅ Written: paragraph-analysis.json');

    console.log('\n🎉 Analysis complete! Check the generated JSON files for detailed structure.');
    
  } catch (error) {
    console.error('❌ Error writing output files:', error.message);
  }
}

// Run the analysis
analyzeJSONOutput(); 