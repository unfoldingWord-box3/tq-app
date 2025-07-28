/**
 * Door43 API Test Script
 * 
 * This script tests the actual Door43 v3 catalog API to understand
 * the response structure and data format.
 */

import fetch from 'node-fetch';

// Door43 v3 API endpoints
const CATALOG_API_URL = 'https://api.door43.org/v3/catalog.json';

/**
 * Test the main catalog endpoint
 */
async function testCatalogEndpoint() {
  console.log('🧪 Testing Door43 v3 Catalog API...\n');
  console.log('📡 Fetching:', CATALOG_API_URL);
  
  try {
    const response = await fetch(CATALOG_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const catalog = await response.json();
    console.log('\n📚 Catalog Structure Analysis:');
    console.log('- Root keys:', Object.keys(catalog));
    
    // Analyze catalog structure
    if (catalog.languages) {
      console.log('- Languages count:', catalog.languages.length);
      console.log('- First language sample:', JSON.stringify(catalog.languages[0], null, 2));
      
      // Test language structure
      console.log('\n🌐 Language Analysis:');
      const languageSample = catalog.languages.slice(0, 3);
      languageSample.forEach((lang, index) => {
        console.log(`Language ${index + 1}:`, {
          identifier: lang.identifier,
          title: lang.title,
          direction: lang.direction,
          resourceCount: lang.resources ? lang.resources.length : 0
        });
      });
    }

    // Find and analyze resources
    if (catalog.languages && catalog.languages[0] && catalog.languages[0].resources) {
      console.log('\n📖 Resource Analysis:');
      const englishLang = catalog.languages.find(lang => lang.identifier === 'en');
      
      if (englishLang && englishLang.resources) {
        console.log('- English resources count:', englishLang.resources.length);
        console.log('- First resource sample:', JSON.stringify(englishLang.resources[0], null, 2));
        
        // Analyze subjects
        const subjects = new Set();
        englishLang.resources.forEach(resource => {
          if (resource.subject) {
            subjects.add(resource.subject);
          }
        });
        
        console.log('\n🏷️ Available Subjects in English:');
        Array.from(subjects).sort().forEach(subject => {
          const count = englishLang.resources.filter(r => r.subject === subject).length;
          console.log(`- ${subject}: ${count} resources`);
        });

        // Test specific subjects we need
        console.log('\n🎯 Target Subject Analysis:');
        
        // Bible resources
        const bibleResources = englishLang.resources.filter(r => r.subject === 'Bible');
        console.log(`\n📖 Bible Resources (${bibleResources.length}):`, bibleResources.slice(0, 2).map(r => ({
          identifier: r.identifier,
          title: r.title,
          publisher: r.publisher,
          formats: r.formats
        })));

        // Aligned Bible resources
        const alignedBibleResources = englishLang.resources.filter(r => r.subject === 'Aligned Bible');
        console.log(`\n🔗 Aligned Bible Resources (${alignedBibleResources.length}):`, alignedBibleResources.slice(0, 2).map(r => ({
          identifier: r.identifier,
          title: r.title,
          publisher: r.publisher,
          formats: r.formats
        })));

        // Translation Questions resources
        const tqResources = englishLang.resources.filter(r => r.subject === 'Translation Questions');
        console.log(`\n❓ Translation Questions Resources (${tqResources.length}):`, tqResources.slice(0, 2).map(r => ({
          identifier: r.identifier,
          title: r.title,
          publisher: r.publisher,
          formats: r.formats
        })));

        // Analyze resource formats
        console.log('\n🔧 Resource Format Analysis:');
        const formatMap = new Map();
        englishLang.resources.forEach(resource => {
          if (resource.formats) {
            resource.formats.forEach(format => {
              const key = format.format || 'unknown';
              formatMap.set(key, (formatMap.get(key) || 0) + 1);
            });
          }
        });
        
        formatMap.forEach((count, format) => {
          console.log(`- ${format}: ${count} instances`);
        });
      }
    }

    return catalog;
  } catch (error) {
    console.error('❌ Error testing catalog API:', error);
    throw error;
  }
}

/**
 * Test resource filtering and extraction
 */
async function testResourceExtraction(catalog) {
  console.log('\n🔍 Testing Resource Extraction Logic...');
  
  try {
    // Find English resources
    const englishLang = catalog.languages.find(lang => lang.identifier === 'en');
    if (!englishLang || !englishLang.resources) {
      throw new Error('No English resources found');
    }

    // Test our extraction logic
    console.log('\n🧩 Simulating Door43Service Logic:');
    
    const extractedResources = [];
    
    englishLang.resources.forEach(resource => {
      // Filter for Bible and Translation Questions (our main subjects)
      if (resource.subject === 'Bible' || 
          resource.subject === 'Aligned Bible' || 
          resource.subject === 'Translation Questions') {
        
        const door43Resource = {
          id: `en-${resource.identifier}-${resource.version || '1'}`,
          name: resource.title || resource.identifier,
          owner: resource.publisher || resource.creator || 'unfoldingWord',
          repo: resource.identifier,
          tag: resource.version || '1',
          released: resource.issued || resource.modified || new Date().toISOString(),
          zipball_url: resource.formats?.[0]?.url || '',
          tarball_url: resource.formats?.[0]?.url || '',
          language: {
            identifier: englishLang.identifier,
            title: englishLang.title,
            direction: englishLang.direction || 'ltr'
          },
          subject: resource.subject || '',
          format: detectFormat(resource),
          type: detectType(resource),
          conformsTo: detectConformsTo(resource),
          books: resource.projects?.map(p => p.identifier) || [],
          projects: resource.projects || []
        };
        
        extractedResources.push(door43Resource);
      }
    });

    console.log(`\n✅ Extracted ${extractedResources.length} relevant resources:`);
    
    // Group by subject
    const bySubject = {};
    extractedResources.forEach(resource => {
      if (!bySubject[resource.subject]) {
        bySubject[resource.subject] = [];
      }
      bySubject[resource.subject].push(resource);
    });

    Object.keys(bySubject).forEach(subject => {
      console.log(`\n📚 ${subject} (${bySubject[subject].length} resources):`);
      bySubject[subject].slice(0, 3).forEach(resource => {
        console.log(`  - ${resource.name} (${resource.owner}) - ${resource.format} format`);
        console.log(`    URL: ${resource.zipball_url}`);
      });
    });

  } catch (error) {
    console.error('❌ Error in resource extraction test:', error);
    throw error;
  }
}

/**
 * Helper functions to detect format, type, and conformsTo from resource data
 */
function detectFormat(resource) {
  if (resource.formats && resource.formats[0]) {
    const format = resource.formats[0].format;
    if (format.includes('usfm')) return 'usfm';
    if (format.includes('tsv')) return 'tsv';
    if (format.includes('markdown')) return 'md';
  }
  return 'usfm'; // default
}

function detectType(resource) {
  if (resource.formats && resource.formats[0]) {
    const format = resource.formats[0].format;
    if (format.includes('type=bundle')) return 'bundle';
    if (format.includes('type=book')) return 'book';
    if (format.includes('type=help')) return 'help';
  }
  return 'bundle'; // default
}

function detectConformsTo(resource) {
  if (resource.formats && resource.formats[0]) {
    const format = resource.formats[0].format;
    const match = format.match(/conformsto=([^\s]+)/);
    if (match) return match[1];
  }
  return 'rc0.2'; // default
}

/**
 * Test specific resource downloads
 */
async function testResourceDownload(catalog) {
  console.log('\n📥 Testing Resource Download URLs...');
  
  try {
    const englishLang = catalog.languages.find(lang => lang.identifier === 'en');
    if (!englishLang || !englishLang.resources) {
      return;
    }

    // Find a small resource to test download
    const testResource = englishLang.resources.find(resource => 
      resource.subject === 'Translation Questions' && 
      resource.formats && 
      resource.formats[0] && 
      resource.formats[0].url
    );

    if (testResource) {
      console.log('\n🎯 Testing download URL for:', testResource.title);
      console.log('URL:', testResource.formats[0].url);
      
      const response = await fetch(testResource.formats[0].url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'BibleTranslationQA-Test/1.0',
        },
      });
      
      console.log('Download test status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Content-Length:', response.headers.get('content-length'));
    }
  } catch (error) {
    console.error('❌ Error testing resource download:', error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Door43 API Tests...\n');
  
  try {
    const catalog = await testCatalogEndpoint();
    await testResourceExtraction(catalog);
    await testResourceDownload(catalog);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
runTests();

export {
  testCatalogEndpoint,
  testResourceExtraction,
  testResourceDownload,
  runTests
}; 