// test-rerank-debug.js
// Standalone script to debug Cohere rerank scores

import { CohereClientV2 } from 'cohere-ai';

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY,
});

// Test Case 1: Simple exact match
const testCase1 = {
  query: "Software Engineer",
  documents: [
    "name: Alice Smith\njob_title: Software Engineer\ncompany: Tesla",
    "name: Bob Jones\njob_title: Marketing Manager\ncompany: Google",
    "name: Carol Davis\njob_title: Product Designer\ncompany: Apple"
  ]
};

// Test Case 2: Semantic match (current issue)
const testCase2 = {
  query: "React developers",
  documents: [
    "name: Alice Smith\njob_title: Software Engineer\ncompany: Tesla\ntags: [frontend, engineering]",
    "name: Bob Jones\njob_title: Autopilot Engineer\ncompany: Tesla",
    "name: Carol Davis\njob_title: Sales Director\ncompany: Ford"
  ]
};

// Test Case 3: Rich document
const testCase3 = {
  query: "React developers",
  documents: [
    `name: Alice Smith
job_title: Software Engineer
company: Tesla
notes: Experienced frontend developer specializing in React, TypeScript, and modern web technologies. Built scalable applications.
tags: [frontend, react, javascript, typescript]
linkedin: linkedin.com/in/alicesmith`,
    "name: Bob Jones\njob_title: Marketing Manager\ncompany: Google"
  ]
};

async function runTest(testName, testCase) {
  console.log(`\n=== ${testName} ===`);
  console.log('Query:', testCase.query);
  console.log('Documents:', testCase.documents.length);

  try {
    const response = await cohere.rerank({
      model: 'rerank-multilingual-v3.0',
      query: testCase.query,
      documents: testCase.documents,
      topN: testCase.documents.length,
      maxTokensPerDoc: 512
    });

    console.log('\nResults:');
    response.results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Score: ${result.relevanceScore.toFixed(4)} - Index: ${result.index}`);
      console.log(`     Document preview: ${testCase.documents[result.index].substring(0, 60)}...`);
    });

    const scores = response.results.map(r => r.relevanceScore);
    console.log('\nScore Stats:', {
      min: Math.min(...scores).toFixed(4),
      max: Math.max(...scores).toFixed(4),
      mean: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4)
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('🔬 Cohere Rerank Diagnostic Tests\n');

  await runTest('Test 1: Exact Match', testCase1);
  await runTest('Test 2: Semantic Match (Current Issue)', testCase2);
  await runTest('Test 3: Rich Document', testCase3);

  console.log('\n✅ Tests complete');
}

main();
