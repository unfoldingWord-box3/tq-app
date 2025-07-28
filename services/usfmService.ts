
import * as FileSystem from 'expo-file-system';
import { databaseService } from './databaseService';
import { resourceCacheService } from './resourceCacheService';

export interface USFMBook {
  code: string;
  name: string;
  filename: string;
  chapters: number;
}

/**
 * Fetch USFM content for a given book from cached resources
 * Dynamically loads from downloaded resource containers
 */
export async function fetchUSFMContent(bookCode: string): Promise<string> {
  try {
    console.log(`📖 Fetching USFM content for ${bookCode}...`);
    
    // Get scripture resources from database
    const resources = await databaseService.getDownloadedResources();
    const scriptureResources = resources.filter(r => 
      r.subject === 'Bible' || r.subject === 'Aligned Bible'
    );

    if (scriptureResources.length === 0) {
      throw new Error('No scripture resources found. Please download a Bible resource first.');
    }

    // Try to find USFM content in cached resources
    for (const resource of scriptureResources) {
      try {
        const extractedPath = resource.local_path.replace('/downloads/', '/extracted/').replace('.zip', '/');
        console.log(`🔍 Searching USFM for ${bookCode} in: ${resource.name}`);
        
        // Debug: list all files in the resource
        const files = await resourceCacheService.getResourceFiles(resource.id);
        console.log(`📁 Files in ${resource.name}:`, files.slice(0, 10), files.length > 10 ? `... and ${files.length - 10} more` : '');
        
        const usfmContent = await findUSFMInResource(extractedPath, bookCode);
        if (usfmContent) {
          console.log(`✅ Found USFM content for ${bookCode} in resource: ${resource.name}`);
          return usfmContent;
        }
      } catch (error) {
        console.warn(`Failed to load ${bookCode} from resource ${resource.name}:`, error);
        continue;
      }
    }

    // Fallback to static content if available
    if (bookCode === 'JON') {
      console.log('📖 Loading full Jonah USFM content...');
      try {
        const jonahModule = require('../assets/usfm/jonah');
        console.log('Jonah module structure:', Object.keys(jonahModule));
        return jonahModule.default || jonahModule.JONAH_USFM;
      } catch (importError) {
        console.warn('Failed to load full USFM asset, using fallback content:', importError);
        return getJonahUSFMFallback();
      }
    }

    throw new Error(`Book ${bookCode} not found in any cached resources. Available resources: ${scriptureResources.map(r => r.name).join(', ')}`);
  } catch (error) {
    console.error(`Failed to fetch USFM content for ${bookCode}:`, error);
    throw error;
  }
}

/**
 * Find USFM content for a specific book in a resource directory
 */
