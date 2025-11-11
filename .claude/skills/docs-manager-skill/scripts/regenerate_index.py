#!/usr/bin/env python3
"""
Regenerate INDEX.md from docs-index.json.
Creates a human-readable master guide organized by category.
Usage: python regenerate_index.py
"""

import json
import os
from datetime import datetime

def regenerate_index(index_path="~/temp2/temp2/docs-index.json", output_path="~/temp2/temp2/INDEX.md"):
    """Regenerate INDEX.md from the JSON index."""
    index_path = os.path.expanduser(index_path)
    output_path = os.path.expanduser(output_path)
    
    if not os.path.exists(index_path):
        print(f"❌ Index not found: {index_path}")
        return False
    
    try:
        with open(index_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False
    
    metadata = data.get('metadata', {})
    categories = data.get('categories', {})
    guides = data.get('guides', [])
    
    # Create guide lookup
    guide_lookup = {g['id']: g for g in guides}
    
    # Build markdown content
    md_lines = []
    
    # Header
    md_lines.append("# Weavink Documentation Index")
    md_lines.append("")
    md_lines.append(f"**Last Updated:** {datetime.now().strftime('%Y-%m-%d')}")
    md_lines.append(f"**Total Guides:** {len(guides)}")
    md_lines.append("")
    
    # Quick Navigation
    md_lines.append("## Quick Navigation")
    for cat_id, cat_data in categories.items():
        count = len(cat_data.get('guides', []))
        anchor = cat_data['name'].lower().replace(' ', '-').replace('/', '')
        md_lines.append(f"- [{cat_data['name']}](#{anchor}) ({count} guides)")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    
    # Categories and guides
    for cat_id, cat_data in categories.items():
        md_lines.append(f"## {cat_data['name']}")
        md_lines.append(f"*{cat_data['description']}*")
        md_lines.append("")
        
        # Get guides for this category
        cat_guide_ids = cat_data.get('guides', [])
        cat_guides = [guide_lookup[gid] for gid in cat_guide_ids if gid in guide_lookup]
        
        for guide in cat_guides:
            # Guide header
            md_lines.append(f"### {guide['filename']}")
            
            # Summary
            md_lines.append(f"**Summary:** {guide['summary']}")
            
            # Tags
            tags_str = ', '.join(guide.get('tags', []))
            md_lines.append(f"**Tags:** {tags_str}")
            
            # Related guides
            if guide.get('related_guides'):
                related_links = []
                for rel_id in guide['related_guides']:
                    if rel_id in guide_lookup:
                        rel_guide = guide_lookup[rel_id]
                        rel_filename = rel_guide['filename']
                        # Create anchor link
                        anchor = rel_filename.lower().replace('.md', 'md').replace('_', '_')
                        related_links.append(f"[{rel_filename}](#{anchor})")
                
                if related_links:
                    md_lines.append(f"**Related:** {', '.join(related_links)}")
            
            md_lines.append("")
        
        md_lines.append("---")
        md_lines.append("")
    
    # Footer
    md_lines.append("## Status Legend")
    md_lines.append("- ✅ **Active** - Current and maintained")
    md_lines.append("- ⚠️ **Superseded** - Replaced by newer guide")
    md_lines.append("- 🚧 **Draft** - Work in progress")
    md_lines.append("- ⛔ **Deprecated** - No longer relevant")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("## Search Tips")
    md_lines.append("1. Use Ctrl+F to search by keyword")
    md_lines.append("2. Check \"Related\" sections for connected topics")
    md_lines.append("3. Tags help find guides by theme")
    md_lines.append("4. Status indicators show guide relevance")
    
    # Write to file
    try:
        with open(output_path, 'w') as f:
            f.write('\n'.join(md_lines))
        print(f"✅ Successfully regenerated {output_path}")
        print(f"   📊 {len(guides)} guides across {len(categories)} categories")
        return True
    except Exception as e:
        print(f"❌ Error writing file: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = regenerate_index()
    sys.exit(0 if success else 1)
