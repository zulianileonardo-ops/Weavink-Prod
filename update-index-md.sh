#!/bin/bash
# Generate INDEX.md from docs-index.json

node << 'EOF'
const fs = require('fs');

// Read docs-index.json
const index = JSON.parse(fs.readFileSync('docs-index.json', 'utf8'));

// Start building INDEX.md
let output = `# Weavink Documentation Index\n\n`;
output += `**Last Updated:** ${index.metadata.last_updated}\n`;
output += `**Total Guides:** ${index.metadata.total_guides}\n\n`;

// Quick Navigation
output += `## Quick Navigation\n`;
for (const [key, category] of Object.entries(index.categories)) {
  const count = category.guides.length;
  const name = category.name;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  output += `- [${name}](#${slug}) (${count} guides)\n`;
}
output += `\n---\n\n`;

// Generate each category section
for (const [key, category] of Object.entries(index.categories)) {
  output += `## ${category.name}\n`;
  output += `*${category.description}*\n\n`;

  // Find guides in this category
  const categoryGuides = index.guides.filter(g => category.guides.includes(g.id));

  // Sort by ID
  categoryGuides.sort((a, b) => a.id.localeCompare(b.id));

  for (const guide of categoryGuides) {
    const filename = guide.filename.split('/').pop();
    output += `### ${filename}\n`;
    output += `**Summary:** ${guide.summary}\n`;
    output += `**Tags:** ${guide.tags.join(', ')}\n`;

    if (guide.related_guides && guide.related_guides.length > 0) {
      const related = guide.related_guides.map(r => {
        const slug = r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `[${r}](#${slug})`;
      }).join(', ');
      output += `**Related:** ${related}\n`;
    }

    output += `\n`;
  }

  output += `---\n\n`;
}

// Write to INDEX.md
fs.writeFileSync('INDEX.md', output, 'utf8');
console.log('✅ INDEX.md regenerated successfully');
console.log(`📊 Total guides: ${index.metadata.total_guides}`);
EOF
