# Bible Translation Community Checking App - Design Plan

## 🎯 **Core Mission**

Create a **language-agnostic Bible translation quality assurance app** that enables community members to review translations and record feedback using **universal icons and gestures** instead of text labels.

## 🌍 **Design Philosophy: Universal Language**

### **Principles:**

1. **Icons First** - Every action represented by universally understood symbols
2. **Color Communication** - States conveyed through color (green=complete, blue=active, gray=inactive)
3. **Gestural Interface** - Tap, long-press, swipe actions instead of buttons with text
4. **Progressive Disclosure** - Show only essential elements, reveal details on demand
5. **Visual Feedback** - Animations, progress bars, and state changes instead of status text

---

## 📱 **App Architecture**

### **Navigation Flow:**

```
Launch → Project Setup → Project Dashboard → Session → Community Checking → Review
```

### **Core Screens:**

1. **Project Setup** - Select scripture + questions from Door43, then book (NEW - minimal text)
2. **Project Dashboard** - Visual project cards, create sessions (NEW - language-agnostic)
3. **Community Checking** - EXISTING interface (keep current community.tsx)
4. **Session Review** - Compare recorded answers with correct answers (NEW - minimal text)

---

## 🎨 **Language-Agnostic UI Design**

### **Universal Icon System:**

| Function | Icon | Visual State |
|----------|------|--------------|
| **Audio Play** | ▶️ | Blue when active |
| **Audio Pause** | ⏸️ | Blue when active |
| **Record Answer** | 🎤 | Red dot when recording, Green when complete |
| **Bookmark** | 🔖 | Gold when saved |
| **Navigate Back** | ← | Gray/Blue |
| **Scripture Reference** | 📖 | Shows chapter:verse visually |
| **Progress** | ⭕ | Circular progress ring |
| **Session Start** | ▶️ | Large play button |
| **Session End** | ✅ | Green checkmark |
| **Question Expand** | ⬇️/⬆️ | Arrow direction shows state |

### **Color Language:**

- **🔵 Blue**: Active, Selected, Primary Actions
- **🟢 Green**: Complete, Success, Recorded
- **🔴 Red**: Recording, Alert, Important
- **🟡 Yellow**: Bookmarked, Highlighted
- **⚫ Gray**: Inactive, Disabled, Secondary
- **⚪ White**: Background, Clean space

### **Gestural Actions:**

- **Single Tap**: Select, Play, Expand
- **Long Press**: Context menu, Additional options
- **Swipe Left/Right**: Navigate verses/chapters
- **Swipe Up/Down**: Scroll content
- **Pinch**: Zoom text (accessibility)

---

## 📖 **Screen-by-Screen Design**

### **1. Project Setup**

```
┌─────────────────────────────┐
│  [←] [➕]                   │  ← Back, New Project
│                             │
│  📖 Scripture:              │  ← Scripture resource selection
│  ◯ ULT  ◯ UST  ●TQ          │  ← Radio buttons for Door43 resources
│                             │
│  ❓ Questions:              │  ← Questions resource selection  
│  ◯ en_tq  ●es_tq  ◯fr_tq    │  ← Radio buttons for TQ languages
│                             │
│  📚 Book:                   │  ← Book selection
│  GEN EXO LEV JON MAT MRK    │  ← Simple grid, selected = JON
│                             │
│  [✅] Create Project         │  ← Create button (enabled when all selected)
└─────────────────────────────┘
```

### **2. Project Dashboard**

```
┌─────────────────────────────┐
│  [⚙️]               [➕]    │  ← Settings, New Project
│                             │
│  JON Project                │  ← Current project
│  📊 3 sessions             │  ← Session count
│  [▶️] New Session           │  ← Start new session
│                             │
│  📋 Recent Sessions:        │  ← Session history
│  ⭕ Session 1 [👁️]          │  ← Progress ring + review icon
│  ⭕ Session 2 [👁️]          │  ← View session details
│  ◯ Session 3 [🎤]          │  ← In progress (recording icon)
└─────────────────────────────┘
```

### **3. Community Checking Interface (Main Screen)**

**🔄 KEEP EXISTING UI** - Use current `community.tsx` screen as-is.

The existing community checking screen already provides:

- ✅ Split-screen scripture + questions layout
- ✅ Audio player controls  
- ✅ Question recording and bookmarking
- ✅ Verse navigation and reference display
- ✅ Session management
- ✅ Expandable question details
- ✅ Progress tracking

No changes needed - this interface is already functional and well-designed.

### **4. Question Detail (Expanded)**

```
┌─────────────────────────────┐
│ ❓ [What does "beginning"   │  ← Question icon + text
│    mean in this context?]   │
│                             │
│ ⬇️ [Tap to see answer]      │  ← Down arrow = expandable
│                             │
│ 🎤 [●]                      │  ← Mic with record button
│   [Record your answer]      │
│                             │
│ 🔖 [Bookmark this]          │  ← Bookmark option
│                             │
│ [JON 1:1]                   │  ← Reference tag with book code
└─────────────────────────────┘
```

