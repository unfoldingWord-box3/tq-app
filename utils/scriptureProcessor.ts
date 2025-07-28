import {
    CleanChapter,
    CleanScripture,
    CleanVerse,
    Paragraph,
    ScriptureReference,
    SectionReference,
    TranslationSection,
    USFMAlignmentObject,
    USFMDocument,
    USFMTextObject,
    USFMVerse,
    USFMVerseObject,
    USFMWordObject,
    VerseWithSection
} from '../types/usfm';

/**
 * Extract readable text from a verseObjects array
 */
export function extractTextFromVerseObjects(verseObjects: USFMVerseObject[]): string {
  const textParts: string[] = [];

  const processVerseObject = (obj: USFMVerseObject): void => {
    if (obj.type === 'text') {
      // Direct text object
      const textObj = obj as USFMTextObject;
      if (textObj.text) {
        // Clean up USFM artifacts and normalize text
        let cleanText = textObj.text
          .replace(/\\\\?\*/g, '') // Remove \* and \\* markers
          .replace(/\n\n/g, ' ') // Replace double newlines with space
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        if (cleanText) {
          textParts.push(cleanText);
        }
      }
    } else if (obj.tag === 'w' && obj.type === 'word') {
      // Word object
      const wordObj = obj as USFMWordObject;
      if (wordObj.text && wordObj.text !== '*') {
        // Clean word text and avoid asterisks
        let cleanWord = wordObj.text.replace(/\*/g, '').trim();
        if (cleanWord) {
          textParts.push(cleanWord);
        }
      }
    } else if (obj.tag === 'zaln' && obj.type === 'milestone') {
      // Alignment object with children
      const alignObj = obj as USFMAlignmentObject;
      if (alignObj.children) {
        alignObj.children.forEach(child => {
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
 * Extract basic paragraph information from verseObjects 
 * Returns the paragraph style if found, otherwise 'p' (default paragraph)
 */
export function extractParagraphStyle(verseObjects: USFMVerseObject[]): string {
  for (const obj of verseObjects) {
     
    const anyObj = obj as any;
    if ((anyObj.type === 'paragraph' || anyObj.type === 'quote') && anyObj.tag) {
      return anyObj.tag;
    }
  }
  return 'p'; // Default paragraph style
}

/**
 * Check if verseObjects contain any paragraph markers
 */
export function hasParagraphMarkers(verseObjects: USFMVerseObject[]): boolean {
  return verseObjects.some(obj => {
     
    const anyObj = obj as any;
    return anyObj.type === 'paragraph' || anyObj.type === 'quote';
  });
}

/**
 * Get indent level for poetry and other indented paragraphs
 */
function getIndentLevel(style: string): number {
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
function isPoetryStyle(style: string): boolean {
  return style === 'q' || /^q\d+$/.test(style);
}

/**
 * Extract a clean verse from USFM verse data
 */
export function extractCleanVerse(
  verseNumber: string, 
  verseData: USFMVerse, 
  bookCode: string, 
  chapterNumber: number
): CleanVerse | null {
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
export function groupVersesIntoParagraphs(
  chapterData: any, 
  verses: CleanVerse[], 
  chapterNumber: number
): Paragraph[] {
  if (!verses || verses.length === 0) return [];

  const paragraphs: Paragraph[] = [];
  let currentParagraphStyle = 'p'; // Default paragraph style
  let currentParagraphVerses: CleanVerse[] = [];
  let paragraphIndex = 1;

  // Check front matter for initial paragraph style
  if (chapterData.front && chapterData.front.verseObjects) {
    chapterData.front.verseObjects.forEach((obj: any) => {
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

    verseData.verseObjects.forEach((obj: any) => {
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
        paragraphs.push({
          id: `chapter-${chapterNumber}-paragraph-${paragraphIndex}`,
          type: isPoetryStyle(currentParagraphStyle) ? 'quote' : 'paragraph',
          style: currentParagraphStyle as any,
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
      paragraphs.push({
        id: `chapter-${chapterNumber}-paragraph-${paragraphIndex}`,
        type: isPoetryStyle(currentParagraphStyle) ? 'quote' : 'paragraph',
        style: currentParagraphStyle as any,
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
 * Sections are defined by content BETWEEN markers, not starting from markers
 */
function extractSections(usfmDoc: USFMDocument, bookCode: string): TranslationSection[] {
  const sections: TranslationSection[] = [];
  const markers: { chapter: number; verse: number }[] = [];

  // First pass: collect all \ts\* marker positions
  Object.entries(usfmDoc.chapters).forEach(([chapterNumStr, chapterData]: [string, any]) => {
    const chapterNum = parseInt(chapterNumStr);
    if (isNaN(chapterNum)) return;

    Object.entries(chapterData).forEach(([verseNumStr, verseData]: [string, any]) => {
      const verseNum = parseInt(verseNumStr);
      if (isNaN(verseNum)) return;

      if (verseData.verseObjects) {
        const hasTranslationSection = verseData.verseObjects.some((obj: any) => 
          (obj.type === 'milestone' && obj.tag === 'ts') || 
          (typeof obj === 'string' && obj.includes('ts\\*')) ||
          (obj.tag === 'ts\\*')
        );

        if (hasTranslationSection) {
          markers.push({ chapter: chapterNum, verse: verseNum });
        }
      }
    });
  });

  // Sort markers by chapter and verse
  markers.sort((a, b) => a.chapter === b.chapter ? a.verse - b.verse : a.chapter - b.chapter);

  // Find the first verse of the book
  const allChapters = Object.keys(usfmDoc.chapters)
    .filter(k => !isNaN(parseInt(k)))
    .map(k => parseInt(k))
    .sort((a, b) => a - b);
  
  if (allChapters.length === 0) return sections;

  const firstChapter = allChapters[0];
  const firstChapterData = usfmDoc.chapters[firstChapter.toString()];
  const firstVerses = Object.keys(firstChapterData)
    .filter(k => !isNaN(parseInt(k)))
    .map(k => parseInt(k))
    .sort((a, b) => a - b);

  if (firstVerses.length === 0) return sections;

  const bookStart = { chapter: firstChapter, verse: firstVerses[0] };

  // Helper function to get last verse of a chapter
  const getLastVerseOfChapter = (chapterNum: number): number => {
    const chapterData = usfmDoc.chapters[chapterNum.toString()];
    if (!chapterData) return 0;
    
    const verses = Object.keys(chapterData)
      .filter(k => !isNaN(parseInt(k)))
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
    
    return verses.length > 0 ? verses[verses.length - 1] : 0;
  };

  // Create sections based on content BETWEEN markers
  let sectionIndex = 1;

  if (markers.length === 0) {
    // No markers - entire book is one section
    // Find the last chapter and last verse in the book
    const lastChapter = allChapters[allChapters.length - 1];
    const lastChapterData = usfmDoc.chapters[lastChapter.toString()];
    const lastChapterVerses = Object.keys(lastChapterData)
      .filter(k => !isNaN(parseInt(k)))
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
    const lastVerse = lastChapterVerses[lastChapterVerses.length - 1];
    
    sections.push({
      id: `section-${sectionIndex}`,
      title: `Section ${sectionIndex}`,
      startReference: `${bookCode} ${bookStart.chapter}:${bookStart.verse}`,
      endReference: `${bookCode} ${lastChapter}:${lastVerse}`,
      startChapter: bookStart.chapter,
      startVerse: bookStart.verse,
      endChapter: lastChapter,
      endVerse: lastVerse
    });
  } else {
    // Section 1: From book start to before first marker
    const firstMarker = markers[0];
    const endVerse = firstMarker.verse - 1;
    const endChapter = endVerse >= 1 ? firstMarker.chapter : firstMarker.chapter - 1;
    const actualEndVerse = endVerse >= 1 ? endVerse : getLastVerseOfChapter(endChapter);

    if (actualEndVerse > 0) {
      sections.push({
        id: `section-${sectionIndex}`,
        title: `Section ${sectionIndex}`,
        startReference: `${bookCode} ${bookStart.chapter}:${bookStart.verse}`,
        endReference: `${bookCode} ${endChapter}:${actualEndVerse}`,
        startChapter: bookStart.chapter,
        startVerse: bookStart.verse,
        endChapter: endChapter,
        endVerse: actualEndVerse
      });
      sectionIndex++;
    }

    // Sections between markers
    for (let i = 0; i < markers.length - 1; i++) {
      const currentMarker = markers[i];
      const nextMarker = markers[i + 1];

      const startChapter = currentMarker.chapter;
      const startVerse = currentMarker.verse;
      const endVerse = nextMarker.verse - 1;
      const endChapter = endVerse >= 1 ? nextMarker.chapter : nextMarker.chapter - 1;
      const actualEndVerse = endVerse >= 1 ? endVerse : getLastVerseOfChapter(endChapter);

      if (actualEndVerse > 0) {
        sections.push({
          id: `section-${sectionIndex}`,
          title: `Section ${sectionIndex}`,
          startReference: `${bookCode} ${startChapter}:${startVerse}`,
          endReference: `${bookCode} ${endChapter}:${actualEndVerse}`,
          startChapter: startChapter,
          startVerse: startVerse,
          endChapter: endChapter,
          endVerse: actualEndVerse
        });
        sectionIndex++;
      }
    }

    // Final section: From last marker to end of book
    const lastMarker = markers[markers.length - 1];
    
    // Find the last chapter and last verse in the book
    const lastChapter = allChapters[allChapters.length - 1];
    const lastChapterData = usfmDoc.chapters[lastChapter.toString()];
    const lastChapterVerses = Object.keys(lastChapterData)
      .filter(k => !isNaN(parseInt(k)))
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
    const lastVerse = lastChapterVerses[lastChapterVerses.length - 1];
    
    sections.push({
      id: `section-${sectionIndex}`,
      title: `Section ${sectionIndex}`,
      startReference: `${bookCode} ${lastMarker.chapter}:${lastMarker.verse}`,
      endReference: `${bookCode} ${lastChapter}:${lastVerse}`,
      startChapter: lastMarker.chapter,
      startVerse: lastMarker.verse,
      endChapter: lastChapter,
      endVerse: lastVerse
    });
  }

  return sections;
}

/**
 * Process USFM document into clean scripture data with optimal structure
 */
export function processUSFMDocument(usfmDoc: USFMDocument, bookName: string, bookCode: string): CleanScripture {
  const chapters: CleanChapter[] = [];
  let totalVerses = 0;
  let totalParagraphs = 0;

  // Extract sections first
  const sections = extractSections(usfmDoc, bookCode);

  Object.entries(usfmDoc.chapters).forEach(([chapterNumStr, chapterData]) => {
    const chapterNum = parseInt(chapterNumStr);
    if (isNaN(chapterNum)) return; // Skip non-numeric chapter keys

    const verses: CleanVerse[] = [];

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
      const versesWithRefs = sortedVerses.map(verse => {
        // Find paragraph for this verse
        const paragraph = paragraphs.find(p => 
          verse.number >= p.startVerse && verse.number <= p.endVerse
        );

                 // Find section for this verse
         const section = sections.find(s => {
           return verse.number >= s.startVerse && verse.number <= (s.endVerse || Infinity) && 
                  chapterNum >= s.startChapter && chapterNum <= (s.endChapter || chapterNum);
         });

        return {
          ...verse,
          paragraphId: paragraph?.id || undefined,
          sectionId: section?.id || undefined
        };
      });
      
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

/**
 * Parse scripture reference like "JON 1:3-5" or "Jonah 1:3"
 */
export function parseScriptureReference(ref: string): ScriptureReference | null {
  // Remove extra whitespace and normalize
  const cleanRef = ref.trim();
  
  // Patterns to match different reference formats
  const patterns = [
    // "JON 1:3-5" or "JON 1:3"
    /^([A-Z]{2,4})\s+(\d+):(\d+)(?:-(\d+))?$/i,
    // "Jonah 1:3-5" or "Jonah 1:3"
    /^([A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/,
  ];

  for (const pattern of patterns) {
    const match = cleanRef.match(pattern);
    if (match) {
      const bookInput = match[1];
      const chapter = parseInt(match[2]);
      const verseStart = parseInt(match[3]);
      const verseEnd = match[4] ? parseInt(match[4]) : undefined;

      // Determine book name and code
      let book: string;
      let bookCode: string;

      if (bookInput.length <= 4 && bookInput.toUpperCase() === bookInput) {
        // Likely a book code
        bookCode = bookInput.toUpperCase();
        book = getBookNameFromCode(bookCode);
      } else {
        // Likely a book name
        book = bookInput;
        bookCode = getBookCodeFromName(book);
      }

      return {
        book,
        bookCode,
        chapter,
        verseStart,
        verseEnd,
        displayReference: `${bookCode} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`
      };
    }
  }

  return null;
}

/**
 * Get verses from scripture data based on a reference
 */
export function getVersesByReference(
  scripture: CleanScripture | null, 
  reference: ScriptureReference
): CleanVerse[] {
  if (!scripture) return [];
  
  const chapter = scripture.chapters.find(ch => ch.number === reference.chapter);
  if (!chapter) return [];

  const startVerse = reference.verseStart;
  const endVerse = reference.verseEnd || reference.verseStart;

  return chapter.verses.filter(verse => 
    verse.number >= startVerse && verse.number <= endVerse
  );
}

/**
 * Get verses by reference string (e.g., "JON 1:3-5")
 */
export function getVersesByReferenceString(
  scripture: CleanScripture | null, 
  referenceString: string
): CleanVerse[] {
  if (!scripture) return [];
  
  const reference = parseScriptureReference(referenceString);
  if (!reference) return [];

  // Check if the book matches
  if (reference.bookCode !== scripture.bookCode && reference.book !== scripture.book) {
    return [];
  }

  return getVersesByReference(scripture, reference);
}

/**
 * Format verses for display
 */
export function formatVerses(verses: CleanVerse[], showVerseNumbers: boolean = true): string {
  if (verses.length === 0) return '';

  return verses.map(verse => {
    return showVerseNumbers ? `${verse.number} ${verse.text}` : verse.text;
  }).join(' ');
}

// NEW: Section-related functions

/**
 * Get verses from a specific translation section
 */
export function getVersesBySection(
  scripture: CleanScripture | null,
  sectionId: string
): CleanVerse[] {
  if (!scripture) return [];
  if (!scripture.sections) return [];
  
  const section = scripture.sections.find(s => s.id === sectionId);
  if (!section) return [];

  const verses: CleanVerse[] = [];
  
  // Iterate through chapters to find verses in range
  for (const chapter of scripture.chapters) {
    if (chapter.number < section.startChapter || 
        (section.endChapter && chapter.number > section.endChapter)) {
      continue;
    }

                   for (const verse of chapter.verses) {
        const inRange = (
          (chapter.number === section.startChapter && verse.number >= section.startVerse) ||
          (chapter.number > section.startChapter && chapter.number < (section.endChapter || Infinity)) ||
          (chapter.number === (section.endChapter || Infinity) && verse.number <= (section.endVerse || Infinity))
        );

        if (inRange) {
          verses.push(verse);
        }
      }
  }

  return verses;
}

/**
 * Find which section contains a specific verse reference
 */
export function getSectionByReference(
  scripture: CleanScripture | null,
  reference: string
): TranslationSection | null {
  if (!scripture) return null;
  if (!scripture.sections) return null;

  // Parse reference like "JON 1:3"
  const match = reference.match(/^([A-Z]+)\s+(\d+):(\d+)$/);
  if (!match) return null;
  
  const chapter = parseInt(match[2]);
  const verse = parseInt(match[3]);
  
           return scripture.sections.find(section => {
      const inRange = (
        (chapter === section.startChapter && verse >= section.startVerse) &&
        (chapter < (section.endChapter || Infinity) || 
         (chapter === (section.endChapter || Infinity) && verse <= (section.endVerse || Infinity)))
      );
      return inRange;
    }) || null;
}

/**
 * Get all sections in scripture
 */
export function getSections(scripture: CleanScripture | null): TranslationSection[] {
  if (!scripture) return [];
  return scripture.sections || [];
}

/**
 * Get section by ID
 */
export function getSection(scripture: CleanScripture | null, sectionId: string): TranslationSection | null {
  if (!scripture) return null;
  if (!scripture.sections) return null;
  return scripture.sections.find(s => s.id === sectionId) || null;
}

/**
 * Get next section
 */
export function getNextSection(scripture: CleanScripture | null, currentSectionId: string): TranslationSection | null {
  if (!scripture) return null;
  if (!scripture.sections) return null;
  
  const currentIndex = scripture.sections.findIndex(s => s.id === currentSectionId);
  return currentIndex >= 0 && currentIndex < scripture.sections.length - 1 
    ? scripture.sections[currentIndex + 1] 
    : null;
}

/**
 * Get previous section
 */
export function getPreviousSection(scripture: CleanScripture | null, currentSectionId: string): TranslationSection | null {
  if (!scripture) return null;
  if (!scripture.sections) return null;
  
  const currentIndex = scripture.sections.findIndex(s => s.id === currentSectionId);
  return currentIndex > 0 ? scripture.sections[currentIndex - 1] : null;
}

/**
 * Create section reference object
 */
export function createSectionReference(section: TranslationSection): SectionReference {
  const endRef = section.endReference ? ` - ${section.endReference}` : '';
  return {
    sectionId: section.id,
    section,
    displayReference: `${section.title} (${section.startReference}${endRef})`
  };
}

/**
 * Parse section reference like "section-1" or "Section 1"
 */
export function parseSectionReference(
  scripture: CleanScripture | null, 
  ref: string
): SectionReference | null {
  if (!scripture) return null;
  if (!scripture.sections) return null;

  // Try to find by ID first
  let section = scripture.sections.find(s => s.id === ref);
  
  // If not found, try to parse "Section 1" format
  if (!section) {
    const match = ref.match(/^Section\s+(\d+)$/i);
    if (match) {
      const sectionNumber = parseInt(match[1]);
      section = scripture.sections.find(s => s.id === `section-${sectionNumber}`);
    }
  }

  return section ? createSectionReference(section) : null;
}

/**
 * Enhanced verse retrieval with section context
 */
export function getVersesWithSectionContext(
  scripture: CleanScripture | null,
  reference: string | TranslationSection
): VerseWithSection[] {
  if (!scripture) return [];
  
  let verses: CleanVerse[];
  let section: TranslationSection | null = null;

  if (typeof reference === 'string') {
    // Check if it's a section reference
    const sectionRef = parseSectionReference(scripture, reference);
    if (sectionRef) {
      section = sectionRef.section;
      verses = getVersesBySection(scripture, section.id);
    } else {
      // Regular verse reference
      verses = getVersesByReferenceString(scripture, reference);
      if (verses.length > 0) {
        section = getSectionByReference(scripture, verses[0].reference);
      }
    }
  } else {
    // Direct section object
    section = reference;
    verses = getVersesBySection(scripture, section.id);
  }

  return verses.map((verse, index) => ({
    ...verse,
    sectionId: section?.id,
    isFirstInSection: index === 0,
    isLastInSection: index === verses.length - 1
  }));
}

// Helper functions for book name/code conversion
function getBookNameFromCode(code: string): string {
  const bookMap: Record<string, string> = {
    'JON': 'Jonah',
    'GEN': 'Genesis',
    'EXO': 'Exodus',
    // Add more as needed
  };
  return bookMap[code] || code;
}

function getBookCodeFromName(name: string): string {
  const codeMap: Record<string, string> = {
    'jonah': 'JON',
    'genesis': 'GEN',
    'exodus': 'EXO',
    // Add more as needed
  };
  return codeMap[name.toLowerCase()] || name.substring(0, 3).toUpperCase();
} 