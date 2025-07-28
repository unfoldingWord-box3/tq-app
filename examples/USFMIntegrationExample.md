# USFM Integration Example

This example shows how to integrate USFM (Unified Standard Format Markers) processing into your React Native app using the `usfm-js` library.

## Overview

The integration consists of:
1. **USFMProcessor** - Utility class for converting USFM to React-friendly data
2. **ScriptureRendererUSFM** - React component for rendering processed scripture
3. **Test files** - Comprehensive tests demonstrating usage

## Installation

```bash
pnpm add usfm-js
pnpm add -D jest
```

## Basic Usage

### 1. Processing USFM Data

```javascript
const USFMProcessor = require('./components/USFMProcessor');
const fs = require('fs');

// Read USFM file
const usfmContent = fs.readFileSync('path/to/your/file.usfm', 'utf8');

// Process for React
const scriptureData = USFMProcessor.processUSFM(usfmContent, 'Jonah');

console.log(scriptureData);
// Output:
// {
//   book: 'Jonah',
//   chapters: [
//     {
//       number: 1,
//       verses: [
//         { number: 1, text: 'And the word of Yahweh came...', raw: '...' },
//         { number: 2, text: 'Get up, go to Nineveh...', raw: '...' }
//       ],
//       verseCount: 21
//     },
//     // ... more chapters
//   ],
//   chapterCount: 4,
//   totalVerses: 48
// }
```

### 2. Using in React Component

```tsx
import React, { useState, useEffect } from 'react';
import { ScriptureRendererUSFM } from '@/components/ScriptureRendererUSFM';

export default function BibleScreen() {
  const [scriptureData, setScriptureData] = useState(null);
  const [selectedVerseRange, setSelectedVerseRange] = useState('1-3');

  useEffect(() => {
    // Load and process USFM data
    const loadScripture = async () => {
      // In a real app, you might load this from a file or API
      const processedData = USFMProcessor.processUSFM(usfmContent, 'Jonah');
      
      // Convert to format expected by ScriptureRendererUSFM
      const chapter1Data = {
        book: processedData.book,
        chapter: 1,
        verses: processedData.chapters[0]?.verses || []
      };
      
      setScriptureData(chapter1Data);
    };

    loadScripture();
  }, []);

  if (!scriptureData) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScriptureRendererUSFM
      scriptureData={scriptureData}
      verseRange={selectedVerseRange}
      showVerseNumbers={true}
      highlightVerses={[3]} // Highlight verse 3
    />
  );
}
```

### 3. Integration with Existing Community Screen

Here's how to modify your existing `community.tsx` to use real USFM data:

```tsx
// In your community.tsx file

import USFMProcessor from '@/components/USFMProcessor';
import jonahUSFM from '@/assets/data/JON.usfm'; // You'd need to import the USFM file

export default function CommunityScreen() {
  const [scriptureData, setScriptureData] = useState(null);
  const [selectedVerseRange, setSelectedVerseRange] = useState('3');
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(3);

  useEffect(() => {
    // Process the USFM data
    const processedData = USFMProcessor.processUSFM(jonahUSFM, 'Jonah');
    
    // Get chapter 3 data
    const chapter3 = processedData.chapters.find(ch => ch.number === 3);
    if (chapter3) {
      setScriptureData({
        book: 'Jonah',
        chapter: 3,
        verses: chapter3.verses
      });
    }
  }, []);

  // Your existing component code...
  
  // In the ScriptureRenderer section:
  {scriptureData && (
    <ScriptureRendererUSFM 
      scriptureData={scriptureData}
      verseRange={selectedVerseRange}
      showVerseNumbers={true}
      style={styles.scriptureRenderer}
    />
  )}
}
```

## Utility Functions

### Getting Specific Verses

```javascript
// Get a single verse
const verse = USFMProcessor.getVerse(processedData, 1, 3); // Chapter 1, Verse 3

// Get a range of verses
const verses = USFMProcessor.getVerseRange(processedData, 1, '1-3'); // Chapter 1, Verses 1-3

// Format verses for display
const formattedText = USFMProcessor.formatVerses(verses, true); // With verse numbers
```

### Cleaning Raw USFM Text

```javascript
const rawText = '\\zaln-s |x-strong="H3068"\\*\\w Yahweh|x-occurrence="1"\\w*\\zaln-e\\*';
const cleanText = USFMProcessor.cleanVerseText(rawText);
// Result: "Yahweh"
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run only USFM tests
pnpm test:usfm

# Run tests with verbose output
pnpm test -- --verbose
```

## Test Examples

The test files demonstrate:

1. **Basic USFM to JSON conversion**
2. **Text cleaning and processing**
3. **Verse range extraction**
4. **Integration with React components**
5. **Data structure validation**

### Key Test Cases

```javascript
// Test verse range functionality (matches your community screen)
const ranges = ['1-2', '3', '5-7', '8'];
ranges.forEach(range => {
  const verses = USFMProcessor.getVerseRange(processedData, 1, range);
  console.log(`Jonah 1:${range}:`, USFMProcessor.formatVerses(verses));
});

// Test React component integration
const scriptureData = {
  book: 'Jonah',
  chapter: 1,
  verses: USFMProcessor.getVerseRange(processedData, 1, '3')
};
```

## File Structure

```
qa-app/
├── components/
│   ├── USFMProcessor.js          # Main utility class
│   ├── ScriptureRendererUSFM.tsx # React component
│   └── ScriptureRenderer.tsx     # Your existing component
├── tests/
│   ├── fixtures/
│   │   └── JON.usfm             # Sample USFM file
│   ├── usfm-conversion.test.js   # Basic conversion tests
│   └── usfm-processor.test.js    # Utility class tests
└── examples/
    └── USFMIntegrationExample.md # This file
```

## Next Steps

1. **Convert USFMProcessor to TypeScript** for better type safety
2. **Add error handling** for malformed USFM files
3. **Implement caching** for processed data
4. **Add support for** cross-references, footnotes, and other USFM features
5. **Create a hook** (`useUSFM`) for easier React integration

## Benefits

- **Clean separation** between USFM processing and React rendering
- **Flexible verse selection** supporting ranges like "1-3", "5", etc.
- **Optimized for mobile** with clean, readable text extraction
- **Comprehensive testing** ensures reliability
- **Easy integration** with existing components 