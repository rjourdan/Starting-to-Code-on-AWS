// Simple script to test the API from the frontend environment
// Run with: node debug-api.js

const fetch = require('node-fetch');

async function testApi() {
  const API_URL = 'http://localhost:8000';
  
  console.log('Testing API connection...');
  
  try {
    // Test root endpoint
    console.log('\n--- Testing root endpoint ---');
    const rootResponse = await fetch(`${API_URL}/`);
    console.log('Status:', rootResponse.status);
    const rootData = await rootResponse.json();
    console.log('Response:', rootData);
    
    // Test categories endpoint
    console.log('\n--- Testing categories endpoint ---');
    const categoriesResponse = await fetch(`${API_URL}/categories/`);
    console.log('Status:', categoriesResponse.status);
    const categoriesData = await categoriesResponse.json();
    console.log('Categories count:', categoriesData.length);
    console.log('Categories:', JSON.stringify(categoriesData, null, 2));
    
    // Test products endpoint
    console.log('\n--- Testing products endpoint ---');
    const productsResponse = await fetch(`${API_URL}/products/`);
    console.log('Status:', productsResponse.status);
    const productsData = await productsResponse.json();
    console.log('Products count:', productsData.length);
    if (productsData.length > 0) {
      console.log('First product:', JSON.stringify(productsData[0], null, 2));
    } else {
      console.log('No products returned');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi();