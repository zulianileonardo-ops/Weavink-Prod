#!/usr/bin/env python3
"""
Magic String Refactor Tool for Weavink

Finds magic strings that should be replaced with constants.
Provides refactoring guidance and can generate patches.

Usage:
    python3 refactor.py --scan                    # Scan for magic strings
    python3 refactor.py --scan --type subscription  # Scan for specific type
    python3 refactor.py --generate-patches        # Generate refactoring patches
"""

import json
import os
import sys
import re
import subprocess
from pathlib import Path
from collections import defaultdict

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

class MagicStringRefactorer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.index_path = self.project_root / ".claude/skills/constant-manager-skill/constants-index.json"
        self.index = self.load_index()
        self.findings = defaultdict(list)

        # Magic string patterns to search for
        self.patterns = {
            'subscription': {
                'strings': ['base', 'pro', 'premium', 'business', 'enterprise'],
                'constant': 'SUBSCRIPTION_LEVELS',
                'import': "import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';",
                'examples': {
                    "'pro'": "SUBSCRIPTION_LEVELS.PRO",
                    "'premium'": "SUBSCRIPTION_LEVELS.PREMIUM",
                    "'base'": "SUBSCRIPTION_LEVELS.BASE"
                }
            },
            'role': {
                'strings': ['manager', 'employee', 'contractor', 'intern', 'view_only'],
                'constant': 'TEAM_ROLES',
                'import': "import { TEAM_ROLES } from '@/lib/services/constants';",
                'examples': {
                    "'manager'": "TEAM_ROLES.MANAGER",
                    "'employee'": "TEAM_ROLES.EMPLOYEE"
                }
            },
            'org_role': {
                'strings': ['owner', 'admin', 'member', 'billing'],
                'constant': 'ORGANIZATION_ROLES',
                'import': "import { ORGANIZATION_ROLES } from '@/lib/services/constants';",
                'examples': {
                    "'owner'": "ORGANIZATION_ROLES.OWNER",
                    "'admin'": "ORGANIZATION_ROLES.ADMIN"
                }
            }
        }

    def load_index(self):
        """Load constants-index.json"""
        if not self.index_path.exists():
            print(f"{Colors.FAIL}Error: constants-index.json not found{Colors.ENDC}")
            sys.exit(1)

        with open(self.index_path, 'r') as f:
            return json.load(f)

    def scan_for_magic_strings(self, string_type=None):
        """Scan codebase for magic strings"""
        print(f"\n{Colors.OKCYAN}Scanning for magic strings...{Colors.ENDC}")

        patterns_to_scan = {}
        if string_type:
            if string_type in self.patterns:
                patterns_to_scan[string_type] = self.patterns[string_type]
            else:
                print(f"{Colors.FAIL}Unknown type: {string_type}{Colors.ENDC}")
                print(f"Available types: {', '.join(self.patterns.keys())}")
                sys.exit(1)
        else:
            patterns_to_scan = self.patterns

        for pattern_type, pattern_info in patterns_to_scan.items():
            print(f"\n{Colors.OKBLUE}Searching for {pattern_type} magic strings...{Colors.ENDC}")

            for magic_string in pattern_info['strings']:
                # Search in app/ and lib/ directories
                self.search_string(magic_string, pattern_type, pattern_info)

    def search_string(self, magic_string, pattern_type, pattern_info):
        """Search for a specific magic string using grep"""
        try:
            # Build grep pattern - looking for quoted strings
            grep_pattern = f"['\\\"]{ magic_string}['\\\"]"

            # Run grep
            result = subprocess.run(
                ['grep', '-rn', '-E', grep_pattern, 'app/', 'lib/',
                 '--include=*.js', '--include=*.jsx'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )

            if result.returncode == 0 and result.stdout:
                lines = result.stdout.strip().split('\n')

                # Filter out false positives (database strings, comments, etc.)
                filtered_lines = self.filter_results(lines, magic_string)

                if filtered_lines:
                    for line in filtered_lines:
                        file_and_line = line.split(':', 1)
                        if len(file_and_line) >= 2:
                            file_path = file_and_line[0]
                            line_info = file_and_line[1]

                            self.findings[pattern_type].append({
                                'file': file_path,
                                'line': line_info,
                                'magic_string': magic_string,
                                'constant': pattern_info['constant'],
                                'replacement': self.get_replacement(magic_string, pattern_type),
                                'import': pattern_info['import']
                            })

        except FileNotFoundError:
            print(f"{Colors.FAIL}Error: grep not found{Colors.ENDC}")
            sys.exit(1)
        except Exception as e:
            print(f"{Colors.WARNING}Error searching for {magic_string}: {e}{Colors.ENDC}")

    def filter_results(self, lines, magic_string):
        """Filter out false positives"""
        filtered = []

        # Patterns to exclude
        exclude_patterns = [
            'database',  # Database field names
            'Supabase',
            'createClient',
            'process.env',
            '//',  # Comments
            '/*',
            '*/',
            'console.log',  # Debug statements
            '.md',  # Markdown files
            '.json'  # JSON files
        ]

        for line in lines:
            # Check if line should be excluded
            should_exclude = False
            for exclude in exclude_patterns:
                if exclude in line:
                    should_exclude = True
                    break

            if not should_exclude:
                filtered.append(line)

        return filtered

    def get_replacement(self, magic_string, pattern_type):
        """Get the constant replacement for a magic string"""
        pattern_info = self.patterns.get(pattern_type, {})
        examples = pattern_info.get('examples', {})

        # Try exact match
        for magic, replacement in examples.items():
            if magic_string in magic:
                return replacement

        # Generate from pattern
        constant_name = pattern_info.get('constant', '')
        if constant_name:
            # Convert 'pro' to PRO, 'view_only' to VIEW_ONLY
            key = magic_string.upper()
            return f"{constant_name}.{key}"

        return f"<CONSTANT>.{magic_string.upper()}"

    def print_findings(self):
        """Print all findings"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}MAGIC STRING REFACTORING REPORT{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")

        total_findings = sum(len(findings) for findings in self.findings.values())

        if total_findings == 0:
            print(f"\n{Colors.OKGREEN}✅ No magic strings found!{Colors.ENDC}")
            return

        print(f"\n{Colors.WARNING}Found {total_findings} magic string(s) to refactor{Colors.ENDC}\n")

        # Group by file
        files_affected = defaultdict(list)

        for pattern_type, findings in self.findings.items():
            for finding in findings:
                files_affected[finding['file']].append(finding)

        # Print by file
        print(f"{Colors.OKBLUE}Files affected: {len(files_affected)}{Colors.ENDC}\n")

        for file_path, findings in sorted(files_affected.items()):
            print(f"{Colors.BOLD}{file_path}{Colors.ENDC}")

            # Group by line to avoid duplicates
            seen_lines = set()
            imports_needed = set()

            for finding in findings:
                line_key = finding['line'][:50]  # First 50 chars
                if line_key not in seen_lines:
                    seen_lines.add(line_key)
                    imports_needed.add(finding['import'])

                    magic_str = f"'{finding['magic_string']}'"
                    replacement = finding['replacement']

                    print(f"   {Colors.WARNING}'{finding['magic_string']}'{Colors.ENDC} → {Colors.OKGREEN}{replacement}{Colors.ENDC}")
                    print(f"   {Colors.OKCYAN}{finding['line'][:80]}{Colors.ENDC}")

            # Show required import
            if imports_needed:
                print(f"\n   {Colors.OKBLUE}Required import:{Colors.ENDC}")
                for imp in imports_needed:
                    print(f"   {imp}")

            print()

    def generate_refactoring_guide(self):
        """Generate step-by-step refactoring guide"""
        if not self.findings:
            return

        print(f"\n{Colors.HEADER}{Colors.BOLD}REFACTORING GUIDE{Colors.ENDC}\n")

        # Group by file
        files_affected = defaultdict(list)
        for pattern_type, findings in self.findings.items():
            for finding in findings:
                files_affected[finding['file']].append(finding)

        print(f"Steps to refactor {len(files_affected)} file(s):\n")

        for idx, (file_path, findings) in enumerate(sorted(files_affected.items()), 1):
            print(f"{idx}. {Colors.BOLD}{file_path}{Colors.ENDC}")

            # Get unique imports needed
            imports_needed = set(f['import'] for f in findings)

            # Get unique replacements
            replacements = {}
            for f in findings:
                magic = f"'{f['magic_string']}'"
                if magic not in replacements:
                    replacements[magic] = f['replacement']

            print(f"   {Colors.OKCYAN}a) Add import at top of file:{Colors.ENDC}")
            for imp in sorted(imports_needed):
                print(f"      {imp}")

            print(f"   {Colors.OKCYAN}b) Replace magic strings:{Colors.ENDC}")
            for magic, replacement in sorted(replacements.items()):
                print(f"      {magic} → {replacement}")

            print()

        print(f"{Colors.WARNING}⚠️  IMPORTANT:{Colors.ENDC}")
        print(f"   - Review each replacement manually")
        print(f"   - Ensure context is correct (not database fields, etc.)")
        print(f"   - Test after refactoring")
        print(f"   - Run: npm run build")
        print()

    def generate_statistics(self):
        """Generate statistics"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}STATISTICS{Colors.ENDC}\n")

        for pattern_type, findings in sorted(self.findings.items()):
            if findings:
                print(f"{Colors.OKBLUE}{pattern_type.upper()}:{Colors.ENDC}")
                print(f"   Total occurrences: {len(findings)}")

                # Count by magic string
                string_counts = defaultdict(int)
                for f in findings:
                    string_counts[f['magic_string']] += 1

                print(f"   Breakdown:")
                for string, count in sorted(string_counts.items(), key=lambda x: x[1], reverse=True):
                    print(f"      '{string}': {count}")
                print()

