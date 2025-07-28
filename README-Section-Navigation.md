# USFM Scripture System with Translation Section Navigation

A complete system for processing USFM files and rendering scripture with both **verse-based** and **section-based** navigation, powered by `\ts\*` translation section markers.

## 🎯 What This System Does

✅ **Converts USFM to JSON** using the `usfm-js` library  
✅ **Extracts `\ts\*` section markers** from USFM content  
✅ **Creates section-based navigation** with proper verse ranges  
✅ **Parses scripture references** like "JON 1:3-5"  
✅ **Supports section references** like "section-1"  
✅ **Renders scripture passages** by verse OR section  
✅ **Provides interactive navigation** between sections  

## 🔍 Translation Sections Discovery

### What We Found
Your Jonah USFM file contains **21 translation sections** marked by `\ts\*` markers:

```
📊 Section Overview:
- section-1: JON 1:3 - JON 1:4 (2 verses)
- section-2: JON 1:5 - JON 1:6 (2 verses)  
- section-3: JON 1:7 - JON 1:9 (3 verses)
- section-7: JON 1:17 - JON 2:1 (spans chapters)
- section-21: JON 4:9 - JON 4:11 (3 verses)
- ... and 16 more sections
```

### How Sections Work
- `\ts\*` markers define **translation section boundaries**
- Each section has a **start and end verse range**
- Sections can **span multiple chapters**
- Users can **navigate by section** or by individual verses

## 📁 Complete File Structure

### Core Processing
- `analyze-usfm-sections.js` - **NEW**: Analyzes `\ts\*` markers and creates section data
- `jonah-sections.json` - **NEW**: Section-aware scripture data
- `types/usfm.ts` - **ENHANCED**: Added section interfaces
- `utils/scriptureProcessor.ts` - **ENHANCED**: Added section functions

### React Components  
- `components/SectionAwareScriptureRenderer.tsx` - **NEW**: Full section navigation UI
- `components/ScriptureRenderer.tsx` - Original verse-based renderer
- `components/ScriptureRendererUSFM.tsx` - Basic USFM renderer

### Demos & Documentation
- `demo-section-navigation.js` - **NEW**: Comprehensive section demo
- `demo-scripture-renderer.js` - Original verse demo
- `README-Section-Navigation.md` - This document

## 🚀 Quick Start with Sections

### 1. Generate Section Data
```bash
# First, install dependencies
pnpm add usfm-js

# Generate section-aware data from your USFM
node analyze-usfm-sections.js
```

### 2. Use Section Navigation in React Native
```tsx
import { SectionAwareScriptureRenderer } from '@/components/SectionAwareScriptureRenderer';
import jonahSections from './jonah-sections.json';

function MyScriptureScreen() {
  const [currentSection, setCurrentSection] = useState(null);
  
  return (
    <SectionAwareScriptureRenderer
      scripture={jonahSections}
      initialReference="section-1"
      showSectionNavigation={true}
      showSectionTitle={true}
      onSectionChange={setCurrentSection}
    />
  );
}
```

## 📖 Navigation Options

### Verse-Based Navigation (Original)
```tsx
<ScriptureRenderer
  scripture={scriptureData}
  reference="JON 1:3-5"  // Verse range
  showVerseNumbers={true}
/>
```

### Section-Based Navigation (NEW)
```tsx
<SectionAwareScriptureRenderer
  scripture={scriptureData}
  initialReference="section-1"  // Section ID
  showSectionNavigation={true}
/>
```

### Finding Sections by Verse
```typescript
// Find which section contains a specific verse
const section = getSectionByReference(scripture, "JON 1:5");
// Result: section-2 (JON 1:5 - JON 1:6)

// Get all verses in a section
const verses = getVersesBySection(scripture, "section-1");
```

## 🧭 Section Navigation Features

### Interactive Navigation
- **Previous/Next buttons** to move between sections
- **Section tabs** (1, 2, 3...) for quick jumping
- **Section progress** (Section 1 of 21)
- **Visual section markers** in the text

### Section Information
- **Section title** ("Section 1")
- **Verse range** ("JON 1:3 - JON 1:4")  
- **Section boundaries** clearly marked
- **Cross-chapter sections** supported

