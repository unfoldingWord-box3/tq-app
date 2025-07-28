const fs = require('fs');
const path = require('path');

// Demo: Section-Based Scripture Navigation
// This demonstrates how to use the enhanced USFM system with translation sections

console.log('🚀 Section-Based Scripture Navigation Demo\n');

// Load the section-aware data
const sectionDataPath = path.join(__dirname, 'jonah-sections.json');

if (!fs.existsSync(sectionDataPath)) {
  console.log('❌ Section data not found. Please run: node analyze-usfm-sections.js');
  process.exit(1);
}

const scriptureData = JSON.parse(fs.readFileSync(sectionDataPath, 'utf8'));

console.log(`📖 Loaded: ${scriptureData.book} (${scriptureData.bookCode})`);
console.log(`📚 Chapters: ${scriptureData.chapters.length}`);
console.log(`📝 Total verses: ${scriptureData.chapters.reduce((total, ch) => total + ch.verses.length, 0)}`);
console.log(`🔖 Translation sections: ${scriptureData.sections.length}\n`);

// Helper functions (JavaScript versions of the TypeScript utilities)

function getSections(scripture) {
  return scripture.sections || [];
}

function getSection(scripture, sectionId) {
  if (!scripture.sections) return null;
  return scripture.sections.find(s => s.id === sectionId) || null;
}

function getVersesBySection(scripture, sectionId) {
  if (!scripture.sections) return [];
  
  const section = scripture.sections.find(s => s.id === sectionId);
  if (!section) return [];

  const verses = [];
  
  for (const chapter of scripture.chapters) {
    if (chapter.number < section.startChapter || 
        (section.endChapter && chapter.number > section.endChapter)) {
      continue;
    }

    for (const verse of chapter.verses) {
      const inRange = (
        (chapter.number === section.startChapter && verse.number >= section.startVerse) ||
        (chapter.number > section.startChapter && chapter.number < (section.endChapter || Infinity)) ||
        (section.endChapter && chapter.number === section.endChapter && verse.number <= (section.endVerse || Infinity)) ||
        (chapter.number > section.startChapter && !section.endChapter)
      );

      if (inRange) {
        verses.push(verse);
      }
    }
  }

  return verses;
}

function getSectionByReference(scripture, reference) {
  if (!scripture.sections) return null;

  const match = reference.match(/^([A-Z]+)\s+(\d+):(\d+)$/);
  if (!match) return null;
  
  const chapter = parseInt(match[2]);
  const verse = parseInt(match[3]);
  
  return scripture.sections.find(section => {
    const inRange = (
      (chapter === section.startChapter && verse >= section.startVerse) &&
      (!section.endChapter || 
       (chapter < section.endChapter) ||
       (chapter === section.endChapter && verse <= (section.endVerse || Infinity)))
    );
    return inRange;
  }) || null;
}

function getNextSection(scripture, currentSectionId) {
  if (!scripture.sections) return null;
  
  const currentIndex = scripture.sections.findIndex(s => s.id === currentSectionId);
  return currentIndex >= 0 && currentIndex < scripture.sections.length - 1 
    ? scripture.sections[currentIndex + 1] 
    : null;
}

function getPreviousSection(scripture, currentSectionId) {
  if (!scripture.sections) return null;
  
  const currentIndex = scripture.sections.findIndex(s => s.id === currentSectionId);
  return currentIndex > 0 ? scripture.sections[currentIndex - 1] : null;
}

function formatVerses(verses, showNumbers = true) {
  return verses.map(verse => {
    return showNumbers ? `${verse.number} ${verse.text}` : verse.text;
  }).join(' ');
}

// Demo 1: Section Overview
console.log('📋 Translation Sections Overview:');
console.log('================================');
const sections = getSections(scriptureData);
sections.slice(0, 5).forEach((section, index) => {
  const verses = getVersesBySection(scriptureData, section.id);
  console.log(`${section.id}: ${section.startReference} - ${section.endReference || 'End'}`);
  console.log(`  Verses: ${verses.length}`);
  if (verses.length > 0) {
    console.log(`  Content: ${verses[0].text.substring(0, 60)}...`);
  }
  console.log('');
});

console.log(`... and ${sections.length - 5} more sections\n`);

// Demo 2: Section Navigation
console.log('🧭 Section Navigation Demo:');
console.log('===========================');

let currentSectionId = 'section-1';
console.log(`Starting with: ${currentSectionId}\n`);