def main():
    if len(sys.argv) < 2:
        print(f"{Colors.HEADER}{Colors.BOLD}Weavink Magic String Refactor Tool{Colors.ENDC}")
        print("\nUsage:")
        print("  python3 refactor.py --scan                      # Scan all magic strings")
        print("  python3 refactor.py --scan --type subscription  # Scan specific type")
        print("  python3 refactor.py --scan --guide              # Generate refactoring guide")
        print("\nTypes:")
        print("  subscription  - base, pro, premium, business, enterprise")
        print("  role          - manager, employee, contractor, intern, view_only")
        print("  org_role      - owner, admin, member, billing")
        sys.exit(1)

    # Get project root
    project_root = Path(__file__).parent.parent.parent.parent

    # Create refactorer
    refactorer = MagicStringRefactorer(project_root)

    # Parse arguments
    if '--scan' in sys.argv:
        string_type = None
        if '--type' in sys.argv:
            type_idx = sys.argv.index('--type')
            if type_idx + 1 < len(sys.argv):
                string_type = sys.argv[type_idx + 1]

        # Scan
        refactorer.scan_for_magic_strings(string_type)

        # Print findings
        refactorer.print_findings()

        # Generate statistics
        refactorer.generate_statistics()

        # Generate guide if requested
        if '--guide' in sys.argv:
            refactorer.generate_refactoring_guide()

    else:
        print(f"{Colors.FAIL}Error: Unknown command{Colors.ENDC}")
        print(f"Run with --scan to scan for magic strings")
        sys.exit(1)

if __name__ == '__main__':
    main()
