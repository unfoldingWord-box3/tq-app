/**
 * Door43 DCS (Door43 Content Service) API Test Script
 * 
 * This script tests the official Door43 DCS API endpoints from git.door43.org
 * as documented in the unfoldingWord developer guide.
 */

import fetch from 'node-fetch';

// Door43 DCS API Configuration
const DCS_BASE_URL = 'https://git.door43.org/api/v1';
const CATALOG_SEARCH_URL = `${DCS_BASE_URL}/catalog/search`;
const CATALOG_LANGUAGES_URL = `${DCS_BASE_URL}/catalog/list/languages`;
const CATALOG_SUBJECTS_URL = `${DCS_BASE_URL}/catalog/list/subjects`;

/**
 * Test the catalog search endpoint
 */
async function testCatalogSearch() {
  console.log('🧪 Testing DCS Catalog Search API...\n');
  
  try {
    // Test basic search
    console.log('📡 Testing basic catalog search...');
    const searchParams = new URLSearchParams({
      stage: 'prod',
      limit: '10'
    });
    
    const response = await fetch(`${CATALOG_SEARCH_URL}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const searchResults = await response.json();
    console.log('\n📚 Search Results Structure:');
    console.log('- Root keys:', Object.keys(searchResults));
    console.log('- Total entries:', searchResults.data?.length || 0);
    
    if (searchResults.data && searchResults.data.length > 0) {
      console.log('\n📖 First entry sample:');
      const firstEntry = searchResults.data[0];
      console.log('  - ID:', firstEntry.id);
      console.log('  - Title:', firstEntry.title);
      console.log('  - Subject:', firstEntry.subject);
      console.log('  - Language:', firstEntry.language_identifier);
      console.log('  - Owner:', firstEntry.owner);
      console.log('  - Stage:', firstEntry.stage);
      
      console.log('\n📖 Full entry structure:');
      console.log(JSON.stringify(firstEntry, null, 2));
    }

    return searchResults;
  } catch (error) {
    console.error('❌ Error testing catalog search:', error);
    throw error;
  }
}

/**
 * Test catalog languages endpoint
 */
async function testCatalogLanguages() {
  console.log('\n🌐 Testing DCS Catalog Languages API...\n');
  
  try {
    const params = new URLSearchParams({
      stage: 'prod',
      limit: '20'
    });
    
    const response = await fetch(`${CATALOG_LANGUAGES_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const languagesResults = await response.json();
    console.log('\n🌐 Languages Results:');
    console.log('- Root keys:', Object.keys(languagesResults));
    console.log('- Languages count:', languagesResults.data?.length || 0);
    
    if (languagesResults.data && languagesResults.data.length > 0) {
      console.log('\n📋 Language samples:');
      languagesResults.data.slice(0, 10).forEach((lang, index) => {
        console.log(`  ${index + 1}. ${lang}`);
      });
      
      console.log('\n📋 Full language structure sample:');
      console.log(JSON.stringify(languagesResults.data[0], null, 2));
    }

    return languagesResults;
  } catch (error) {
    console.error('❌ Error testing catalog languages:', error);
    throw error;
  }
}

/**
 * Test catalog subjects endpoint
 */
async function testCatalogSubjects() {
  console.log('\n📚 Testing DCS Catalog Subjects API...\n');
  
  try {
    const params = new URLSearchParams({
      stage: 'prod',
      limit: '50'
    });
    
    const response = await fetch(`${CATALOG_SUBJECTS_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const subjectsResults = await response.json();
    console.log('\n🏷️ Subjects Results:');
    console.log('- Root keys:', Object.keys(subjectsResults));
    console.log('- Subjects count:', subjectsResults.data?.length || 0);
    
    if (subjectsResults.data && subjectsResults.data.length > 0) {
      console.log('\n📋 Available subjects:');
      subjectsResults.data.forEach((subject, index) => {
        console.log(`  ${index + 1}. ${subject}`);
      });
    }

    return subjectsResults;
  } catch (error) {
    console.error('❌ Error testing catalog subjects:', error);
    throw error;
  }
}

/**
 * Test targeted searches for Bible and Translation Questions
 */
async function testTargetedSearches() {
  console.log('\n🎯 Testing Targeted Searches for Bible Resources...\n');
  
  try {
    // Search for Bible resources in English
    console.log('📖 Searching for Bible resources in English...');
    let searchParams = new URLSearchParams({
      stage: 'prod',
      lang: 'en',
      subject: 'Bible',
      limit: '10'
    });
    
    let response = await fetch(`${CATALOG_SEARCH_URL}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    if (response.ok) {
      const bibleResults = await response.json();
      console.log(`  Found ${bibleResults.data?.length || 0} Bible resources`);
      
      if (bibleResults.data && bibleResults.data.length > 0) {
        console.log('  Examples:');
        bibleResults.data.slice(0, 3).forEach(entry => {
          console.log(`    - ${entry.title} (${entry.owner})`);
        });
      }
    }

    // Search for Translation Questions
    console.log('\n❓ Searching for Translation Questions in English...');
    searchParams = new URLSearchParams({
      stage: 'prod',
      lang: 'en',
      subject: 'Translation Questions',
      limit: '10'
    });
    
    response = await fetch(`${CATALOG_SEARCH_URL}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    if (response.ok) {
      const tqResults = await response.json();
      console.log(`  Found ${tqResults.data?.length || 0} Translation Questions resources`);
      
      if (tqResults.data && tqResults.data.length > 0) {
        console.log('  Examples:');
        tqResults.data.slice(0, 3).forEach(entry => {
          console.log(`    - ${entry.title} (${entry.owner})`);
        });
      }
    }

    // Search for Aligned Bible
    console.log('\n🔗 Searching for Aligned Bible resources in English...');
    searchParams = new URLSearchParams({
      stage: 'prod',
      lang: 'en',
      subject: 'Aligned Bible',
      limit: '10'
    });
    
    response = await fetch(`${CATALOG_SEARCH_URL}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BibleTranslationQA-Test/1.0',
      },
    });

    if (response.ok) {
      const alignedResults = await response.json();
      console.log(`  Found ${alignedResults.data?.length || 0} Aligned Bible resources`);
      
      if (alignedResults.data && alignedResults.data.length > 0) {
        console.log('  Examples:');
        alignedResults.data.slice(0, 3).forEach(entry => {
          console.log(`    - ${entry.title} (${entry.owner})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error in targeted searches:', error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runDCSTests() {
  console.log('🚀 Starting Door43 DCS API Tests...\n');
  
  try {
    await testCatalogSearch();
    await testCatalogLanguages();
    await testCatalogSubjects();
    await testTargetedSearches();
    
    console.log('\n✅ All DCS API tests completed successfully!');
  } catch (error) {
    console.error('\n❌ DCS API test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runDCSTests();

export {
  testCatalogSearch,
  testCatalogLanguages,
  testCatalogSubjects,
  testTargetedSearches,
  runDCSTests
}; 