### **4. Session Review**

```
┌─────────────────────────────┐
│  [←]    Session 1    [📊]   │  ← Back, Session name, Stats
│                             │
│  Question 1: JON 1:1        │  ← Question reference
│  🎤 [▶️] ←→ 📝 Correct      │  ← Audio playback ↔ correct answer
│  ✅ Translation understood  │  ← Mark understanding
│                             │
│  Question 2: JON 1:2        │  
│  🎤 [▶️] ←→ 📝 Correct      │  
│  ❌ Translation unclear     │  ← Mark needs work
│                             │
│  📊 Summary: 8/10 ✅        │  ← Overall session results
│  [💾] Save Review           │  ← Save assessment
└─────────────────────────────┘
```

---

## 🌐 **Door43 Integration Architecture**

### **Offline-First Strategy:**

```tsx
// Resource Discovery & Download Flow
1. App Launch → Check Catalog API → Compare local resources
2. Download Missing → Store in SQLite + FileSystem → Update cache
3. Offline Mode → Use local resources → Queue sync operations
4. Connectivity Return → Upload pending data → Download updates
```

### **Resource Storage Structure:**

```
app_data/
├── database/
│   ├── resources.db          // Resource metadata & relationships
│   ├── projects.db           // User projects & sessions
│   └── sync_queue.db         // Pending uploads & conflicts
├── resources/
│   ├── en_ult/               // ULT scripture files
│   │   ├── manifest.yaml
│   │   └── books/
│   │       ├── 32-JON.usfm
│   │       └── alignment/
│   ├── en_tq/                // Translation Questions
│   │   ├── manifest.yaml
│   │   └── books/
│   │       └── 32-JON.tsv
│   └── cache/
│       └── catalog.json      // Cached catalog data
└── user_data/
    ├── recordings/           // Local audio files
    ├── projects/             // Project-specific data
    └── backups/              // Auto-backup files
```

### **Sync Strategy:**

```tsx
interface SyncManager {
  // Download resources when online
  downloadResource(resourceId: string): Promise<ResourceContainer>;
  
  // Queue operations when offline
  queueUpload(type: 'session' | 'recording', data: any): void;
  
  // Process queue when online
  processSyncQueue(): Promise<SyncResult[]>;
  
  // Handle conflicts
  resolveConflict(conflict: SyncConflict): Promise<Resolution>;
  
  // Monitor connectivity
  onConnectivityChange(isOnline: boolean): void;
}
```

### **Door43 API Integration:**

```tsx
// Catalog API for resource discovery
const CATALOG_API = 'https://git.door43.org/api/v1/catalog';

// Resource download pattern
const RESOURCE_URL = 'https://git.door43.org/{owner}/{repo}/archive/{branch}.zip';

// Example: Download English ULT
const ULT_URL = 'https://git.door43.org/unfoldingWord/en_ult/archive/master.zip';
const TQ_URL = 'https://git.door43.org/unfoldingWord/en_tq/archive/master.zip';
```

---

## 🔧 **Technical Implementation**

### **Icon-Driven Components:**

#### **1. IconButton Component**

```tsx
interface IconButtonProps {
  icon: 'play' | 'mic' | 'bookmark' | 'back' | 'expand';
  state: 'inactive' | 'active' | 'complete' | 'recording';
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}
```

#### **2. ProgressRing Component**

```tsx
interface ProgressRingProps {
  progress: number; // 0-1
  size: number;
  color: string;
  children?: ReactNode; // Content inside ring
}
```

#### **3. StateIndicator Component**

```tsx
interface StateIndicatorProps {
  type: 'recording' | 'complete' | 'active' | 'inactive';
  animated?: boolean;
}
```

### **Gesture System:**

```tsx
// Swipe navigation for verses
const handleSwipe = {
  left: () => nextVerse(),
  right: () => previousVerse(),
  up: () => nextChapter(),
  down: () => previousChapter()
};

// Long press for context
const handleLongPress = {
  question: () => showContextMenu(),
  verse: () => showVerseOptions(),
  audio: () => showAudioOptions()
};
```

### **Visual Feedback System:**

```tsx
// Haptic feedback for interactions
const hapticFeedback = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
};

// Animation states
const animations = {
  recordingPulse: useSharedValue(0),
  progressRing: useSharedValue(0),
  questionExpand: useSharedValue(0)
};
```

---

## 🌐 **Accessibility & Global Features**

### **Language Independence:**

- **No text labels** on primary actions
- **Visual progress indicators** instead of status text
- **Color + shape** combinations (not just color) for accessibility
- **Icon tooltips** only for advanced users (optional)

### **Cultural Adaptability:**

- **RTL support** for Arabic, Hebrew texts
- **Scalable text** for different language lengths
- **Flexible layouts** that work with any script direction

### **Accessibility:**

- **VoiceOver/TalkBack** support with descriptive labels (but not visible)
- **High contrast** mode support
- **Large touch targets** (minimum 44pt)
- **Voice control** compatibility

---

## 📊 **Data Flow & State Management**

### **Door43 Integration & Offline Storage:**

