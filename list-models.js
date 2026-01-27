require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function listAvailableModels() {
  try {
    console.log('Fetching available models...\n');
    
    // Use fetch to call the REST API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`Found ${models.length} models:\n`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log(`   Input Token Limit: ${model.inputTokenLimit}`);
      console.log(`   Output Token Limit: ${model.outputTokenLimit}`);
      console.log('');
    });
    
    // Filter models that support generateContent
    const contentGenerationModels = models.filter(m => 
      m.supportedGenerationMethods.includes('generateContent')
    );
    
    console.log('\n=== Models that support generateContent ===');
    contentGenerationModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${model.displayName})`);
    });
    
  } catch (error) {
    console.error('Error listing models:', error.message);
    console.error(error);
  }
}

listAvailableModels();
