#!/usr/bin/env node
// scripts/test-graph-discovery.mjs
// Test Neo4j graph discovery with sample contacts

import 'dotenv/config';

// Import the services directly
const { neo4jClient } = await import('../lib/services/serviceContact/server/neo4j/neo4jClient.js');
const Neo4jSyncService = (await import('../lib/services/serviceContact/server/neo4j/Neo4jSyncService.js')).default;
const RelationshipDiscoveryService = (await import('../lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js')).default;

console.log('🧪 Graph Discovery Test\n');
console.log('='.repeat(50));

// Sample contacts for testing
const testUserId = 'test_user_graph_demo';
const sampleContacts = [
  {
    id: 'contact_1',
    name: 'John Smith',
    email: 'john.smith@tesla.com',
    company: 'Tesla',
    jobTitle: 'Senior Engineer',
    tags: ['automotive', 'engineering', 'ev']
  },
  {
    id: 'contact_2',
    name: 'Jane Doe',
    email: 'jane.doe@tesla.com',
    company: 'Tesla',
    jobTitle: 'Product Manager',
    tags: ['automotive', 'product', 'ev']
  },
  {
    id: 'contact_3',
    name: 'Bob Wilson',
    email: 'bob@google.com',
    company: 'Google',
    jobTitle: 'Software Engineer',
    tags: ['tech', 'engineering', 'ai']
  },
  {
    id: 'contact_4',
    name: 'Alice Brown',
    email: 'alice@google.com',
    company: 'Google',
    jobTitle: 'AI Researcher',
    tags: ['tech', 'ai', 'research']
  },
  {
    id: 'contact_5',
    name: 'Charlie Green',
    email: 'charlie@startup.io',
    company: 'Startup Inc',
    jobTitle: 'Founder',
    tags: ['startup', 'engineering', 'leadership']
  }
];

try {
  // Step 1: Check Neo4j connection
  console.log('\n📡 Step 1: Checking Neo4j connection...');
  const health = await neo4jClient.healthCheck();
  if (!health.healthy) {
    throw new Error('Neo4j is not healthy: ' + health.error);
  }
  console.log('✅ Neo4j is healthy');

  // Step 2: Clean up any existing test data
  console.log('\n🧹 Step 2: Cleaning up existing test data...');
  await neo4jClient.write(
    'MATCH (n {userId: $userId}) DETACH DELETE n',
    { userId: testUserId }
  );
  console.log('✅ Test data cleaned');

  // Step 3: Run relationship discovery
  console.log('\n🔍 Step 3: Running relationship discovery...');
  const results = await RelationshipDiscoveryService.discoverAllRelationships(
    testUserId,
    sampleContacts,
    { includeSemantic: false }
  );

  console.log('\n📊 Discovery Results:');
  console.log(`   Total Contacts: ${results.totalContacts}`);
  console.log(`   Companies Found: ${results.companiesFound}`);
  console.log(`   Tag Relationships: ${results.tagRelationships}`);
  console.log(`   Duration: ${results.duration}ms`);

  // Step 4: Get graph data
  console.log('\n🎨 Step 4: Fetching graph data...');
  const graphData = await RelationshipDiscoveryService.getGraphData(testUserId);
  console.log(`   Nodes: ${graphData.nodes.length}`);
  console.log(`   Edges: ${graphData.edges.length}`);

  // Print nodes by type
  const nodesByType = {};
  for (const node of graphData.nodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }
  console.log('\n   Node breakdown:');
  for (const [type, count] of Object.entries(nodesByType)) {
    console.log(`     ${type}: ${count}`);
  }

  // Print edges by type
  const edgesByType = {};
  for (const edge of graphData.edges) {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  }
  console.log('\n   Edge breakdown:');
  for (const [type, count] of Object.entries(edgesByType)) {
    console.log(`     ${type}: ${count}`);
  }

  // Step 5: Get group suggestions
  console.log('\n💡 Step 5: Getting group suggestions...');
  const suggestions = await RelationshipDiscoveryService.getSuggestedGroups(testUserId);
  console.log(`   Found ${suggestions.length} suggestions:`);
  for (const suggestion of suggestions) {
    console.log(`   - [${suggestion.type}] ${suggestion.name}: ${suggestion.reason}`);
    console.log(`     Members: ${suggestion.members.map(m => m.name).join(', ')}`);
  }

  // Step 6: Get stats
  console.log('\n📈 Step 6: Graph statistics...');
  const stats = await RelationshipDiscoveryService.getDiscoveryStats(testUserId);
  console.log(`   Contact nodes: ${stats.contactCount}`);
  console.log(`   Company nodes: ${stats.companyCount}`);
  console.log(`   Tag nodes: ${stats.tagCount}`);

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await neo4jClient.write(
    'MATCH (n {userId: $userId}) DETACH DELETE n',
    { userId: testUserId }
  );

  console.log('\n' + '='.repeat(50));
  console.log('✅ All graph discovery tests passed!');
  console.log('='.repeat(50) + '\n');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  await neo4jClient.disconnect();
}
