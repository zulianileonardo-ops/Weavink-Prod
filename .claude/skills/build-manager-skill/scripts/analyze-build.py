#!/usr/bin/env python3
"""
Next.js Build Output Analyzer

Parses build output, extracts errors and warnings, categorizes them,
and determines which are auto-fixable.

Usage:
    python3 analyze-build.py <build-output-file>
    python3 analyze-build.py /tmp/build-output-1234.txt

Output:
    JSON with categorized errors, warnings, and fix recommendations
"""

import re
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class BuildAnalyzer:
    """Analyzes Next.js build output and categorizes errors/warnings"""

    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.patterns_file = self.project_root / '.claude' / 'skills' / 'build-manager-skill' / 'scripts' / 'error-patterns.json'
        self.patterns = self._load_patterns()

    def _load_patterns(self) -> Dict[str, Any]:
        """Load error patterns from JSON file"""
        try:
            with open(self.patterns_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"{Colors.FAIL}Error: patterns file not found at {self.patterns_file}{Colors.ENDC}", file=sys.stderr)
            return {"patterns": [], "categories": {}}
        except json.JSONDecodeError as e:
            print(f"{Colors.FAIL}Error: Invalid JSON in patterns file: {e}{Colors.ENDC}", file=sys.stderr)
            return {"patterns": [], "categories": {}}

    def parse_build_output(self, output_file: str) -> Dict[str, Any]:
        """Parse build output file and extract errors/warnings"""
        try:
            with open(output_file, 'r') as f:
                content = f.read()
        except FileNotFoundError:
            return {
                "success": False,
                "error": f"Build output file not found: {output_file}",
                "errors": [],
                "warnings": [],
                "info": []
            }

        # Parse the output
        errors = self._extract_issues(content, severity='error')
        warnings = self._extract_issues(content, severity='warning')
        info = self._extract_issues(content, severity='info')

        # Check if build was successful
        build_success = self._check_build_success(content)

        # Categorize issues
        categorized_errors = self._categorize_issues(errors)
        categorized_warnings = self._categorize_issues(warnings)

        # Calculate statistics
        stats = self._calculate_stats(categorized_errors, categorized_warnings)

        return {
            "success": build_success,
            "errors": categorized_errors,
            "warnings": categorized_warnings,
            "info": info,
            "statistics": stats,
            "autoFixable": self._count_autofixable(categorized_errors, categorized_warnings),
            "manualReview": self._count_manual_review(categorized_errors, categorized_warnings)
        }

    def _extract_issues(self, content: str, severity: str = 'error') -> List[Dict[str, Any]]:
        """Extract issues from build output based on common patterns"""
        issues = []

        # Common Next.js build output patterns
        # Pattern 1: Standard error/warning format
        # ./path/to/file.js
        # Error: message here
        pattern1 = re.compile(
            r'(\.\/[^\n]+\.(?:js|jsx|ts|tsx|css|scss))\n'
            r'(?:.*?\n)*?'
            r'(Error|Warning|Info):\s*(.+?)(?:\n|$)',
            re.MULTILINE | re.IGNORECASE
        )

        # Pattern 2: Inline errors with line numbers
        # Error: ./path/to/file.js:10:5 - error message
        pattern2 = re.compile(
            r'(Error|Warning|Info):\s*(\.\/[^\s]+\.(?:js|jsx|ts|tsx|css|scss)):(\d+):(\d+)\s*-\s*(.+?)(?:\n|$)',
            re.IGNORECASE
        )

        # Pattern 3: ESLint format
        # path/to/file.js
        #   10:5  error  message  rule-name
        pattern3 = re.compile(
            r'(\.\/[^\n]+\.(?:js|jsx|ts|tsx))\n'
            r'\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s{2,}(.+?))?(?:\n|$)',
            re.IGNORECASE
        )

        # Pattern 4: Module not found
        # Module not found: Can't resolve 'module-name'
        pattern4 = re.compile(
            r"Module not found: Can't resolve '([^']+)'(?:\s+in\s+'([^']+)')?",
            re.IGNORECASE
        )

        # Apply all patterns
        for match in pattern1.finditer(content):
            file_path, issue_type, message = match.groups()
            if issue_type.lower() == severity.lower():
                issues.append({
                    "file": file_path.strip(),
                    "line": None,
                    "column": None,
                    "message": message.strip(),
                    "severity": severity,
                    "raw": match.group(0)
                })

        for match in pattern2.finditer(content):
            issue_type, file_path, line, column, message = match.groups()
            if issue_type.lower() == severity.lower():
                issues.append({
                    "file": file_path.strip(),
                    "line": int(line),
                    "column": int(column),
                    "message": message.strip(),
                    "severity": severity,
                    "raw": match.group(0)
                })

        for match in pattern3.finditer(content):
            file_path, line, column, issue_type, message, rule = match.groups()
            if issue_type.lower() == severity.lower():
                issues.append({
                    "file": file_path.strip(),
                    "line": int(line),
                    "column": int(column),
                    "message": message.strip(),
                    "rule": rule.strip() if rule else None,
                    "severity": severity,
                    "raw": match.group(0)
                })

        for match in pattern4.finditer(content):
            module, location = match.groups()
            if severity == 'error':  # Module not found is always an error
                issues.append({
                    "file": location.strip() if location else "unknown",
                    "line": None,
                    "column": None,
                    "message": f"Module not found: Can't resolve '{module}'",
                    "module": module,
                    "severity": "error",
                    "raw": match.group(0)
                })

        return issues

    def _categorize_issues(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Match issues against known patterns and add fix information"""
        categorized = []

        for issue in issues:
            message = issue.get('message', '')
            matched = False

            # Try to match against known patterns
            for pattern_def in self.patterns.get('patterns', []):
                pattern = pattern_def.get('pattern', '')
                try:
                    if re.search(pattern, message, re.IGNORECASE):
                        issue_copy = issue.copy()
                        issue_copy.update({
                            "patternId": pattern_def.get('id'),
                            "category": pattern_def.get('category'),
                            "autoFixable": pattern_def.get('autoFixable', False),
                            "fixStrategy": pattern_def.get('fixStrategy'),
                            "fixes": pattern_def.get('fixes', []),
                            "description": pattern_def.get('description', '')
                        })
                        categorized.append(issue_copy)
                        matched = True
                        break
                except re.error:
                    # Skip invalid regex patterns
                    continue

            if not matched:
                # Unknown error pattern
                issue_copy = issue.copy()
                issue_copy.update({
                    "patternId": "unknown",
                    "category": "unknown",
                    "autoFixable": False,
                    "fixStrategy": "manual_investigation_required",
                    "fixes": ["This error is not recognized. Manual investigation required."],
                    "description": "Unknown error pattern"
                })
                categorized.append(issue_copy)

        return categorized

    def _check_build_success(self, content: str) -> bool:
        """Check if the build was successful"""
        # Success indicators
        success_patterns = [
            r'Compiled successfully',
            r'Build completed',
            r'✓ Compiled',
        ]

        # Failure indicators
        failure_patterns = [
            r'Failed to compile',
            r'Build failed',
            r'Error:',
            r'× Compiled with errors'
        ]

        has_failure = any(re.search(p, content, re.IGNORECASE) for p in failure_patterns)
        has_success = any(re.search(p, content, re.IGNORECASE) for p in success_patterns)

        return has_success and not has_failure

    def _calculate_stats(self, errors: List[Dict], warnings: List[Dict]) -> Dict[str, Any]:
        """Calculate statistics about errors and warnings"""
        error_categories = defaultdict(int)
        warning_categories = defaultdict(int)

        for error in errors:
            category = error.get('category', 'unknown')
            error_categories[category] += 1

        for warning in warnings:
            category = warning.get('category', 'unknown')
            warning_categories[category] += 1

        return {
            "totalErrors": len(errors),
            "totalWarnings": len(warnings),
            "errorsByCategory": dict(error_categories),
            "warningsByCategory": dict(warning_categories)
        }

    def _count_autofixable(self, errors: List[Dict], warnings: List[Dict]) -> int:
        """Count how many issues are auto-fixable"""
        all_issues = errors + warnings
        return sum(1 for issue in all_issues if issue.get('autoFixable', False))

    def _count_manual_review(self, errors: List[Dict], warnings: List[Dict]) -> int:
        """Count how many issues require manual review"""
        all_issues = errors + warnings
        return sum(1 for issue in all_issues if not issue.get('autoFixable', False))

    def print_report(self, analysis: Dict[str, Any]) -> None:
        """Print a formatted report to the terminal"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}  Next.js Build Analysis Report{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}\n")

        # Build status
        if analysis['success']:
            print(f"{Colors.OKGREEN}✓ Build Status: SUCCESS{Colors.ENDC}\n")
        else:
            print(f"{Colors.FAIL}✗ Build Status: FAILED{Colors.ENDC}\n")

        # Statistics
        stats = analysis['statistics']
        print(f"{Colors.BOLD}Statistics:{Colors.ENDC}")
        print(f"  Total Errors:   {Colors.FAIL}{stats['totalErrors']}{Colors.ENDC}")
        print(f"  Total Warnings: {Colors.WARNING}{stats['totalWarnings']}{Colors.ENDC}")
        print(f"  Auto-fixable:   {Colors.OKGREEN}{analysis['autoFixable']}{Colors.ENDC}")
        print(f"  Manual Review:  {Colors.OKCYAN}{analysis['manualReview']}{Colors.ENDC}\n")

        # Errors by category
        if stats['errorsByCategory']:
            print(f"{Colors.BOLD}Errors by Category:{Colors.ENDC}")
            for category, count in sorted(stats['errorsByCategory'].items(), key=lambda x: x[1], reverse=True):
                print(f"  {category:15} {Colors.FAIL}{count}{Colors.ENDC}")
            print()

        # Warnings by category
        if stats['warningsByCategory']:
            print(f"{Colors.BOLD}Warnings by Category:{Colors.ENDC}")
            for category, count in sorted(stats['warningsByCategory'].items(), key=lambda x: x[1], reverse=True):
                print(f"  {category:15} {Colors.WARNING}{count}{Colors.ENDC}")
            print()

        # Auto-fixable issues
        autofixable = [e for e in analysis['errors'] + analysis['warnings'] if e.get('autoFixable')]
        if autofixable:
            print(f"{Colors.BOLD}{Colors.OKGREEN}Auto-fixable Issues ({len(autofixable)}):{Colors.ENDC}")
            for idx, issue in enumerate(autofixable[:5], 1):  # Show first 5
                file_info = f"{issue['file']}"
                if issue.get('line'):
                    file_info += f":{issue['line']}"
                print(f"  {idx}. {file_info}")
                print(f"     {issue['message'][:70]}...")
                print(f"     {Colors.OKCYAN}Strategy: {issue['fixStrategy']}{Colors.ENDC}")
            if len(autofixable) > 5:
                print(f"  ... and {len(autofixable) - 5} more\n")

        # Manual review issues
        manual = [e for e in analysis['errors'] + analysis['warnings'] if not e.get('autoFixable')]
        if manual:
            print(f"{Colors.BOLD}{Colors.WARNING}Manual Review Required ({len(manual)}):{Colors.ENDC}")
            for idx, issue in enumerate(manual[:5], 1):  # Show first 5
                file_info = f"{issue['file']}"
                if issue.get('line'):
                    file_info += f":{issue['line']}"
                print(f"  {idx}. {file_info}")
                print(f"     {issue['message'][:70]}...")
            if len(manual) > 5:
                print(f"  ... and {len(manual) - 5} more\n")

        print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}\n")


def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <build-output-file>", file=sys.stderr)
        sys.exit(1)

    output_file = sys.argv[1]

    # Initialize analyzer
    analyzer = BuildAnalyzer()

    # Parse build output
    analysis = analyzer.parse_build_output(output_file)

    # Print human-readable report to stderr
    analyzer.print_report(analysis)

    # Output JSON to stdout for programmatic use
    print(json.dumps(analysis, indent=2))


if __name__ == '__main__':
    main()
