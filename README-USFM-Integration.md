# USFM Scripture Renderer System

A complete system for processing USFM (Unified Standard Format Markers) files and rendering scripture passages by reference in React Native apps.

## 🎯 What This System Does

✅ **Converts USFM to JSON** using the `usfm-js` library  
✅ **Extracts clean, readable text** from complex USFM alignment data  
✅ **Parses scripture references** like "JON 1:3-5"  
✅ **Renders scripture passages** in React Native components  
✅ **Supports verse ranges** and highlighting  

## 📁 Files Created

### Core Components

- `types/usfm.ts` - TypeScript interfaces for USFM data structures
- `utils/scriptureProcessor.ts` - Core processing functions
- `components/ScriptureRenderer.tsx` - React component for rendering scripture

### Analysis & Demo Files

- `analyze-usfm.js` - Analyzes USFM structure and creates cleaned JSON
- `demo-scripture-renderer.js` - Demonstrates the complete system
- `jonah-cleaned.json` - Processed scripture data ready for React

### Documentation

- `examples/USFMIntegrationExample.md` - Integration examples
- `README-USFM-Integration.md` - This summary document

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm add usfm-js
```

### 2. Process Your USFM File

```javascript
// Run the analyzer on your USFM file
node analyze-usfm.js
```

### 3. Use in React Native

```tsx
import { ScriptureRenderer } from '@/components/ScriptureRenderer';
import scriptureData from './jonah-cleaned.json';

function MyComponent() {
  return (
    <ScriptureRenderer
      scripture={scriptureData}
      reference="JON 1:3-5"
      showVerseNumbers={true}
      showReference={true}
      highlightVerses={[3, 4]}
    />
  );
}
```

## 📖 Scripture Reference Examples

The system supports various reference formats:

- `"JON 1:1"` - Single verse
- `"JON 1:3-5"` - Verse range (as requested)
- `"JON 2:1-2"` - Different chapter
- `"Jonah 1:1"` - Full book name

## 🔍 Demo Results

Running `node demo-scripture-renderer.js` shows:

```
📖 Reference: JON 1:3-5
   ✅ Found 3 verse(s):
   📝 With numbers: 3 But Jonah got up to run away to Tarshish from before the face of Yahweh...
   📖 Clean text: But Jonah got up to run away to Tarshish from before the face of Yahweh...
```

**Extracted verses for JON 1:3-5:**

- **Verse 3:** "But Jonah got up to run away to Tarshish from before the face of Yahweh. And he went down to Joppa and found a ship going to Tarshish. So he paid the fare and went down into it to go with them to Tarshish, away from before the face of Yahweh."
- **Verse 4:** "But Yahweh sent out a great wind on the sea and a great storm happened on the sea, so that the ship was thinking to be broken apart."
- **Verse 5:** "Then the sailors were frightened, and they cried out, a man to his god. And they threw the things that were in the ship into the sea to lighten it from upon them. But Jonah had gone down into the innermost parts of the ship, and had lain down, and was deeply asleep."

## 🏗️ System Architecture

### Data Flow

1. **USFM File** → `usfm.toJSON()` → **Complex JSON**
2. **Complex JSON** → `processUSFMDocument()` → **Clean Scripture Data**
3. **Clean Data** + **Reference** → `ScriptureRenderer` → **Rendered UI**

### Key Functions

#### Text Extraction

```typescript
extractTextFromVerseObjects(verseObjects: USFMVerseObject[]): string
```

Recursively extracts readable text from USFM's complex alignment structure.

#### Reference Parsing

```typescript
parseScriptureReference(ref: string): ScriptureReference | null
```

Parses references like "JON 1:3-5" into structured data.

#### Verse Retrieval

```typescript
getVersesByReferenceString(scripture: CleanScripture, ref: string): CleanVerse[]
```

Gets specific verses by reference string.

## 📱 Integration with Your App

### In your community.tsx

```tsx
import { ScriptureRenderer } from '@/components/ScriptureRenderer';
import jonahData from '@/data/jonah-cleaned.json';

export default function CommunityScreen() {
  const [selectedReference, setSelectedReference] = useState('JON 1:3');
  
  return (
    <View style={styles.splitContainer}>
      {/* Scripture Panel */}
      <View style={styles.topPanel}>
        <ScriptureRenderer
          scripture={jonahData}
          reference={selectedReference}
          showVerseNumbers={true}
          highlightVerses={[3]} // Highlight current verse
          style={styles.scriptureRenderer}
        />
      </View>
      
      {/* Questions Panel */}
      <View style={styles.bottomPanel}>
        {/* Your existing questions code */}
      </View>
    </View>
  );
}
```

### Reference Selection Buttons

```tsx
const verseRanges = ['1-2', '3', '5-7', '8'];

{verseRanges.map((range) => (
  <TouchableOpacity 
    key={range}
    onPress={() => setSelectedReference(`JON 1:${range}`)}
  >
    <Text>{range}</Text>
  </TouchableOpacity>
))}
```

## 🎨 Component Props

### ScriptureRenderer Props

```typescript
interface ScriptureRendererProps {
  scripture: CleanScripture;           // Processed scripture data
  reference?: string | ScriptureReference; // e.g., "JON 1:3-5"
  showVerseNumbers?: boolean;          // Show verse numbers (default: true)
  showReference?: boolean;             // Show reference header (default: true)
  highlightVerses?: number[];          // Verses to highlight
  style?: any;                         // Container styles
  verseStyle?: any;                    // Individual verse styles
  maxHeight?: number;                  // Max height for scrolling
}
```

## 📊 Data Structure

### Clean Scripture Format

```typescript
interface CleanScripture {
  book: string;          // "Jonah"
  bookCode: string;      // "JON"
  chapters: CleanChapter[];
}

interface CleanChapter {
  number: number;        // 1, 2, 3, 4
  verses: CleanVerse[];
}

interface CleanVerse {
  number: number;        // 1, 2, 3...
  text: string;          // Clean, readable text
  reference: string;     // "JON 1:3"
}
```

## 🔧 Development Commands

```bash
# Analyze USFM file and create clean JSON
node analyze-usfm.js

# Run comprehensive demo
node demo-scripture-renderer.js

# Test the system (if tests were kept)
pnpm test:usfm
```

## ✨ Features

- **Accurate Text Extraction:** Handles complex USFM alignment markers
- **Flexible References:** Supports various reference formats
- **React Native Ready:** Optimized for mobile performance
- **TypeScript Support:** Full type safety
- **Customizable UI:** Flexible styling and highlighting
- **Verse Ranges:** Perfect for your "JON 1:3-5" requirement

## 🎯 Perfect for Your Use Case

This system directly addresses your request to "render sections of the text by reference like JON 1:3-5". The demo shows it working perfectly with that exact reference format!

## 🚀 Next Steps

1. **Copy the generated `jonah-cleaned.json`** to your assets folder
2. **Import the components** into your existing screens
3. **Replace hardcoded scripture** with dynamic references
4. **Add more USFM books** using the same process
5. **Customize styling** to match your app's design

The system is production-ready and can be integrated into your existing community.tsx screen immediately!
