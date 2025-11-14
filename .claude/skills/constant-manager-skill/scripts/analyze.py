#!/usr/bin/env python3
"""
Constant Dependency Analyzer for Weavink

Analyzes constant dependencies and relationships:
- Maps which constants depend on which
- Finds circular dependencies
- Shows usage impact
- Generates dependency graphs

Usage:
    python3 analyze.py CONSTANT_NAME         # Analyze specific constant
    python3 analyze.py --all                 # Analyze all dependencies
    python3 analyze.py --circular            # Find circular dependencies
"""

import json
import os
import sys
import re
import subprocess
from pathlib import Path
from collections import defaultdict, deque

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

class DependencyAnalyzer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.index_path = self.project_root / ".claude/skills/constant-manager-skill/constants-index.json"
        self.index = self.load_index()
        self.dependencies = defaultdict(set)
        self.reverse_dependencies = defaultdict(set)

    def load_index(self):
        """Load constants-index.json"""
        if not self.index_path.exists():
            print(f"{Colors.FAIL}Error: constants-index.json not found{Colors.ENDC}")
            sys.exit(1)

        with open(self.index_path, 'r') as f:
            return json.load(f)

    def build_dependency_graph(self):
        """Build dependency graph from file metadata"""
        print(f"{Colors.OKCYAN}Building dependency graph...{Colors.ENDC}")

        # For each file, track its dependencies
        for file_path, file_info in self.index['files'].items():
            if file_info['role'] in ['domain', 'core']:
                file_deps = file_info.get('dependencies', [])

                # Get constants exported by this file
                exports = file_info.get('exports', [])

                for export_const in exports:
                    for dep_const in file_deps:
                        # This export depends on dep_const
                        self.dependencies[export_const].add(dep_const)
                        self.reverse_dependencies[dep_const].add(export_const)

    def analyze_constant(self, const_name):
        """Analyze dependencies for a specific constant"""
        # Find constant in index
        const = next((c for c in self.index['constants'] if c['id'] == const_name), None)

        if not const:
            print(f"{Colors.FAIL}Constant '{const_name}' not found{Colors.ENDC}")
            return

        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}DEPENDENCY ANALYSIS: {const_name}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")

        # Basic info
        print(f"\n{Colors.OKBLUE}Definition:{Colors.ENDC}")
        print(f"   File: {const['file']}")
        print(f"   Type: {const['type']}")
        print(f"   Category: {const['category']}")

        if 'description' in const:
            print(f"   Description: {const['description']}")

        # Direct dependencies (what this constant uses)
        if const_name in self.dependencies and self.dependencies[const_name]:
            print(f"\n{Colors.OKBLUE}Direct Dependencies:{Colors.ENDC}")
            print(f"   (Constants that {const_name} depends on)")
            for dep in sorted(self.dependencies[const_name]):
                print(f"   → {dep}")
        else:
            print(f"\n{Colors.OKGREEN}No direct dependencies{Colors.ENDC}")

        # Reverse dependencies (what depends on this constant)
        if const_name in self.reverse_dependencies and self.reverse_dependencies[const_name]:
            print(f"\n{Colors.OKBLUE}Reverse Dependencies:{Colors.ENDC}")
            print(f"   (Constants that depend on {const_name})")
            for dep in sorted(self.reverse_dependencies[const_name]):
                print(f"   ← {dep}")

        # Usage in files
        if 'usedBy' in const and const['usedBy']:
            print(f"\n{Colors.OKBLUE}Used by Files:{Colors.ENDC}")
            print(f"   {len(const['usedBy'])} file(s)")
            for file in sorted(const['usedBy'])[:10]:
                print(f"   • {file}")
            if len(const['usedBy']) > 10:
                print(f"   ... and {len(const['usedBy']) - 10} more")

        # Import count
        if 'importCount' in const:
            print(f"\n{Colors.OKBLUE}Import Count:{Colors.ENDC} {const['importCount']}")

        # Impact assessment
        self.assess_impact(const_name, const)

    def assess_impact(self, const_name, const):
        """Assess the impact of changes to this constant"""
        print(f"\n{Colors.WARNING}{Colors.BOLD}IMPACT ASSESSMENT{Colors.ENDC}")

        # Calculate total impact
        direct_dependents = len(self.reverse_dependencies.get(const_name, []))
        files_affected = len(const.get('usedBy', []))
        imports = const.get('importCount', 0)

        # Determine impact level
        if imports > 20 or direct_dependents > 5:
            impact_level = f"{Colors.FAIL}HIGH{Colors.ENDC}"
            recommendation = "Changes to this constant will have SIGNIFICANT impact. Coordinate with team."
        elif imports > 10 or direct_dependents > 2:
            impact_level = f"{Colors.WARNING}MEDIUM{Colors.ENDC}"
            recommendation = "Changes to this constant will affect multiple areas. Test thoroughly."
        else:
            impact_level = f"{Colors.OKGREEN}LOW{Colors.ENDC}"
            recommendation = "Changes to this constant have limited scope."

        print(f"\n   Impact Level: {impact_level}")
        print(f"\n   Direct dependents: {direct_dependents} constants")
        print(f"   Files affected: {files_affected}")
        print(f"   Import locations: {imports}")

        print(f"\n   {Colors.OKCYAN}Recommendation:{Colors.ENDC} {recommendation}")

        # Specific impacts based on type
        if const['type'] == 'enum' and 'values' in const:
            print(f"\n   {Colors.WARNING}If adding new value:{Colors.ENDC}")
            print(f"      - Update all switch/case statements")
            print(f"      - Update all validation logic")
            print(f"      - Update tests")

            if const_name == 'SUBSCRIPTION_LEVELS':
                print(f"      - Update ALL domain LIMITS objects (7 domains)")
                print(f"      - Update pricing in database")
                print(f"      - Update UI components")

        if const['type'] == 'subscription_limits_map':
            print(f"\n   {Colors.WARNING}If modifying limits:{Colors.ENDC}")
            print(f"      - Affects permission calculation in session.js")
            print(f"      - Update tests for new limits")
            print(f"      - Consider migration for existing users")

    def find_circular_dependencies(self):
        """Find circular dependencies in the constant graph"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}CIRCULAR DEPENDENCY CHECK{Colors.ENDC}\n")

        cycles = []
        visited = set()
        rec_stack = []

        def dfs(const, path):
            if const in rec_stack:
                # Found a cycle
                cycle_start = rec_stack.index(const)
                cycle = rec_stack[cycle_start:] + [const]
                cycles.append(cycle)
                return

            if const in visited:
                return

            visited.add(const)
            rec_stack.append(const)

            for dep in self.dependencies.get(const, []):
                dfs(dep, path + [dep])

            rec_stack.pop()

        # Check all constants
        for const in self.dependencies.keys():
            if const not in visited:
                dfs(const, [const])

        if cycles:
            print(f"{Colors.FAIL}Found {len(cycles)} circular dependenc(ies):{Colors.ENDC}\n")
            for idx, cycle in enumerate(cycles, 1):
                print(f"{idx}. {' → '.join(cycle)}")
        else:
            print(f"{Colors.OKGREEN}✅ No circular dependencies found{Colors.ENDC}")

    def analyze_all_dependencies(self):
        """Generate overview of all dependencies"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}ALL DEPENDENCIES OVERVIEW{Colors.ENDC}\n")

        # Sort constants by number of dependents (most depended on first)
        const_by_dependents = []
        for const_name in self.reverse_dependencies.keys():
            dependents = len(self.reverse_dependencies[const_name])
            const_by_dependents.append((const_name, dependents))

        const_by_dependents.sort(key=lambda x: x[1], reverse=True)

        print(f"{Colors.OKBLUE}Most Depended On Constants:{Colors.ENDC}\n")
        for const_name, dep_count in const_by_dependents[:10]:
            const = next((c for c in self.index['constants'] if c['id'] == const_name), None)
            if const:
                print(f"   {const_name}: {dep_count} dependents")
                print(f"      Category: {const['category']}")
                print(f"      Type: {const['type']}")
                print(f"      Imports: {const.get('importCount', 0)}")
                print()

        # Constants with no dependents
        no_dependents = []
        for const in self.index['constants']:
            if const['id'] not in self.reverse_dependencies:
                no_dependents.append(const['id'])

        if no_dependents:
            print(f"\n{Colors.WARNING}Constants with no dependents:{Colors.ENDC}")
            for const_name in sorted(no_dependents)[:10]:
                print(f"   • {const_name}")
            if len(no_dependents) > 10:
                print(f"   ... and {len(no_dependents) - 10} more")

    def generate_dependency_tree(self, const_name, max_depth=3):
        """Generate a tree visualization of dependencies"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}DEPENDENCY TREE: {const_name}{Colors.ENDC}\n")

        def print_tree(const, depth, visited, is_dependency=True):
            if depth > max_depth:
                return

            indent = "   " * depth
            prefix = "├─→" if is_dependency else "└─←"

            # Check if we've seen this before (cycle)
            cycle_marker = ""
            if const in visited:
                cycle_marker = f" {Colors.FAIL}(circular){Colors.ENDC}"

            print(f"{indent}{prefix} {const}{cycle_marker}")

            if const in visited:
                return

            visited.add(const)

            # Show what this depends on
            if is_dependency:
                deps = sorted(self.dependencies.get(const, []))
                for dep in deps:
                    print_tree(dep, depth + 1, visited.copy(), True)

            # Show what depends on this
            if not is_dependency:
                deps = sorted(self.reverse_dependencies.get(const, []))
                for dep in deps[:5]:  # Limit to 5 to avoid huge trees
                    print_tree(dep, depth + 1, visited.copy(), False)

        # Print forward dependencies
        print(f"{Colors.OKBLUE}Dependencies (what {const_name} uses):{Colors.ENDC}")
        print_tree(const_name, 0, set(), True)

        # Print reverse dependencies
        print(f"\n{Colors.OKBLUE}Dependents (what uses {const_name}):{Colors.ENDC}")
        print_tree(const_name, 0, set(), False)

def main():
    if len(sys.argv) < 2:
        print(f"{Colors.HEADER}{Colors.BOLD}Weavink Dependency Analyzer{Colors.ENDC}")
        print("\nUsage:")
        print("  python3 analyze.py CONSTANT_NAME    # Analyze specific constant")
        print("  python3 analyze.py --all            # Overview of all dependencies")
        print("  python3 analyze.py --circular       # Find circular dependencies")
        print("  python3 analyze.py --tree CONSTANT  # Show dependency tree")
        print("\nExamples:")
        print("  python3 analyze.py SUBSCRIPTION_LEVELS")
        print("  python3 analyze.py --tree CONTACT_LIMITS")
        print("  python3 analyze.py --circular")
        sys.exit(1)

    # Get project root
    project_root = Path(__file__).parent.parent.parent.parent

    # Create analyzer
    analyzer = DependencyAnalyzer(project_root)

    # Build dependency graph
    analyzer.build_dependency_graph()

    # Parse arguments
    if sys.argv[1] == '--all':
        analyzer.analyze_all_dependencies()

    elif sys.argv[1] == '--circular':
        analyzer.find_circular_dependencies()

    elif sys.argv[1] == '--tree':
        if len(sys.argv) < 3:
            print(f"{Colors.FAIL}Error: --tree requires a constant name{Colors.ENDC}")
            sys.exit(1)
        const_name = sys.argv[2]
        analyzer.generate_dependency_tree(const_name)

    else:
        # Analyze specific constant
        const_name = sys.argv[1]
        analyzer.analyze_constant(const_name)

        # Show dependency tree if requested
        if '--tree' in sys.argv:
            analyzer.generate_dependency_tree(const_name)

if __name__ == '__main__':
    main()
