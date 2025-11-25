#!/usr/bin/env node
// scripts/test-neo4j-connection.mjs
// Test Neo4j AuraDB connection and basic operations

import 'dotenv/config';
import neo4j from 'neo4j-driver';

console.log('🔌 Neo4j Connection Test\n');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Environment Check:');
console.log(`   NEO4J_URI: ${process.env.NEO4J_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`   NEO4J_USERNAME: ${process.env.NEO4J_USERNAME ? '✅ Set' : '❌ Missing'}`);
console.log(`   NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? '✅ Set' : '❌ Missing'}`);
console.log(`   ENABLE_NEO4J_SYNC: ${process.env.ENABLE_NEO4J_SYNC}`);

if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) {
  console.error('\n❌ Missing required environment variables!');
  process.exit(1);
}

let driver;
try {
  console.log('\n🔄 Connecting to Neo4j AuraDB...');

  driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME || 'neo4j', process.env.NEO4J_PASSWORD),
    {
      maxConnectionPoolSize: 10,
      connectionTimeout: 30000
    }
  );

  // Verify connectivity
  const serverInfo = await driver.getServerInfo();
  console.log(`\n✅ Connected successfully!`);
  console.log(`   Server: ${serverInfo.address}`);
  console.log(`   Protocol: ${serverInfo.protocolVersion}`);

  // Test basic query
  console.log('\n🔄 Testing basic query...');
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });

  try {
    const result = await session.run('RETURN 1 as test, datetime() as serverTime');
    const record = result.records[0];
    console.log(`   Test value: ${record.get('test')}`);
    console.log(`   Server time: ${record.get('serverTime').toString()}`);
    console.log('✅ Basic query successful!\n');

    // Test schema creation (create constraints/indexes if not exist)
    console.log('🔄 Setting up graph schema...');

    // Create constraint for Contact nodes
    try {
      await session.run(`
        CREATE CONSTRAINT contact_id IF NOT EXISTS
        FOR (c:Contact) REQUIRE (c.id, c.userId) IS UNIQUE
      `);
      console.log('   ✅ Contact constraint created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Contact constraint already exists');
      } else {
        console.log(`   ⚠️  Contact constraint: ${e.message}`);
      }
    }

    // Create constraint for Company nodes
    try {
      await session.run(`
        CREATE CONSTRAINT company_name IF NOT EXISTS
        FOR (co:Company) REQUIRE (co.name, co.userId) IS UNIQUE
      `);
      console.log('   ✅ Company constraint created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Company constraint already exists');
      } else {
        console.log(`   ⚠️  Company constraint: ${e.message}`);
      }
    }

    // Create index for faster userId lookups
    try {
      await session.run(`
        CREATE INDEX contact_userId IF NOT EXISTS
        FOR (c:Contact) ON (c.userId)
      `);
      console.log('   ✅ Contact userId index created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Contact userId index already exists');
      } else {
        console.log(`   ⚠️  Contact userId index: ${e.message}`);
      }
    }

    // Test creating a sample node
    console.log('\n🔄 Testing node creation...');
    const testResult = await session.run(`
      MERGE (t:TestNode {id: 'connection-test'})
      SET t.timestamp = datetime(),
          t.message = 'Neo4j connection test successful'
      RETURN t
    `);
    console.log('   ✅ Test node created/updated');

    // Check current node counts
    console.log('\n📊 Current Graph Statistics:');
    const statsResult = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as label, count(n) as count
      ORDER BY count DESC
    `);

    if (statsResult.records.length === 0) {
      console.log('   (No nodes in database yet)');
    } else {
      for (const record of statsResult.records) {
        const label = record.get('label');
        const count = record.get('count').toNumber ? record.get('count').toNumber() : record.get('count');
        console.log(`   ${label}: ${count} nodes`);
      }
    }

    // Clean up test node
    await session.run(`MATCH (t:TestNode {id: 'connection-test'}) DELETE t`);
    console.log('\n🧹 Test node cleaned up');

  } finally {
    await session.close();
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed! Neo4j is ready for use.');
  console.log('='.repeat(50) + '\n');

} catch (error) {
  console.error('\n❌ Connection failed:', error.message);
  if (error.code) {
    console.error(`   Error code: ${error.code}`);
  }
  process.exit(1);
} finally {
  if (driver) {
    await driver.close();
  }
}
