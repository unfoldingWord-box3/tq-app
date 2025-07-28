/**
 * Door43 Content Service (DCS) Integration
 * 
 * Implements the unfoldingWord ecosystem integration using the official DCS API:
 * https://git.door43.org/api/swagger
 */

// Door43 DCS (Door43 Content Service) API Configuration
const DCS_BASE_URL = 'https://git.door43.org/api/v1';
const CATALOG_SEARCH_URL = `${DCS_BASE_URL}/catalog/search`;
const CATALOG_LANGUAGES_URL = `${DCS_BASE_URL}/catalog/list/languages`;
const CATALOG_SUBJECTS_URL = `${DCS_BASE_URL}/catalog/list/subjects`;
const DOOR43_BASE_URL = 'https://git.door43.org';

// Resource Container Types from the developer guide
export interface Door43Resource {
  id: string;
  name: string;
  owner: string;
  repo: string;
  tag: string;
  released: string;
  zipball_url: string;
  tarball_url: string;
  language: {
    identifier: string;
    title: string;
    direction: 'ltr' | 'rtl';
  };
  subject: string;
  format: 'usfm' | 'tsv' | 'md';
  type: 'bundle' | 'book' | 'help';
  conformsTo: string;
  books?: string[];
  projects?: {
    identifier: string;
    title: string;
    path: string;
    categories: string[];
  }[];
}

export interface CatalogSearchParams {
  subject?: string;         // e.g., 'Bible', 'Translation Questions'
  language?: string;        // e.g., 'en', 'es', 'fr'
  format?: 'usfm' | 'tsv' | 'md';
  type?: 'bundle' | 'book' | 'help';
  book?: string;           // e.g., 'jon', 'mat'
  owner?: string;          // e.g., 'unfoldingWord'
  stage?: 'prod' | 'preprod' | 'draft' | 'latest'; // Production status
  includeHistory?: boolean; // Include historical versions
  limit?: number;
  offset?: number;
  metadataType?: 'rc' | 'sb' | 'ts';
  sort?: 'lang' | 'subject' | 'title' | 'tag';
  order?: 'asc' | 'desc';
}

export interface Door43Language {
  identifier: string;       // ISO 639-1/639-3 code
  title: string;           // Language name
  direction: 'ltr' | 'rtl'; // Text direction
  anglicized_name?: string; // English name
}

export interface Door43Subject {
  identifier: string;       // Subject key
  title: string;           // Human readable name
  description?: string;     // Subject description
}

export interface ResourceDiscoveryResult {
  resources: Door43Resource[];
  languages: Door43Language[];
  total_count: number;
  has_more: boolean;
}

export interface ResourceManifest {
  dublin_core: {
    conformsto: string;
    contributor: string[];
    creator: string;
    description: string;
    format: string;
    identifier: string;
    issued: string;
    language: {
      identifier: string;
      title: string;
      direction: 'ltr' | 'rtl';
    };
    modified: string;
    publisher: string;
    relation: string[];
    rights: string;
    source: string[];
    subject: string;
    title: string;
    type: string;
    version: string;
  };
  checking: {
    checking_entity: string[];
    checking_level: string;
  };
  projects: {
    categories: string[];
    identifier: string;
    path: string;
    sort: number;
    title: string;
    versification?: string;
  }[];
}

class Door43ServiceDCS {
  private baseUrl = DOOR43_BASE_URL;
  private dcsBaseUrl = DCS_BASE_URL;
  private catalogSearchUrl = CATALOG_SEARCH_URL;
  private catalogLanguagesUrl = CATALOG_LANGUAGES_URL;
  private catalogSubjectsUrl = CATALOG_SUBJECTS_URL;
  private languagesCache: Door43Language[] | null = null;
  private subjectsCache: Door43Subject[] | null = null;