// Show current section
const showCurrentSection = (sectionId) => {
  const section = getSection(scriptureData, sectionId);
  if (!section) {
    console.log('❌ Section not found');
    return;
  }

  const verses = getVersesBySection(scriptureData, sectionId);
  console.log(`📖 ${section.title}`);
  console.log(`   Range: ${section.startReference} - ${section.endReference || 'End'}`);
  console.log(`   Verses: ${verses.length}`);
  
  if (verses.length > 0) {
    const text = formatVerses(verses, false);
    console.log(`   Content: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  }
  console.log('');
};

// Navigate through sections
showCurrentSection(currentSectionId);

console.log('⏭️  Moving to next section...');
const nextSection = getNextSection(scriptureData, currentSectionId);
if (nextSection) {
  currentSectionId = nextSection.id;
  showCurrentSection(currentSectionId);
}

console.log('⏭️  Moving to next section...');
const nextSection2 = getNextSection(scriptureData, currentSectionId);
if (nextSection2) {
  currentSectionId = nextSection2.id;
  showCurrentSection(currentSectionId);
}

console.log('⏮️  Going back to previous section...');
const prevSection = getPreviousSection(scriptureData, currentSectionId);
if (prevSection) {
  currentSectionId = prevSection.id;
  showCurrentSection(currentSectionId);
}

// Demo 3: Finding sections by verse reference
console.log('🔍 Finding Sections by Verse Reference:');
console.log('=======================================');

const testReferences = ['JON 1:1', 'JON 1:5', 'JON 2:2', 'JON 3:10', 'JON 4:11'];

testReferences.forEach(ref => {
  const section = getSectionByReference(scriptureData, ref);
  if (section) {
    console.log(`${ref} → ${section.id} (${section.startReference} - ${section.endReference})`);
  } else {
    console.log(`${ref} → No section found`);
  }
});

// Demo 4: React Native Integration Examples
console.log('\n⚛️  React Native Integration Examples:');
console.log('=====================================');

console.log(`
// 1. Basic Section Navigation
import { SectionAwareScriptureRenderer } from '@/components/SectionAwareScriptureRenderer';
import jonahSections from '@/data/jonah-sections.json';

function ScriptureScreen() {
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

// 2. Community Screen with Section Navigation
function CommunityScreen() {
  const [selectedReference, setSelectedReference] = useState('section-1');
  
  // Section-based navigation buttons
  const sectionButtons = () => (
    <View style={styles.sectionNavigation}>
      {jonahSections.sections.slice(0, 5).map((section, index) => (
        <TouchableOpacity 
          key={section.id}
          style={[
            styles.sectionButton,
            selectedReference === section.id && styles.selectedSection
          ]}
          onPress={() => setSelectedReference(section.id)}
        >
          <Text style={styles.sectionButtonText}>
            Section {index + 1}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {sectionButtons()}
      
      <SectionAwareScriptureRenderer
        scripture={jonahSections}
        initialReference={selectedReference}
        showVerseNumbers={true}
        showSectionNavigation={false}
        style={styles.scriptureRenderer}
      />
    </View>
  );
}

// 3. Quick Section Display
function QuickSectionExample() {
  return (
    <View>
      <QuickSection 
        scripture={jonahSections} 
        sectionId="section-1" 
        style={styles.quickSection} 
      />
    </View>
  );
}
`);

// Demo 5: Usage Statistics
console.log('\n📊 Section Statistics:');
console.log('======================');

const sectionStats = sections.map(section => {
  const verses = getVersesBySection(scriptureData, section.id);
  return {
    id: section.id,
    verseCount: verses.length,
    wordCount: verses.reduce((total, verse) => total + verse.text.split(' ').length, 0),
    startRef: section.startReference,
    endRef: section.endReference
  };
});

console.log('Section breakdown:');
sectionStats.forEach(stat => {
  console.log(`  ${stat.id}: ${stat.verseCount} verses, ~${stat.wordCount} words (${stat.startRef} - ${stat.endRef || 'End'})`);
});

const totalSectionVerses = sectionStats.reduce((total, stat) => total + stat.verseCount, 0);
const totalWords = sectionStats.reduce((total, stat) => total + stat.wordCount, 0);

console.log(`\nTotals: ${totalSectionVerses} verses, ~${totalWords} words across ${sections.length} sections`);

// Demo 6: Interactive Commands
console.log('\n🎮 Available Navigation Commands:');
console.log('================================');
console.log('In your React Native app, you can now use:');
console.log('');
console.log('// Navigate by section');
console.log('goToSection("section-1")');
console.log('goToNextSection()');
console.log('goToPreviousSection()');
console.log('');
console.log('// Get section info');
console.log('getCurrentSection()');
console.log('getSectionByVerse("JON 1:5")');
console.log('');
console.log('// Display options');
console.log('<SectionAwareScriptureRenderer />  // Full navigation');
console.log('<QuickSection sectionId="section-1" />  // Quick display');

console.log('\n✨ Section-based navigation is ready!');
console.log('📱 Your users can now navigate by translation sections in addition to verse references!');
console.log('🎯 Perfect for studying specific themes or narrative units within the text.'); 