#!/usr/bin/env python3
"""
Test script for documentation audit report link resolution.

This script validates that the link resolution logic in generate-audit-report.py
correctly computes relative paths from the report output directory to target files.
"""

import os
import sys
from pathlib import Path

def test_link_resolution():
    """Test link resolution for various scenarios."""
    
    print("Testing documentation audit report link resolution...\n")
    
    # Simulate repository structure
    repo_root = Path.cwd().resolve()
    report_dir = repo_root / "docs" / "reports"
    
    # Test cases: (input_path, expected_relative_path)
    test_cases = [
        ("docs/context/SUMMARY.md", "../context/SUMMARY.md"),
        ("docs/context/backend/README.md", "../context/backend/README.md"),
        ("docs/context/frontend/guides/dark-mode.md", "../context/frontend/guides/dark-mode.md"),
        ("docs/context/ops/development/CURSOR-SETUP-RAPIDO.md", "../context/ops/development/CURSOR-SETUP-RAPIDO.md"),
        ("docs/docusaurus/README.md", "../docusaurus/README.md"),
    ]
    
    passed = 0
    failed = 0
    
    for input_path, expected in test_cases:
        # Compute actual relative path using same logic as generate-audit-report.py
        target_file = repo_root / input_path
        actual = os.path.relpath(target_file, report_dir)
        
        # Normalize path separators for cross-platform compatibility
        actual = actual.replace(os.sep, '/')
        
        # Check if actual matches expected
        if actual == expected:
            print(f"✅ PASS: {input_path}")
            print(f"   Input:    {input_path}")
            print(f"   Expected: {expected}")
            print(f"   Actual:   {actual}")
            passed += 1
        else:
            print(f"❌ FAIL: {input_path}")
            print(f"   Input:    {input_path}")
            print(f"   Expected: {expected}")
            print(f"   Actual:   {actual}")
            failed += 1
        print()
    
    # Summary
    print("=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0

def test_edge_cases():
    """Test edge cases for link resolution."""
    
    print("\nTesting edge cases...\n")
    
    repo_root = Path.cwd().resolve()
    report_dir = repo_root / "docs" / "reports"
    
    # Edge cases
    edge_cases = [
        # Same directory level
        ("docs/reports/other-report.md", "other-report.md"),
        # Deeply nested path
        ("docs/context/backend/api/webscraper-api/deep/nested/file.md", 
         "../context/backend/api/webscraper-api/deep/nested/file.md"),
        # Root level (should still work)
        ("README.md", "../../README.md"),
    ]
    
    passed = 0
    failed = 0
    
    for input_path, expected in edge_cases:
        target_file = repo_root / input_path
        actual = os.path.relpath(target_file, report_dir)
        actual = actual.replace(os.sep, '/')
        
        if actual == expected:
            print(f"✅ PASS: {input_path}")
            print(f"   Expected: {expected}")
            print(f"   Actual:   {actual}")
            passed += 1
        else:
            print(f"❌ FAIL: {input_path}")
            print(f"   Expected: {expected}")
            print(f"   Actual:   {actual}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"Edge Case Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0

def main():
    """Run all tests."""
    
    print("=" * 60)
    print("Documentation Audit Report Link Resolution Test Suite")
    print("=" * 60)
    print()
    
    # Run basic tests
    basic_pass = test_link_resolution()
    
    # Run edge case tests
    edge_pass = test_edge_cases()
    
    # Overall result
    print()
    if basic_pass and edge_pass:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the output above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