  /**
   * Convert DCS catalog entry to Door43Resource format
   */
  private convertDCSEntryToResource(entry: any): Door43Resource {
    return {
      id: entry.id?.toString() || `${entry.language}-${entry.name}-${entry.ref || 'latest'}`,
      name: entry.title || entry.name,
      owner: entry.owner || 'unfoldingWord',
      repo: entry.name,
      tag: entry.ref || entry.tag || 'latest',
      released: entry.released || entry.created_at || new Date().toISOString(),
      zipball_url: entry.zipball_url || entry.download_url || `${DOOR43_BASE_URL}/${entry.owner}/${entry.name}/archive/${entry.ref || 'master'}.zip`,
      tarball_url: entry.tarball_url || entry.download_url || `${DOOR43_BASE_URL}/${entry.owner}/${entry.name}/archive/${entry.ref || 'master'}.tar.gz`,
      language: {
        identifier: entry.language || 'en',
        title: entry.language_title || entry.language || 'English',
        direction: (entry.language_direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl'
      },
      subject: entry.subject || '',
      format: this.detectFormat(entry),
      type: this.detectType(entry),
      conformsTo: entry.conformsTo || 'rc0.2',
      books: entry.ingredients?.map((ingredient: any) => ingredient.identifier) || [],
      projects: entry.ingredients || []
    };
  }

  /**
   * Helper methods to detect format/type from DCS catalog data
   */
  private detectFormat(entry: any): 'usfm' | 'tsv' | 'md' {
    const subject = (entry.subject || '').toLowerCase();
    
    if (subject.includes('questions') || subject.includes('tsv')) return 'tsv';
    if (subject.includes('bible')) return 'usfm';
    if (subject.includes('notes') || subject.includes('words') || subject.includes('academy')) return 'md';
    
    return 'usfm'; // default
  }

  private detectType(entry: any): 'bundle' | 'book' | 'help' {
    const subject = (entry.subject || '').toLowerCase();
    
    if (subject.includes('questions') || subject.includes('notes') || subject.includes('words') || subject.includes('academy')) return 'help';
    if (subject.includes('bible')) return 'bundle';
    
    return 'bundle'; // default
  }

  /**
   * Get human-readable language name from language code
   */
  private getLanguageName(langCode: string): string {
    if (!langCode || typeof langCode !== 'string') {
      return 'Unknown';
    }

    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'pt': 'Português',
      'pt-br': 'Português (Brasil)',
      'de': 'Deutsch',
      'ru': 'Русский',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'it': 'Italiano',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi',
      'pl': 'Polski',
      'tr': 'Türkçe',
      'he': 'עברית',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'ms': 'Bahasa Melayu',
      'tl': 'Filipino',
      'sw': 'Kiswahili',
      'am': 'አማርኛ',
      'fa': 'فارسی',
      'ur': 'اردو',
      'bn': 'বাংলা',
      'ta': 'தமிழ்',
      'te': 'తెలుగు',
      'ml': 'മലയാളം',
      'kn': 'ಕನ್ನಡ',
      'gu': 'ગુજરાતી',
      'or': 'ଓଡ଼ିଆ',
      'pa': 'ਪੰਜਾਬੀ',
      'as': 'অসমীয়া',
      'mr': 'मराठी',
      'ne': 'नेपाली',
      'my': 'မြန်မာ',
      'km': 'ខ្មែរ',
      'lo': 'ລາວ',
      'ka': 'ქართული',
      'hy': 'Հայերեն',
      'az': 'Azərbaycan',
      'kk': 'Қазақ',
      'ky': 'Кыргыз',
      'uz': 'O\'zbek',
      'tg': 'Тоҷикӣ',
      'mn': 'Монгол',
      'bo': 'བོད་སྐད།'
    };

    return languageNames[langCode] || langCode.toUpperCase();
  }

