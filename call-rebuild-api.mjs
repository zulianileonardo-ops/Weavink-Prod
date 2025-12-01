// call-rebuild-api.mjs
// Simple script to call the rebuild-vectors API endpoint

const url = 'http://localhost:3000/api/admin/rebuild-vectors';

console.log(`🔄 Calling ${url}...`);
console.log('');

try {
  const response = await fetch(url);
  const data = await response.json();

  console.log('📊 Response Status:', response.status, response.statusText);
  console.log('');
  console.log('📋 Response Body:');
  console.log(JSON.stringify(data, null, 2));

  if (data.success) {
    console.log('');
    console.log('✅ SUCCESS! Vector rebuild complete.');

    if (data.results) {
      console.log('');
      console.log('📊 Summary:');
      data.results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.userId}: ${result.rebuilt}/${result.total} vectors rebuilt`);
        } else {
          console.log(`  ❌ ${result.userId}: ${result.error}`);
        }
      });
    }
  } else {
    console.log('');
    console.log('❌ FAILED:', data.error);
  }
} catch (error) {
  console.error('❌ Error calling API:', error.message);
  console.error(error.stack);
  process.exit(1);
}
