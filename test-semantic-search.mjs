// test-semantic-search.mjs
// Test semantic search with lower threshold

const url = 'http://localhost:3000/api/user/contacts/semantic-search?query=React+developers&minVectorScore=0.45';

console.log(`🔍 Testing semantic search: "React developers"`);
console.log(`📡 URL: ${url}`);
console.log('');

try {
  const response = await fetch(url, {
    headers: {
      'Cookie': 'authToken=YOUR_TOKEN_HERE'  // Will work without auth in dev mode
    }
  });

  const data = await response.json();

  console.log('📊 Response Status:', response.status, response.statusText);
  console.log('');
  console.log('📋 Response:');
  console.log(JSON.stringify(data, null, 2));

  if (data.contacts) {
    console.log('');
    console.log(`✅ Found ${data.contacts.length} contacts`);
    console.log('');
    console.log('Top matches:');
    data.contacts.slice(0, 10).forEach((contact, i) => {
      console.log(`  ${i + 1}. ${contact.name} - ${contact.jobTitle} (Score: ${contact.score?.toFixed(4) || 'N/A'})`);
    });
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