  /**
   * Get all available languages from DCS catalog
   */
  async getAvailableLanguages(): Promise<Door43Language[]> {
    if (this.languagesCache) {
      return this.languagesCache;
    }

    try {
      console.log('🌐 Fetching available languages from DCS...');
      const params = new URLSearchParams({
        stage: 'prod',
        limit: '200'
      });
      
      const response = await fetch(`${this.catalogLanguagesUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok || !data.data) {
        throw new Error('Invalid response format from DCS languages API');
      }

             // Convert DCS language format to Door43Language
       // DCS returns language objects with lc, ln, ld, ang properties
       this.languagesCache = data.data
         .filter((lang: any) => lang && lang.lc)
         .map((lang: any) => ({
           identifier: lang.lc, // language code
           title: lang.ln || lang.ang || this.getLanguageName(lang.lc), // native name or anglicized name
           direction: (lang.ld === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl', // language direction
           anglicized_name: lang.ang || this.getLanguageName(lang.lc) // anglicized name
         }));
      
      return this.languagesCache;
    } catch (error) {
      console.error('❌ Error fetching languages:', error);
      // Return default languages if API fails
      const defaultLanguages: Door43Language[] = [
        { identifier: 'en', title: 'English', direction: 'ltr' },
        { identifier: 'es', title: 'Español', direction: 'ltr' },
        { identifier: 'fr', title: 'Français', direction: 'ltr' },
        { identifier: 'pt', title: 'Português', direction: 'ltr' },
        { identifier: 'hi', title: 'हिन्दी', direction: 'ltr' },
      ];
      this.languagesCache = defaultLanguages;
      return defaultLanguages;
    }
  }

  /**
   * Get available subjects (resource types) from DCS catalog
   */
  async getAvailableSubjects(): Promise<Door43Subject[]> {
    if (this.subjectsCache) {
      return this.subjectsCache;
    }

    try {
      console.log('📚 Fetching available subjects from DCS...');
      const params = new URLSearchParams({
        stage: 'prod',
        limit: '100'
      });
      
      const response = await fetch(`${this.catalogSubjectsUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subjects: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok || !data.data) {
        throw new Error('Invalid response format from DCS subjects API');
      }

      this.subjectsCache = data.data.map((subject: string) => ({
        identifier: subject,
        title: subject,
        description: `${subject} resources`
      }));
      
      return this.subjectsCache;
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      // Return default subjects if API fails
      const defaultSubjects = [
        { identifier: 'Bible', title: 'Bible', description: 'Scripture resources' },
        { identifier: 'Aligned Bible', title: 'Aligned Bible', description: 'Word-aligned Scripture' },
        { identifier: 'Translation Questions', title: 'Translation Questions', description: 'Comprehension questions' },
        { identifier: 'Translation Notes', title: 'Translation Notes', description: 'Translation help' },
        { identifier: 'Translation Words', title: 'Translation Words', description: 'Key term definitions' },
      ];
      this.subjectsCache = defaultSubjects;
      return defaultSubjects;
    }
  }

  /**
   * Discover resources using DCS Catalog Search API
   */
  async discoverResources(params: CatalogSearchParams = {}): Promise<Door43Resource[]> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add search parameters
      if (params.subject) queryParams.append('subject', params.subject);
      if (params.language) queryParams.append('lang', params.language);
      if (params.format) queryParams.append('format', params.format);
      if (params.type) queryParams.append('type', params.type);
      if (params.book) queryParams.append('book', params.book);
      if (params.owner) queryParams.append('owner', params.owner);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      
      // Default to production resources
      queryParams.append('stage', params.stage || 'prod');

      const url = `${this.catalogSearchUrl}?${queryParams.toString()}`;
      console.log('🔍 Discovering Door43 resources via DCS:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok || !data.data) {
        throw new Error('Invalid response format from DCS API');
      }

      // Convert DCS catalog entries to Door43Resource format
      return data.data.map((entry: any) => this.convertDCSEntryToResource(entry));
    } catch (error) {
      console.error('❌ Error discovering Door43 resources:', error);
      throw error;
    }
  }

  /**
   * Discover resources with enhanced filtering and language discovery
   */
  async discoverResourcesEnhanced(params: CatalogSearchParams = {}): Promise<ResourceDiscoveryResult> {
    try {
      console.log('🔍 Enhanced resource discovery from DCS:', params);

      const [resources, languages] = await Promise.all([
        this.discoverResources(params),
        this.getAvailableLanguages()
      ]);

      return {
        resources,
        languages,
        total_count: resources.length,
        has_more: false // DCS API doesn't provide pagination info in this format
      };
    } catch (error) {
      console.error('❌ Error in enhanced resource discovery:', error);
      throw error;
    }
  }

  /**
   * Get available scripture resources (ULT, UST, UHB, UGNT, etc.)
   */
  async getScriptureResources(language: string = 'en', includeAligned: boolean = true): Promise<Door43Resource[]> {
    try {
      const allResources: Door43Resource[] = [];

      // Search for Bible resources
      const bibleResources = await this.discoverResources({
        subject: 'Bible',
        language,
        stage: 'prod',
        limit: 50
      });
      allResources.push(...bibleResources);

      // Search for Aligned Bible resources if requested
      if (includeAligned) {
        const alignedResources = await this.discoverResources({
          subject: 'Aligned Bible',
          language,
          stage: 'prod',
          limit: 50
        });
        allResources.push(...alignedResources);
      }

      // Filter for USFM format resources and remove duplicates
      const scriptureResources = allResources.filter(resource => 
        resource.format === 'usfm' && 
        (resource.subject === 'Bible' || resource.subject === 'Aligned Bible')
      );

      const uniqueResources = scriptureResources.filter((resource, index, array) =>
        array.findIndex(r => r.repo === resource.repo && r.owner === resource.owner) === index
      );

      return uniqueResources.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error getting scripture resources:', error);
      return [];
    }
  }

  /**
   * Get available Translation Questions resources
   */
  async getTranslationQuestions(language: string = 'en'): Promise<Door43Resource[]> {
    try {
      const allResources: Door43Resource[] = [];

      // Search for Translation Questions
      const tqResources = await this.discoverResources({
        subject: 'Translation Questions',
        language,
        stage: 'prod',
        limit: 50
      });
      allResources.push(...tqResources);

      // Also search for TSV Translation Questions
      const tsvTqResources = await this.discoverResources({
        subject: 'TSV Translation Questions',
        language,
        stage: 'prod',
        limit: 50
      });
      allResources.push(...tsvTqResources);

      // Filter for unique resources
      const uniqueResources = allResources.filter((resource, index, array) =>
        array.findIndex(r => r.repo === resource.repo && r.owner === resource.owner) === index
      );

      return uniqueResources.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error getting translation questions:', error);
      return [];
    }
  }

  /**
   * Download resource content
   */
  async downloadResource(resource: Door43Resource): Promise<Blob> {
    try {
      console.log('📥 Downloading resource:', resource.name);
      
      const response = await fetch(resource.zipball_url, {
        method: 'GET',
        headers: {
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download resource: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('❌ Error downloading resource:', error);
      throw error;
    }
  }

  /**
   * Check API connectivity to DCS
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Use a minimal GET request with parameters that we know works
      const params = new URLSearchParams({
        stage: 'prod',
        limit: '1'
      });
      
      const response = await fetch(`${this.catalogSearchUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });
      
      if (!response.ok) {
        console.error('Door43 connectivity check failed:', response.status, response.statusText);
        return false;
      }
      
      // Try to parse the response to make sure it's valid
      const data = await response.json();
      return !!(data && data.ok !== false);
    } catch (error) {
      console.error('Failed to check Door43 connection:', error);
      return false;
    }
  }

  /**
   * Get popular/recommended resources for quick setup
   */
  async getRecommendedResources(): Promise<{
    scripture: Door43Resource[];
    questions: Door43Resource[];
  }> {
    try {
      const [scriptureResources, questionResources] = await Promise.all([
        this.getScriptureResources('en'),
        this.getTranslationQuestions('en')
      ]);

      // Filter for most common resources
      const recommendedScripture = scriptureResources.filter(r => 
        r.name.toLowerCase().includes('ult') || 
        r.name.toLowerCase().includes('ust') ||
        r.name.toLowerCase().includes('literal') ||
        r.name.toLowerCase().includes('simplified')
      ).slice(0, 5);

      const recommendedQuestions = questionResources.slice(0, 3);

      return {
        scripture: recommendedScripture,
        questions: recommendedQuestions
      };
    } catch (error) {
      console.error('❌ Error getting recommended resources:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const door43ServiceDCS = new Door43ServiceDCS(); 