async function findUSFMInResource(resourcePath: string, bookCode: string): Promise<string | null> {
  try {
    // Check if resource directory exists
    const resourceInfo = await FileSystem.getInfoAsync(resourcePath);
    if (!resourceInfo.exists) {
      return null;
    }

    // Get all files in the resource - extract resource ID from path
    const resourceId = resourcePath.split('/').filter(Boolean).pop() || '';
    const files = await resourceCacheService.getResourceFiles(resourceId);
    
    // Look for USFM files matching the book code - comprehensive search
    const possibleFilenames = [
      // Direct file names
      `${bookCode}.usfm`,
      `${bookCode.toLowerCase()}.usfm`,
      `${bookCode.toUpperCase()}.usfm`,
      // In subdirectories
      `books/${bookCode}.usfm`,
      `books/${bookCode.toLowerCase()}.usfm`,
      `books/${bookCode.toUpperCase()}.usfm`,
      `content/${bookCode}.usfm`,
      `content/${bookCode.toLowerCase()}.usfm`,
      `content/${bookCode.toUpperCase()}.usfm`,
      // Try all USFM files that might contain the book
      ...files.filter(f => f.endsWith('.usfm') && (
        f.includes(bookCode.toLowerCase()) || 
        f.includes(bookCode.toUpperCase()) ||
        f.includes(bookCode)
      )),
    ];

    for (const filename of possibleFilenames) {
      if (files.includes(filename)) {
        const filePath = `${resourcePath}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          if (content.trim()) {
            return content;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`Error searching for USFM in resource:`, error);
    return null;
  }
}

/**
 * Load USFM file from local assets
 * For React Native, we'll use embedded content (no file system access)
 */
async function loadLocalUSFMFile(filename: string): Promise<string> {
  try {
    if (filename === 'JON.usfm') {
      try {
        // For React Native, we return the embedded USFM content
        // In the future, this can be replaced with Expo asset loading or remote fetch
                 console.log('📖 Loading full Jonah USFM content...');
         const jonahModule = require('../assets/usfm/jonah');
         console.log('Jonah module structure:', Object.keys(jonahModule));
         return jonahModule.default || jonahModule.JONAH_USFM;
      } catch (importError) {
        console.warn('Failed to load full USFM asset, using fallback content:', importError);
        return getJonahUSFMFallback();
      }
    }
    
    throw new Error(`USFM file ${filename} not found in assets`);
  } catch (error) {
    console.error('Error loading local USFM file:', error);
    throw error;
  }
}

/**
 * Embedded USFM content for Jonah
 * This is the primary content source for React Native (no file system access)
 * Can be replaced with Expo asset loading or remote fetch in the future
 */
function getJonahUSFMFallback(): string {
  return `\\id JON EN_ULT en_English_ltr Wed Feb 22 2023 09:46:41 GMT-0600 (Central Standard Time) tc
\\usfm 3.0
\\ide UTF-8
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt Jonah

\\ts\\*
\\c 1
\\p
\\v 1 And the word of Yahweh came to Jonah son of Amittai, saying,
\\v 2 "Get up, go to Nineveh, the great city, and call out against it, because their evil has risen up before my face."
\\v 3 But Jonah got up to run away to Tarshish from before the face of Yahweh. And he went down to Joppa and found a ship going to Tarshish. So he paid the fare and went down into it to go with them to Tarshish, away from before the face of Yahweh.

\\ts\\*
\\v 4 But Yahweh sent out a great wind on the sea and a great storm happened on the sea, so that the ship was thinking to be broken apart.
\\v 5 Then the sailors were frightened, and they cried out, a man to his god. And they threw the things that were in the ship into the sea to lighten it from upon them. But Jonah had gone down into the innermost parts of the ship, and had lain down, and was deeply asleep.

\\ts\\*
\\v 6 Then the captain of the crew came to him and said to him, "What to you, sleeping? Get up! Cry out to your god! Maybe that god will notice us, and we will not perish."
\\v 7 And they said, a man to his companion, "Come and let us cast lots so that we may know on whose account this evil is on us." So they cast lots, and the lot fell on Jonah.

\\ts\\*
\\c 2
\\p
\\v 1 And Jonah prayed to Yahweh his God from the stomach of the fish,
\\v 2 and he said, "I called from my distress to Yahweh, and he answered me. From the belly of Sheol I cried out. You heard my voice.

\\ts\\*
\\c 3
\\p
\\v 1 And the word of Yahweh came to Jonah a second time, saying,
\\v 2 "Get up, go to Nineveh, the great city, and call out to it the message that I am speaking to you."

\\ts\\*
\\c 4
\\p
\\v 1 But it was greatly displeasing to Jonah, and he became angry.
\\v 2 And he prayed to Yahweh and said, "Ah, Yahweh, was this not what I said when I was still in my land? That is why I fled quickly to Tarshish, because I knew that you are a gracious God and merciful, slow to anger and abundant in covenant faithfulness, and you relent from calamity.

\\ts\\*
\\v 10 And Yahweh said, "You had pity on the plant, for which you did not labor, and which you did not make grow, which came up in a night and perished in a night.
\\v 11 And should I not have pity on Nineveh, the great city, in which there are more than 120,000 people who do not know the difference between their right hand and their left hand, and also many animals?"`;
}

/**
 * Get book information by code
 * Returns basic info based on common Bible book codes
 */
export function getBookInfo(bookCode: string): USFMBook | null {
  const bookMap: Record<string, USFMBook> = {
    'GEN': { code: 'GEN', name: 'Genesis', filename: 'GEN.usfm', chapters: 50 },
    'EXO': { code: 'EXO', name: 'Exodus', filename: 'EXO.usfm', chapters: 40 },
    'LEV': { code: 'LEV', name: 'Leviticus', filename: 'LEV.usfm', chapters: 27 },
    'NUM': { code: 'NUM', name: 'Numbers', filename: 'NUM.usfm', chapters: 36 },
    'DEU': { code: 'DEU', name: 'Deuteronomy', filename: 'DEU.usfm', chapters: 34 },
    'JOS': { code: 'JOS', name: 'Joshua', filename: 'JOS.usfm', chapters: 24 },
    'JDG': { code: 'JDG', name: 'Judges', filename: 'JDG.usfm', chapters: 21 },
    'RUT': { code: 'RUT', name: 'Ruth', filename: 'RUT.usfm', chapters: 4 },
    '1SA': { code: '1SA', name: '1 Samuel', filename: '1SA.usfm', chapters: 31 },
    '2SA': { code: '2SA', name: '2 Samuel', filename: '2SA.usfm', chapters: 24 },
    '1KI': { code: '1KI', name: '1 Kings', filename: '1KI.usfm', chapters: 22 },
    '2KI': { code: '2KI', name: '2 Kings', filename: '2KI.usfm', chapters: 25 },
    '1CH': { code: '1CH', name: '1 Chronicles', filename: '1CH.usfm', chapters: 29 },
    '2CH': { code: '2CH', name: '2 Chronicles', filename: '2CH.usfm', chapters: 36 },
    'EZR': { code: 'EZR', name: 'Ezra', filename: 'EZR.usfm', chapters: 10 },
    'NEH': { code: 'NEH', name: 'Nehemiah', filename: 'NEH.usfm', chapters: 13 },
    'EST': { code: 'EST', name: 'Esther', filename: 'EST.usfm', chapters: 10 },
    'JOB': { code: 'JOB', name: 'Job', filename: 'JOB.usfm', chapters: 42 },
    'PSA': { code: 'PSA', name: 'Psalms', filename: 'PSA.usfm', chapters: 150 },
    'PRO': { code: 'PRO', name: 'Proverbs', filename: 'PRO.usfm', chapters: 31 },
    'ECC': { code: 'ECC', name: 'Ecclesiastes', filename: 'ECC.usfm', chapters: 12 },
    'SNG': { code: 'SNG', name: 'Song of Songs', filename: 'SNG.usfm', chapters: 8 },
    'ISA': { code: 'ISA', name: 'Isaiah', filename: 'ISA.usfm', chapters: 66 },
    'JER': { code: 'JER', name: 'Jeremiah', filename: 'JER.usfm', chapters: 52 },
    'LAM': { code: 'LAM', name: 'Lamentations', filename: 'LAM.usfm', chapters: 5 },
    'EZK': { code: 'EZK', name: 'Ezekiel', filename: 'EZK.usfm', chapters: 48 },
    'DAN': { code: 'DAN', name: 'Daniel', filename: 'DAN.usfm', chapters: 12 },
    'HOS': { code: 'HOS', name: 'Hosea', filename: 'HOS.usfm', chapters: 14 },
    'JOL': { code: 'JOL', name: 'Joel', filename: 'JOL.usfm', chapters: 3 },
    'AMO': { code: 'AMO', name: 'Amos', filename: 'AMO.usfm', chapters: 9 },
    'OBA': { code: 'OBA', name: 'Obadiah', filename: 'OBA.usfm', chapters: 1 },
    'JON': { code: 'JON', name: 'Jonah', filename: 'JON.usfm', chapters: 4 },
    'MIC': { code: 'MIC', name: 'Micah', filename: 'MIC.usfm', chapters: 7 },
    'NAM': { code: 'NAM', name: 'Nahum', filename: 'NAM.usfm', chapters: 3 },
    'HAB': { code: 'HAB', name: 'Habakkuk', filename: 'HAB.usfm', chapters: 3 },
    'ZEP': { code: 'ZEP', name: 'Zephaniah', filename: 'ZEP.usfm', chapters: 3 },
    'HAG': { code: 'HAG', name: 'Haggai', filename: 'HAG.usfm', chapters: 2 },
    'ZEC': { code: 'ZEC', name: 'Zechariah', filename: 'ZEC.usfm', chapters: 14 },
    'MAL': { code: 'MAL', name: 'Malachi', filename: 'MAL.usfm', chapters: 4 },
    'MAT': { code: 'MAT', name: 'Matthew', filename: 'MAT.usfm', chapters: 28 },
    'MRK': { code: 'MRK', name: 'Mark', filename: 'MRK.usfm', chapters: 16 },
    'LUK': { code: 'LUK', name: 'Luke', filename: 'LUK.usfm', chapters: 24 },
    'JHN': { code: 'JHN', name: 'John', filename: 'JHN.usfm', chapters: 21 },
    'ACT': { code: 'ACT', name: 'Acts', filename: 'ACT.usfm', chapters: 28 },
    'ROM': { code: 'ROM', name: 'Romans', filename: 'ROM.usfm', chapters: 16 },
    '1CO': { code: '1CO', name: '1 Corinthians', filename: '1CO.usfm', chapters: 16 },
    '2CO': { code: '2CO', name: '2 Corinthians', filename: '2CO.usfm', chapters: 13 },
    'GAL': { code: 'GAL', name: 'Galatians', filename: 'GAL.usfm', chapters: 6 },
    'EPH': { code: 'EPH', name: 'Ephesians', filename: 'EPH.usfm', chapters: 6 },
    'PHP': { code: 'PHP', name: 'Philippians', filename: 'PHP.usfm', chapters: 4 },
    'COL': { code: 'COL', name: 'Colossians', filename: 'COL.usfm', chapters: 4 },
    '1TH': { code: '1TH', name: '1 Thessalonians', filename: '1TH.usfm', chapters: 5 },
    '2TH': { code: '2TH', name: '2 Thessalonians', filename: '2TH.usfm', chapters: 3 },
    '1TI': { code: '1TI', name: '1 Timothy', filename: '1TI.usfm', chapters: 6 },
    '2TI': { code: '2TI', name: '2 Timothy', filename: '2TI.usfm', chapters: 4 },
    'TIT': { code: 'TIT', name: 'Titus', filename: 'TIT.usfm', chapters: 3 },
    'PHM': { code: 'PHM', name: 'Philemon', filename: 'PHM.usfm', chapters: 1 },
    'HEB': { code: 'HEB', name: 'Hebrews', filename: 'HEB.usfm', chapters: 13 },
    'JAS': { code: 'JAS', name: 'James', filename: 'JAS.usfm', chapters: 5 },
    '1PE': { code: '1PE', name: '1 Peter', filename: '1PE.usfm', chapters: 5 },
    '2PE': { code: '2PE', name: '2 Peter', filename: '2PE.usfm', chapters: 3 },
    '1JN': { code: '1JN', name: '1 John', filename: '1JN.usfm', chapters: 5 },
    '2JN': { code: '2JN', name: '2 John', filename: '2JN.usfm', chapters: 1 },
    '3JN': { code: '3JN', name: '3 John', filename: '3JN.usfm', chapters: 1 },
    'JUD': { code: 'JUD', name: 'Jude', filename: 'JUD.usfm', chapters: 1 },
    'REV': { code: 'REV', name: 'Revelation', filename: 'REV.usfm', chapters: 22 },
  };
  
  return bookMap[bookCode.toUpperCase()] || null;
}

/**
 * Get all available books from cached scripture resources
 */
export async function getAvailableBooks(): Promise<USFMBook[]> {
  try {
    const resources = await databaseService.getDownloadedResources();
    const scriptureResources = resources.filter(r => 
      r.subject === 'Bible' || r.subject === 'Aligned Bible'
    );

    const availableBooks: USFMBook[] = [];
    
    for (const resource of scriptureResources) {
      try {
        const extractedPath = resource.local_path.replace('/downloads/', '/extracted/').replace('.zip', '/');
        const files = await resourceCacheService.getResourceFiles(resource.id);
        
        // Find USFM files and extract book codes
        const usfmFiles = files.filter(f => f.endsWith('.usfm'));
        for (const file of usfmFiles) {
          const bookCode = file.split('/').pop()?.replace('.usfm', '').toUpperCase();
          if (bookCode) {
            const bookInfo = getBookInfo(bookCode);
            if (bookInfo && !availableBooks.find(b => b.code === bookCode)) {
              availableBooks.push(bookInfo);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan books in resource ${resource.name}:`, error);
      }
    }

    return availableBooks;
  } catch (error) {
    console.error('Failed to get available books:', error);
    return [];
  }
} 