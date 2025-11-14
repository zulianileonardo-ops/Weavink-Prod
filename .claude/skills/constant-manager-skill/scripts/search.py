#!/usr/bin/env python3
"""
Constant Search Tool for Weavink

Searches for constants by name, category, or usage.
Integrates with constants-index.json for fast lookups.

Usage:
    python3 search.py CONSTANT_NAME
    python3 search.py --category contact
    python3 search.py --usage session.js
"""

import json
import os
import sys
import re
from pathlib import Path

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def load_index():
    """Load constants-index.json"""
    index_path = Path(__file__).parent.parent / "constants-index.json"

    if not index_path.exists():
        print(f"{Colors.FAIL}Error: constants-index.json not found at {index_path}{Colors.ENDC}")
        sys.exit(1)

    with open(index_path, 'r') as f:
        return json.load(f)

def search_by_name(index, query):
    """Search constants by name"""
    results = []
    query_lower = query.lower()

    for const in index['constants']:
        if query_lower in const['id'].lower():
            results.append(const)

    return results

def search_by_category(index, category):
    """Search constants by category"""
    results = []

    for const in index['constants']:
        if const['category'] == category:
            results.append(const)

    return results

def search_by_usage(index, file_pattern):
    """Search constants by usage in files"""
    results = []

    for const in index['constants']:
        # Check if file pattern matches any file in usedBy
        for used_file in const.get('usedBy', []):
            if file_pattern.lower() in used_file.lower():
                results.append(const)
                break

    return results

def search_by_file(index, file_path):
    """Search constants defined in a specific file"""
    results = []

    for const in index['constants']:
        if file_path in const['file']:
            results.append(const)

    return results

def display_result(const, detailed=False):
    """Display a single constant result"""
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}📄 {const['id']}{Colors.ENDC}")
    print(f"   {Colors.OKCYAN}Location:{Colors.ENDC} {const['file']}")
    print(f"   {Colors.OKCYAN}Type:{Colors.ENDC} {const['type']}")
    print(f"   {Colors.OKCYAN}Category:{Colors.ENDC} {const['category']}")

    if 'description' in const:
        print(f"   {Colors.OKCYAN}Description:{Colors.ENDC} {const['description']}")

    if detailed:
        if 'values' in const:
            print(f"   {Colors.OKCYAN}Values:{Colors.ENDC} {', '.join(const['values'])}")

        if 'count' in const:
            print(f"   {Colors.OKCYAN}Count:{Colors.ENDC} {const['count']}")

        if 'usedBy' in const:
            print(f"   {Colors.OKCYAN}Used by:{Colors.ENDC} {len(const['usedBy'])} files")
            for file in const['usedBy'][:5]:  # Show first 5
                print(f"      - {file}")
            if len(const['usedBy']) > 5:
                print(f"      ... and {len(const['usedBy']) - 5} more")

        if 'importCount' in const:
            print(f"   {Colors.OKCYAN}Import count:{Colors.ENDC} {const['importCount']}")

        if 'structure' in const:
            print(f"   {Colors.OKCYAN}Structure:{Colors.ENDC}")
            if isinstance(const['structure'], dict):
                for key, value in const['structure'].items():
                    print(f"      {key}: {value}")
            else:
                print(f"      {const['structure']}")

        if 'note' in const:
            print(f"   {Colors.WARNING}Note:{Colors.ENDC} {const['note']}")

def display_summary(index, results):
    """Display summary statistics"""
    if not results:
        print(f"\n{Colors.WARNING}No constants found matching your query.{Colors.ENDC}")
        return

    print(f"\n{Colors.OKGREEN}{Colors.BOLD}🔍 Found {len(results)} constant(s){Colors.ENDC}")

    # Category breakdown
    categories = {}
    for const in results:
        cat = const['category']
        categories[cat] = categories.get(cat, 0) + 1

    if len(categories) > 1:
        print(f"\n{Colors.OKCYAN}By Category:{Colors.ENDC}")
        for cat, count in sorted(categories.items()):
            print(f"   {cat}: {count}")

