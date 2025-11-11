#!/usr/bin/env python3
"""
Search the documentation index by keyword, function, tag, or category.
Usage: python search.py <query> [--category <category>]
"""

import json
import sys
import os
from pathlib import Path

def search_guides(query, category=None, index_path="~/temp2/temp2/docs-index.json"):
    """Search for guides matching the query."""
    index_path = os.path.expanduser(index_path)
    
    if not os.path.exists(index_path):
        print(f"❌ Index not found: {index_path}")
        return []
    
    try:
        with open(index_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in index: {e}")
        return []
    
    results = []
    query_lower = query.lower()
    
    for guide in data.get('guides', []):
        # Skip if category filter doesn't match
        if category and guide.get('category') != category:
            continue
        
        # Search in multiple fields
        matches = []
        
        # Title match
        if query_lower in guide.get('title', '').lower():
            matches.append('title')
        
        # Function match
        if any(query_lower in func.lower() for func in guide.get('functions', [])):
            matches.append('function')
        
        # Component match
        if any(query_lower in comp.lower() for comp in guide.get('components', [])):
            matches.append('component')
        
        # Tag match
        if any(query_lower in tag.lower() for tag in guide.get('tags', [])):
            matches.append('tag')
        
        # Summary match
        if query_lower in guide.get('summary', '').lower():
            matches.append('summary')
        
        if matches:
            guide['_match_types'] = matches
            results.append(guide)
    
    return results

def format_results(results):
    """Format search results for display."""
    if not results:
        print("❌ No guides found")
        return
    
    print(f"📚 Found {len(results)} guide(s):\n")
    
    status_icons = {
        'active': '✅',
        'superseded': '⚠️',
        'draft': '🚧',
        'deprecated': '⛔'
    }
    
    for i, guide in enumerate(results, 1):
        status = guide.get('status', 'active')
        icon = status_icons.get(status, '❓')
        
        print(f"{i}. {icon} **{guide['filename']}**")
        print(f"   ID: {guide['id']}")
        print(f"   Category: {guide['category']}")
        print(f"   Summary: {guide['summary']}")
        print(f"   Tags: {', '.join(guide.get('tags', []))}")
        
        if guide.get('functions'):
            print(f"   Functions: {', '.join(guide['functions'])}")
        
        if guide.get('components'):
            print(f"   Components: {', '.join(guide['components'])}")
        
        print(f"   Match: {', '.join(guide['_match_types'])}")
        
        if guide.get('related_guides'):
            print(f"   Related: {len(guide['related_guides'])} guide(s)")
        
        print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python search.py <query> [--category <category>]")
        print("\nExamples:")
        print("  python search.py login")
        print("  python search.py analytics --category admin")
        print("  python search.py exportContacts")
        sys.exit(1)
    
    query = sys.argv[1]
    category = None
    
    if '--category' in sys.argv:
        idx = sys.argv.index('--category')
        if idx + 1 < len(sys.argv):
            category = sys.argv[idx + 1]
    
    results = search_guides(query, category)
    format_results(results)
