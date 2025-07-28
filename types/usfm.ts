// TypeScript interfaces for usfm-js library output

export interface USFMHeader {
  tag?: string;
  content?: string;
  type?: string;
  text?: string;
}

export interface USFMWordObject {
  text: string;
  tag: 'w';
  type: 'word';
  occurrence: string;
  occurrences: string;
}

export interface USFMTextObject {
  type: 'text';
  text: string;
}

export interface USFMAlignmentObject {
  tag: 'zaln';
  type: 'milestone';
  strong: string;
  lemma: string;
  morph: string;
  occurrence: string;
  occurrences: string;
  content: string;
  children: (USFMWordObject | USFMTextObject)[];
  endTag: string;
}

// NEW: Paragraph marker objects
export interface USFMParagraphObject {
  tag: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  type: 'paragraph' | 'quote';
  nextChar?: string;
}

export type USFMVerseObject = USFMAlignmentObject | USFMTextObject | USFMWordObject | USFMParagraphObject;

export interface USFMVerse {
  verseObjects: USFMVerseObject[];
}

export interface USFMChapter {
  [verseNumber: string]: USFMVerse;
}

export interface USFMChapters {
  [chapterNumber: string]: USFMChapter;
}

export interface USFMDocument {
  headers: USFMHeader[];
  chapters: USFMChapters;
}

// NEW: Paragraph-centric data structure
export interface Paragraph {
  id: string; // e.g., "chapter-1-paragraph-1"
  type: 'paragraph' | 'quote';
  style: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  indentLevel: number; // For poetry (q, q1, q2, etc.)
  startVerse: number; // First verse number in paragraph
  endVerse: number; // Last verse number in paragraph
  verseCount: number; // Number of verses in this paragraph
  verseNumbers: number[]; // Array of verse numbers for quick lookup
  combinedText: string; // All verse text joined together for paragraph-level rendering
  verses: CleanVerse[]; // All verses in this paragraph
}

// Simplified verse structure with cross-references
export interface CleanVerse {
  number: number;
  text: string;
  reference: string; // e.g., "JON 1:3"
  paragraphId?: string; // Cross-reference to paragraph
  sectionId?: string; // Cross-reference to section
  hasSectionMarker?: boolean; // indicates if verse has a \ts\* marker
  sectionMarkers?: number; // count of section markers in this verse
}

export interface CleanChapter {
  number: number;
  verseCount: number; // Number of verses in this chapter
  paragraphCount: number; // Number of paragraphs in this chapter
  verses: CleanVerse[]; // Keep for backward compatibility
  paragraphs: Paragraph[]; // NEW: paragraph-based structure
}

// NEW: Translation section interfaces
export interface TranslationSection {
  id: string; // e.g., "section-1"
  startReference: string; // e.g., "JON 1:3"
  startChapter: number;
  startVerse: number;
  endReference: string | null; // e.g., "JON 1:5"
  endChapter: number | null;
  endVerse: number | null;
  title: string; // e.g., "Section 1"
  description?: string; // Optional description
}

// Metadata for scripture processing
export interface ScriptureMetadata {
  totalChapters: number;
  totalVerses: number;
  totalParagraphs: number;
  processingDate: string; // ISO date string
  version: string;
}

export interface CleanScripture {
  book: string;
  bookCode: string; // e.g., "JON"
  metadata: ScriptureMetadata; // NEW: processing metadata
  chapters: CleanChapter[];
  sections?: TranslationSection[]; // NEW: section information
}

// Scripture reference parsing
export interface ScriptureReference {
  book: string;
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  displayReference: string; // e.g., "JON 1:3-5"
}

// NEW: Section reference for navigation
export interface SectionReference {
  sectionId: string;
  section: TranslationSection;
  displayReference: string; // e.g., "Section 1 (JON 1:3-5)"
}

// NEW: Navigation result that can be either verse-based or section-based
export type NavigationTarget = ScriptureReference | SectionReference;

// NEW: Enhanced verse with section context
export interface VerseWithSection extends CleanVerse {
  sectionId?: string;
  isFirstInSection?: boolean;
  isLastInSection?: boolean;
} 