### Integration with Your Community Screen
```tsx
function CommunityScreen() {
  const [selectedReference, setSelectedReference] = useState('section-1');
  
  // Section-based navigation buttons
  const sectionButtons = jonahSections.sections.slice(0, 5).map((section, index) => (
    <TouchableOpacity 
      key={section.id}
      style={[
        styles.sectionButton,
        selectedReference === section.id && styles.selectedSection
      ]}
      onPress={() => setSelectedReference(section.id)}
    >
      <Text>Section {index + 1}</Text>
    </TouchableOpacity>
  ));

  return (
    <View style={styles.splitContainer}>
      {/* Section Navigation */}
      <View style={styles.sectionNavigation}>
        {sectionButtons}
      </View>
      
      {/* Scripture Panel */}
      <View style={styles.topPanel}>
        <SectionAwareScriptureRenderer
          scripture={jonahSections}
          initialReference={selectedReference}
          showVerseNumbers={true}
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

## 📊 Section Statistics (Jonah)

Based on the analysis of your JON.usfm file:

- **21 translation sections** identified
- **48 total verses** across 4 chapters  
- **Sections range** from 1 verse to 3 verses typically
- **Some sections span chapters** (e.g., section-7: JON 1:17 - JON 2:1)

```
📈 Section Breakdown:
- Chapter 1: 6 sections (section-1 to section-6)
- Chapter 2: 5 sections (section-7 to section-12) 
- Chapter 3: 5 sections (section-13 to section-17)
- Chapter 4: 4 sections (section-18 to section-21)
```

## 🎨 Component Features

### SectionAwareScriptureRenderer Props
```typescript
interface SectionAwareScriptureRendererProps {
  scripture: CleanScripture;           // Section-aware scripture data
  initialReference?: string;           // "section-1" or "JON 1:3"
  showVerseNumbers?: boolean;          // Show verse numbers
  showSectionNavigation?: boolean;     // Show prev/next buttons  
  showSectionTitle?: boolean;          // Show section title
  highlightVerses?: number[];          // Highlight specific verses
  onSectionChange?: (section) => void; // Navigation callback
}
```

### Navigation Functions
```typescript
// Section navigation
getSections(scripture)                    // Get all sections
getSection(scripture, "section-1")       // Get specific section
getVersesBySection(scripture, "section-1") // Get section verses
getSectionByReference(scripture, "JON 1:5") // Find section containing verse

// Section traversal  
getNextSection(scripture, "section-1")   // Get next section
getPreviousSection(scripture, "section-2") // Get previous section

// Enhanced context
getVersesWithSectionContext(scripture, "section-1") // Verses with section info
```

## 🔧 Development Commands

```bash
# Analyze USFM and create section data
node analyze-usfm-sections.js

# Run section navigation demo
node demo-section-navigation.js

# Run original verse demo  
node demo-scripture-renderer.js

# Run basic USFM analysis
node analyze-usfm.js
```

## ✨ Benefits of Section Navigation

### For Users
- **Logical text units**: Navigate by meaning, not just arbitrary verse ranges
- **Natural flow**: Sections follow translation/narrative boundaries  
- **Easy exploration**: Jump between thematic sections quickly
- **Context preservation**: See complete thoughts/ideas as units

### For Developers  
- **Automatic detection**: `\ts\*` markers are extracted automatically
- **Flexible navigation**: Support both verse and section references
- **Rich metadata**: Section ranges, titles, and boundaries
- **Easy integration**: Drop-in components for existing apps

### For Translation Work
- **Translation boundaries**: Sections mark natural translation units
- **Review workflow**: Navigate by the sections translators worked on
- **Quality assurance**: Check translation consistency within sections
- **Collaboration**: Reference specific sections in discussions

## 🎯 Perfect for Your Use Case

✅ **Your original request**: "render sections of the text by reference like JON 1:3-5" ✓  
✅ **Enhanced capability**: Navigate by translation sections marked with `\ts\*` ✓  
✅ **Real USFM data**: Uses your actual Jonah USFM file ✓  
✅ **React Native ready**: Production-ready components ✓  

## 🚀 Next Steps

1. **Copy `jonah-sections.json`** to your assets folder
2. **Import `SectionAwareScriptureRenderer`** into your screens  
3. **Replace or enhance** existing scripture navigation
4. **Add section buttons** to your community screen
5. **Process more USFM books** using the same system

The system now supports **both navigation paradigms**:
- **Traditional**: "JON 1:3-5" (verse ranges)
- **Enhanced**: "section-1" (translation sections)

Perfect for users who want to study scripture by logical translation units! 🎉 