Based on the [unfoldingWord developer guide](https://raw.githubusercontent.com/unfoldingWord/uW-Tools-Collab/refs/heads/main/unfoldingword-developer-guide.md), our app integrates with the Door43 Content Service for **offline-first** Bible translation resources.

**Key Integration Points:**

- **Catalog API**: `https://git.door43.org/api/v1/catalog` for resource discovery
- **Repository API**: Download Resource Containers (RC) for offline use
- **Resource Types**: USFM (scripture), TSV (questions), Markdown (notes)
- **Offline Storage**: Local SQLite + file system for resources and user data

### **Core Data Types:**

```tsx
// Door43 Resource Container Types
interface ResourceContainer {
  id: string;
  name: string;
  type: 'bundle' | 'book' | 'help';
  format: 'usfm' | 'tsv' | 'md';
  language: string;
  version: string;
  manifest: RCManifest;
  localPath?: string; // Offline storage path
  lastSync?: Date;
  isDownloaded: boolean;
}

interface RCManifest {
  dublin_core: {
    identifier: string;
    language: { identifier: string; title: string; };
    subject: string;
    type: string;
    format: string;
  };
  projects: Array<{
    identifier: string;
    title: string;
    path: string;
    categories: string[];
  }>;
}

// App-specific Data Types
interface Project {
  id: string;
  bookCode: string;
  scriptureResource: ResourceContainer; // ULT/UST resource
  questionsResource: ResourceContainer; // TQ resource
  sessions: Session[];
  createdDate: Date;
  lastSync?: Date;
}

interface Session {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  recordings: Recording[];
  bookmarks: string[];
  currentReference: string;
  isReviewed: boolean;
  reviewResults?: ReviewResult[];
  syncStatus: 'local' | 'synced' | 'pending';
}

interface Recording {
  questionId: string;
  audioFile: string; // Local file path
  timestamp: Date;
  reference: string;
  duration?: number;
  syncStatus: 'local' | 'synced' | 'pending';
}

interface ReviewResult {
  questionId: string;
  translationUnderstood: boolean; // true = ✅, false = ❌
  notes?: string;
  reviewedAt: Date;
  syncStatus: 'local' | 'synced' | 'pending';
}

// Offline Storage Management
interface OfflineStore {
  resources: ResourceContainer[];
  projects: Project[];
  sessions: Session[];
  lastCatalogSync: Date;
  pendingUploads: Array<{
    type: 'recording' | 'review' | 'session';
    data: any;
    attempts: number;
  }>;
}
```

### **State Management:**

- **Resource State**: Downloaded Door43 resources, sync status, cache management
- **Project State**: Active project, progress tracking, offline data
- **Session State**: Current session, recordings, bookmarks, sync queue
- **UI State**: Panel modes, expanded questions, audio playback, connectivity status
- **Navigation State**: Current reference, verse selection
- **Sync State**: Pending uploads, download progress, conflict resolution

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Core Interface (Week 1)**

- [ ] Create IconButton system
- [ ] Build ProgressRing component
- [ ] Implement basic gesture navigation
- [ ] Design color system and states

### **Phase 2: Door43 Integration & Offline Storage (Week 2)**

- [ ] Implement Door43 Catalog API integration
- [ ] Build resource download and caching system
- [ ] Create offline SQLite database schema
- [ ] Build project setup screen with Door43 resource selection
- [ ] Implement resource synchronization logic
- [ ] Add connectivity monitoring and offline indicators

### **Phase 3: Session Management & Review (Week 3)**

- [ ] Build project dashboard with session management
- [ ] Integrate existing community.tsx for sessions
- [ ] Create session review interface with offline comparison
- [ ] Implement local audio recording and storage
- [ ] Build sync queue for uploading session data
- [ ] Add conflict resolution for concurrent edits

### **Phase 4: Polish & Testing (Week 4)**

- [ ] Add haptic feedback
- [ ] Implement smooth animations
- [ ] Test with non-English speakers
- [ ] Optimize for different screen sizes

---

## ✅ **Success Metrics**

### **Usability Goals:**

- [ ] **5-second rule**: New users can start a session within 5 seconds
- [ ] **Zero text reading**: All primary actions doable without reading text
- [ ] **Universal understanding**: 90%+ comprehension across cultures
- [ ] **Gesture discovery**: Primary gestures discoverable within 30 seconds

### **Technical Goals:**

- [ ] **Offline-first**: Works without internet connection
- [ ] **Fast sync**: Quick data synchronization when online
- [ ] **Battery efficient**: Minimal battery drain during sessions
- [ ] **Accessible**: Full VoiceOver/TalkBack support

---

## 🎯 **Next Steps**

1. **Create TODO list** based on this plan
2. **Start with IconButton system** - foundation for everything
3. **Build ProgressRing component** - visual progress tracking
4. **Implement gesture handlers** - core interaction model
5. **Design main interface** - split-screen with visual states

This plan creates a **truly universal app** that transcends language barriers while maintaining the sophisticated functionality needed for Bible translation quality assurance.