def find_constant_in_files(const_name, project_root):
    """Find actual usage of constant in code files"""
    import subprocess

    try:
        # Use grep to find constant usage
        result = subprocess.run(
            ['grep', '-r', const_name, 'app/', 'lib/', '--include=*.js', '--include=*.jsx'],
            cwd=project_root,
            capture_output=True,
            text=True
        )

        if result.returncode == 0 and result.stdout:
            lines = result.stdout.strip().split('\n')
            print(f"\n{Colors.OKCYAN}Found in {len(lines)} location(s):{Colors.ENDC}")

            # Show first 10 matches
            for line in lines[:10]:
                file_path, content = line.split(':', 1)
                print(f"   {file_path}: {content.strip()[:80]}")

            if len(lines) > 10:
                print(f"   ... and {len(lines) - 10} more")
        else:
            print(f"\n{Colors.WARNING}No usage found in code files.{Colors.ENDC}")

    except FileNotFoundError:
        print(f"\n{Colors.WARNING}grep not available, skipping file search.{Colors.ENDC}")
    except Exception as e:
        print(f"\n{Colors.WARNING}Error searching files: {e}{Colors.ENDC}")

def main():
    if len(sys.argv) < 2:
        print(f"{Colors.HEADER}{Colors.BOLD}Weavink Constant Search Tool{Colors.ENDC}")
        print("\nUsage:")
        print("  python3 search.py CONSTANT_NAME          - Search by name")
        print("  python3 search.py --category CATEGORY    - Search by category")
        print("  python3 search.py --usage FILE           - Search by usage")
        print("  python3 search.py --file FILE            - Search by definition file")
        print("  python3 search.py --all                  - List all constants")
        print("\nExamples:")
        print("  python3 search.py SUBSCRIPTION")
        print("  python3 search.py --category core")
        print("  python3 search.py --usage session.js")
        print("  python3 search.py --file contactConstants.js")
        sys.exit(1)

    # Load index
    index = load_index()

    # Parse arguments
    query = sys.argv[1]
    detailed = '--detailed' in sys.argv or '-d' in sys.argv
    show_usage = '--show-usage' in sys.argv

    results = []

    if query == '--all':
        results = index['constants']
        print(f"\n{Colors.HEADER}{Colors.BOLD}All Constants ({len(results)}){Colors.ENDC}")

    elif query == '--category':
        if len(sys.argv) < 3:
            print(f"{Colors.FAIL}Error: --category requires a category name{Colors.ENDC}")
            sys.exit(1)
        category = sys.argv[2]
        results = search_by_category(index, category)
        print(f"\n{Colors.HEADER}{Colors.BOLD}Constants in category '{category}'{Colors.ENDC}")

    elif query == '--usage':
        if len(sys.argv) < 3:
            print(f"{Colors.FAIL}Error: --usage requires a file pattern{Colors.ENDC}")
            sys.exit(1)
        file_pattern = sys.argv[2]
        results = search_by_usage(index, file_pattern)
        print(f"\n{Colors.HEADER}{Colors.BOLD}Constants used by '{file_pattern}'{Colors.ENDC}")

    elif query == '--file':
        if len(sys.argv) < 3:
            print(f"{Colors.FAIL}Error: --file requires a file path{Colors.ENDC}")
            sys.exit(1)
        file_path = sys.argv[2]
        results = search_by_file(index, file_path)
        print(f"\n{Colors.HEADER}{Colors.BOLD}Constants in file '{file_path}'{Colors.ENDC}")

    else:
        # Search by name
        results = search_by_name(index, query)
        print(f"\n{Colors.HEADER}{Colors.BOLD}Search results for '{query}'{Colors.ENDC}")

    # Display results
    display_summary(index, results)

    for const in results:
        display_result(const, detailed=True)

    # If single result and show-usage, find in files
    if len(results) == 1 and show_usage:
        project_root = Path(__file__).parent.parent.parent.parent
        find_constant_in_files(results[0]['id'], project_root)

if __name__ == '__main__':
    main()
