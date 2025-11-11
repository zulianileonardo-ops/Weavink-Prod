#!/usr/bin/env python3
"""
Validate the documentation index for consistency issues.
Checks for: duplicate IDs, broken relationships, missing files, orphaned guides, etc.
Usage: python validate.py
"""

import json
import os
import sys
from pathlib import Path
from collections import Counter

def validate_index(index_path="~/temp2/temp2/docs-index.json", docs_dir="~/temp2/temp2/"):
    """Validate the documentation index."""
    index_path = os.path.expanduser(index_path)
    docs_dir = os.path.expanduser(docs_dir)
    
    if not os.path.exists(index_path):
        print(f"❌ Index not found: {index_path}")
        return False
    
    try:
        with open(index_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False
    
    print("🔍 Validating documentation index...\n")
    
    issues = []
    warnings = []
    
    guides = data.get('guides', [])
    categories = data.get('categories', {})
    metadata = data.get('metadata', {})
    
    # Check 1: Duplicate IDs
    print("1️⃣ Checking for duplicate IDs...")
    ids = [g['id'] for g in guides]
    id_counts = Counter(ids)
    duplicates = [id for id, count in id_counts.items() if count > 1]
    if duplicates:
        issues.append(f"Duplicate IDs found: {', '.join(duplicates)}")
    else:
        print("   ✅ No duplicate IDs")
    
    # Check 2: Missing files
    print("\n2️⃣ Checking for missing guide files...")
    missing_files = []
    for guide in guides:
        filename = guide.get('filename', '')
        filepath = os.path.join(docs_dir, filename)
        if not os.path.exists(filepath):
            missing_files.append(filename)
    
    if missing_files:
        issues.append(f"Missing files: {', '.join(missing_files)}")
    else:
        print("   ✅ All guide files exist")
    
    # Check 3: Orphaned files
    print("\n3️⃣ Checking for orphaned markdown files...")
    if os.path.exists(docs_dir):
        actual_files = {f for f in os.listdir(docs_dir) if f.endswith('.md')}
        indexed_files = {g['filename'] for g in guides}
        orphaned = actual_files - indexed_files - {'INDEX.md'}  # Exclude INDEX.md
        
        if orphaned:
            warnings.append(f"Orphaned files (not in index): {', '.join(sorted(orphaned))}")
        else:
            print("   ✅ No orphaned files")
    
    # Check 4: Broken relationships
    print("\n4️⃣ Checking for broken relationships...")
    all_ids = {g['id'] for g in guides}
    broken_rels = []
    for guide in guides:
        for related_id in guide.get('related_guides', []):
            if related_id not in all_ids:
                broken_rels.append(f"{guide['id']} → {related_id}")
    
    if broken_rels:
        issues.append(f"Broken relationships: {', '.join(broken_rels)}")
    else:
        print("   ✅ No broken relationships")
    
    # Check 5: Category consistency
    print("\n5️⃣ Checking category assignments...")
    category_issues = []
    for cat_name, cat_data in categories.items():
        for guide_id in cat_data.get('guides', []):
            # Find the guide
            guide = next((g for g in guides if g['id'] == guide_id), None)
            if not guide:
                category_issues.append(f"Category '{cat_name}' references non-existent guide: {guide_id}")
            elif guide.get('category') != cat_name:
                category_issues.append(f"Guide {guide_id} has category '{guide.get('category')}' but listed in '{cat_name}'")
    
    if category_issues:
        issues.extend(category_issues)
    else:
        print("   ✅ Categories are consistent")
    
    # Check 6: Metadata accuracy
    print("\n6️⃣ Checking metadata...")
    total_guides = metadata.get('total_guides', 0)
    actual_total = len(guides)
    if total_guides != actual_total:
        warnings.append(f"Metadata shows {total_guides} guides but found {actual_total}")
    else:
        print(f"   ✅ Metadata accurate ({actual_total} guides)")
    
    # Check 7: Required fields
    print("\n7️⃣ Checking required fields...")
    required_fields = ['id', 'title', 'filename', 'category', 'summary', 'tags', 'status']
    field_issues = []
    for guide in guides:
        missing = [f for f in required_fields if f not in guide or not guide[f]]
        if missing:
            field_issues.append(f"{guide.get('id', 'unknown')}: missing {', '.join(missing)}")
    
    if field_issues:
        issues.extend(field_issues)
    else:
        print("   ✅ All guides have required fields")
    
    # Check 8: Status values
    print("\n8️⃣ Checking status values...")
    valid_statuses = {'active', 'superseded', 'draft', 'deprecated'}
    invalid_status = []
    for guide in guides:
        status = guide.get('status', '')
        if status not in valid_statuses:
            invalid_status.append(f"{guide['id']}: '{status}'")
    
    if invalid_status:
        warnings.extend(invalid_status)
    else:
        print("   ✅ All statuses are valid")
    
    # Summary
    print("\n" + "="*60)
    print("📊 VALIDATION SUMMARY")
    print("="*60)
    
    if not issues and not warnings:
        print("✅ All checks passed! Documentation index is healthy.")
        return True
    
    if issues:
        print(f"\n❌ ISSUES ({len(issues)}):")
        for issue in issues:
            print(f"   • {issue}")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"   • {warning}")
    
    return len(issues) == 0

if __name__ == "__main__":
    success = validate_index()
    sys.exit(0 if success else 1)
