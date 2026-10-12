// ═══════════════════════════════════════════════════════════════════════════
// 🔍 GEMINI MODELS LISTER
// ═══════════════════════════════════════════════════════════════════════════
// This utility script fetches and displays all available Google Gemini models
// from the API, including their capabilities, token limits, and supported methods.
// 
// Usage: node list-models.js
// ═══════════════════════════════════════════════════════════════════════════

// Load environment variables
require('dotenv').config();

// Get API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validate API key is present
if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY not found in .env file');
  console.error('   Please add your API key to the .env file');
  process.exit(1);
}

console.log('✓ API key loaded successfully\n');

/**
 * Fetches and displays all available Gemini AI models
 * 
 * Makes a direct REST API call to Google's generativelanguage API
 * to retrieve the full catalog of available models with their specifications.
 * 
 * @throws {Error} If the API request fails
 */
async function listAvailableModels() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📋 FETCHING AVAILABLE GEMINI MODELS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  try {
    console.log('🔍 Querying Google Generative Language API...');
    
    // Make direct REST API call to fetch models catalog
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`✓ Successfully retrieved model catalog\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    console.log(`📦 FOUND ${models.length} MODELS`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Display detailed information for each model
    models.forEach((model, index) => {
      console.log(`\n${index + 1}. ${model.name}`);
      console.log('─'.repeat(75));
      console.log(`   📝 Display Name: ${model.displayName}`);
      console.log(`   📖 Description: ${model.description}`);
      console.log(`   ⚙️  Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log(`   📊 Input Token Limit: ${model.inputTokenLimit?.toLocaleString() || 'N/A'}`);
      console.log(`   📊 Output Token Limit: ${model.outputTokenLimit?.toLocaleString() || 'N/A'}`);
    });
    
    console.log('\n' + '═'.repeat(75));
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✨ MODELS SUPPORTING generateContent() METHOD');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('These models can be used with the Gemini generateContent API\n');
    
    // Filter models that support the generateContent method (what we use)
    const contentGenerationModels = models.filter(m => 
      m.supportedGenerationMethods.includes('generateContent')
    );
    
    if (contentGenerationModels.length === 0) {
      console.log('⚠️  No models found with generateContent support');
    } else {
      contentGenerationModels.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.name}`);
        console.log(`      └─ ${model.displayName}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log(`✅ COMPLETED - Listed ${models.length} total models (${contentGenerationModels.length} support generateContent)`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════════════════════');
    console.error('❌ ERROR FETCHING MODELS');
    console.error('═══════════════════════════════════════════════════════════════════════════');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('\nFull error:');
    console.error(error);
    console.error('═══════════════════════════════════════════════════════════════════════════\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE THE SCRIPT
// ═══════════════════════════════════════════════════════════════════════════
listAvailableModels();
