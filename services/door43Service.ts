/**
 * Door43 Content Service Integration
 * 
 * Implements the unfoldingWord ecosystem integration following the developer guide:
 * https://raw.githubusercontent.com/unfoldingWord/uW-Tools-Collab/refs/heads/main/unfoldingword-developer-guide.md
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
  projects?: Array<{
    identifier: string;
    title: string;
    path: string;
    categories: string[];
  }>;
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
  projects: Array<{
    categories: string[];
    identifier: string;
    path: string;
    sort: number;
    title: string;
    versification?: string;
  }>;
}

 class Door43Service {
   private baseUrl = DOOR43_BASE_URL;
   private dcsBaseUrl = DCS_BASE_URL;
   private catalogSearchUrl = CATALOG_SEARCH_URL;
   private catalogLanguagesUrl = CATALOG_LANGUAGES_URL;
   private catalogSubjectsUrl = CATALOG_SUBJECTS_URL;
   private languagesCache: Door43Language[] | null = null;
   private subjectsCache: Door43Subject[] | null = null;

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
   * Get all available languages from Door43 v3 catalog
   */
  async getAvailableLanguages(): Promise<Door43Language[]> {
    if (this.languagesCache) {
      return this.languagesCache;
    }

    try {
      console.log('🌐 Fetching available languages from v3 catalog...');
      const catalog = await this.fetchCatalog();
      
      if (catalog && catalog.languages) {
        this.languagesCache = catalog.languages.map((lang: any) => ({
          identifier: lang.identifier,
          title: lang.title,
          direction: (lang.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl'
        }));
        return this.languagesCache!
      }
      
      throw new Error('No languages found in catalog');
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
   * Get available subjects (resource types) from catalog data
   */
  async getAvailableSubjects(): Promise<Door43Subject[]> {
    if (this.subjectsCache) {
      return this.subjectsCache;
    }

    try {
      console.log('📚 Fetching available subjects from catalog...');
      const catalog = await this.fetchCatalog();
      
      if (catalog && catalog.languages) {
        // Extract unique subjects from all resources
        const subjectSet = new Set<string>();
        catalog.languages.forEach((lang: any) => {
          if (lang.resources) {
            lang.resources.forEach((resource: any) => {
              if (resource.subject) {
                subjectSet.add(resource.subject);
              }
            });
          }
        });

        this.subjectsCache = Array.from(subjectSet).map(subject => ({
          identifier: subject,
          title: subject,
          description: `${subject} resources`
        }));
        
        return this.subjectsCache;
      }
      
      throw new Error('No subjects found in catalog');
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
   * Discover resources with enhanced filtering from v3 catalog
   */
  async discoverResourcesEnhanced(params: CatalogSearchParams = {}): Promise<ResourceDiscoveryResult> {
    try {
      console.log('🔍 Enhanced resource discovery from v3 catalog:', params);

      const [catalog, languages] = await Promise.all([
        this.fetchCatalog(),
        this.getAvailableLanguages()
      ]);

      if (!catalog || !catalog.languages) {
        throw new Error('No catalog data available');
      }

      let allResources: Door43Resource[] = [];

      // Extract and filter resources from catalog
      catalog.languages.forEach((lang: any) => {
        // Filter by language if specified
        if (params.language && lang.identifier !== params.language) {
          return;
        }

        if (lang.resources) {
          lang.resources.forEach((resource: any) => {
            // Filter by subject if specified
            if (params.subject && resource.subject !== params.subject) {
              return;
            }

            // Filter by owner if specified
            if (params.owner && resource.publisher !== params.owner) {
              return;
            }

            // Convert to Door43Resource format
            const door43Resource: Door43Resource = {
              id: `${lang.identifier}-${resource.identifier}-${resource.version || '1'}`,
              name: resource.title || resource.identifier,
              owner: resource.publisher || resource.creator || 'unfoldingWord',
              repo: resource.identifier,
              tag: resource.version || '1',
              released: resource.issued || resource.modified || new Date().toISOString(),
              zipball_url: resource.formats?.[0]?.url || '',
              tarball_url: resource.formats?.[0]?.url || '',
              language: {
                identifier: lang.identifier,
                title: lang.title,
                direction: lang.direction || 'ltr'
              },
              subject: resource.subject || '',
              format: this.detectFormat(resource),
              type: this.detectType(resource),
              conformsTo: this.detectConformsTo(resource),
              books: resource.projects?.map((p: any) => p.identifier) || [],
              projects: resource.projects || []
            };

            allResources.push(door43Resource);
          });
        }
      });

      // Apply sorting
      if (params.sort) {
        allResources.sort((a, b) => {
          let aVal = '', bVal = '';
          switch (params.sort) {
            case 'title':
              aVal = a.name;
              bVal = b.name;
              break;
            case 'lang':
              aVal = a.language.identifier;
              bVal = b.language.identifier;
              break;
            default:
              aVal = a.name;
              bVal = b.name;
          }
          
          const result = aVal.localeCompare(bVal);
          return params.order === 'desc' ? -result : result;
        });
      }

      // Apply pagination
      const offset = params.offset || 0;
      const limit = params.limit || allResources.length;
      const paginatedResources = allResources.slice(offset, offset + limit);

      return {
        resources: paginatedResources,
        languages,
        total_count: allResources.length,
        has_more: (offset + limit) < allResources.length
      };
    } catch (error) {
      console.error('❌ Error in enhanced resource discovery:', error);
      throw error;
    }
  }

     /**
    * Helper methods to detect format/type from v3 catalog data
    */
   private detectFormat(resource: any): 'usfm' | 'tsv' | 'md' {
     if (resource.formats && resource.formats[0]) {
       const format = resource.formats[0].format.toLowerCase();
       if (format.includes('content=text/usfm')) return 'usfm';
       if (format.includes('content=text/tsv')) return 'tsv';
       if (format.includes('content=text/markdown')) return 'md';
       // Fallback checks
       if (format.includes('usfm')) return 'usfm';
       if (format.includes('tsv')) return 'tsv';
       if (format.includes('markdown')) return 'md';
     }
     
     // Additional fallback based on subject
     if (resource.subject) {
       const subject = resource.subject.toLowerCase();
       if (subject.includes('questions') || subject.includes('tsv')) return 'tsv';
       if (subject.includes('bible')) return 'usfm';
       if (subject.includes('notes') || subject.includes('words')) return 'md';
     }
     
     return 'usfm'; // default
   }

   private detectType(resource: any): 'bundle' | 'book' | 'help' {
     if (resource.formats && resource.formats[0]) {
       const format = resource.formats[0].format.toLowerCase();
       if (format.includes('type=bundle')) return 'bundle';
       if (format.includes('type=book')) return 'book';
       if (format.includes('type=help')) return 'help';
       if (format.includes('type=man')) return 'help';
       if (format.includes('type=dict')) return 'help';
     }
     
     // Fallback based on subject
     if (resource.subject) {
       const subject = resource.subject.toLowerCase();
       if (subject.includes('questions') || subject.includes('notes') || subject.includes('words')) return 'help';
       if (subject.includes('bible')) return 'bundle';
     }
     
     return 'bundle'; // default
   }

   private detectConformsTo(resource: any): string {
     if (resource.formats && resource.formats[0]) {
       const format = resource.formats[0].format;
       const match = format.match(/conformsto=([^\s]+)/);
       if (match) return match[1];
     }
     return 'rc0.2'; // default
   }

  /**
   * Discover available resources using Catalog API
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

      const url = `${this.catalogUrl}?${queryParams.toString()}`;
      console.log('🔍 Discovering Door43 resources:', url);

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
      return data.data || data; // Handle different response formats
    } catch (error) {
      console.error('❌ Error discovering Door43 resources:', error);
      throw error;
    }
  }

     /**
    * Get available scripture resources (ULT, UST, UHB, UGNT, etc.)
    */
   async getScriptureResources(language: string = 'en', includeAligned: boolean = true): Promise<Door43Resource[]> {
     try {
       const result = await this.discoverResourcesEnhanced({
         language,
         sort: 'title',
         order: 'asc'
       });

       // Filter for scripture resources based on actual API subjects
       const scriptureResources = result.resources.filter(resource => {
         const isScripture = resource.subject === 'Bible' || 
                           resource.subject === 'Aligned Bible';
         const isUsfmFormat = resource.format === 'usfm';
         
         if (!includeAligned) {
           return isScripture && isUsfmFormat && resource.subject === 'Bible';
         }
         
         return isScripture && isUsfmFormat;
       });

       // Remove duplicates based on repo name
       const uniqueResources = scriptureResources.filter((resource, index, array) =>
         array.findIndex(r => r.repo === resource.repo) === index
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
      const result = await this.discoverResourcesEnhanced({
        subject: 'Translation Questions',
        language,
        sort: 'title',
        order: 'asc'
      });

      // Filter for Translation Questions and TSV format
      return result.resources.filter(resource => 
        resource.subject === 'Translation Questions' ||
        resource.name.toLowerCase().includes('tq') ||
        resource.repo.toLowerCase().includes('tq')
      );
    } catch (error) {
      console.error('❌ Error getting translation questions:', error);
      return [];
    }
  }

  /**
   * Get Translation Notes resources
   */
  async getTranslationNotes(language: string = 'en'): Promise<Door43Resource[]> {
    return this.discoverResources({
      subject: 'Translation Notes',
      language,
      format: 'tsv',
      owner: 'unfoldingWord'
    });
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
   * Get resource manifest
   */
  async getResourceManifest(owner: string, repo: string, ref: string = 'master'): Promise<ResourceManifest> {
    try {
      const url = `${this.baseUrl}/${owner}/${repo}/raw/${ref}/manifest.yaml`;
      console.log('📋 Fetching manifest:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/yaml, text/yaml, application/json',
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      
      // Try to parse as JSON first, then YAML
      try {
        return JSON.parse(text);
      } catch {
        // For YAML parsing, you'd need a YAML parser library
        // For now, throw an error indicating YAML support needed
        throw new Error('YAML parsing not implemented - manifest should be JSON format');
      }
    } catch (error) {
      console.error('❌ Error fetching manifest:', error);
      throw error;
    }
  }

  /**
   * Get specific file from repository
   */
  async getRepositoryFile(owner: string, repo: string, path: string, ref: string = 'master'): Promise<string> {
    try {
      const url = `${this.baseUrl}/${owner}/${repo}/raw/${ref}/${path}`;
      console.log('📄 Fetching file:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('❌ Error fetching repository file:', error);
      throw error;
    }
  }

  /**
   * Check API connectivity to Door43 v3 catalog
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(CATALOG_API_URL, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'BibleTranslationQA/1.0',
        },
      });
      return response.ok;
    } catch {
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
        r.name.includes('ult') || r.name.includes('ust')
      ).slice(0, 5);

      const recommendedQuestions = questionResources.filter(r =>
        r.name.includes('tq')
      ).slice(0, 3);

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
export const door43Service = new Door43Service();



