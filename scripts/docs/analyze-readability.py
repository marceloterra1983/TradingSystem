#!/usr/bin/env python3
"""
Documentation Readability Analyzer
Analyzes documentation for readability metrics and suggests improvements
"""

import os
import re
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

class ReadabilityAnalyzer:
    def __init__(self, docs_dir: str):
        self.docs_dir = Path(docs_dir)
        self.results = []

    def count_syllables(self, word: str) -> int:
        """Estimate syllable count for a word"""
        word = word.lower()
        # Remove non-alphabetic characters
        word = re.sub(r'[^a-z]', '', word)
        if not word:
            return 0

        # Common patterns for syllable counting
        syllables = 0
        vowels = 'aeiouy'
        previous_was_vowel = False

        for char in word:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllables += 1
            previous_was_vowel = is_vowel

        # Adjust for silent 'e'
        if word.endswith('e'):
            syllables -= 1

        # Ensure at least 1 syllable
        return max(1, syllables)

    def calculate_flesch_reading_ease(self, text: str) -> float:
        """
        Calculate Flesch Reading Ease score
        Score interpretation:
        90-100: Very Easy (5th grade)
        80-89: Easy (6th grade)
        70-79: Fairly Easy (7th grade)
        60-69: Standard (8th-9th grade)
        50-59: Fairly Difficult (10th-12th grade)
        30-49: Difficult (College)
        0-29: Very Difficult (College graduate)
        """
        # Remove code blocks
        text = re.sub(r'```[\s\S]*?```', '', text)
        # Remove inline code
        text = re.sub(r'`[^`]+`', '', text)
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)

        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 100.0

        # Split into words
        words = re.findall(r'\b[a-zA-Z]+\b', text)

        if not words:
            return 100.0

        # Calculate metrics
        total_sentences = len(sentences)
        total_words = len(words)
        total_syllables = sum(self.count_syllables(word) for word in words)

        # Flesch Reading Ease formula
        # Score = 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
        words_per_sentence = total_words / total_sentences
        syllables_per_word = total_syllables / total_words

        score = 206.835 - (1.015 * words_per_sentence) - (84.6 * syllables_per_word)

        return max(0, min(100, score))

    def get_readability_level(self, score: float) -> str:
        """Get readability level description"""
        if score >= 90:
            return "Very Easy (5th grade)"
        elif score >= 80:
            return "Easy (6th grade)"
        elif score >= 70:
            return "Fairly Easy (7th grade)"
        elif score >= 60:
            return "Standard (8th-9th grade)"
        elif score >= 50:
            return "Fairly Difficult (10th-12th grade)"
        elif score >= 30:
            return "Difficult (College)"
        else:
            return "Very Difficult (College graduate)"

    def analyze_file(self, file_path: Path) -> Dict:
        """Analyze a single file for readability"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Calculate readability score
            score = self.calculate_flesch_reading_ease(content)
            level = self.get_readability_level(score)

            # Count metrics
            words = re.findall(r'\b[a-zA-Z]+\b', content)
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if s.strip()]

            # Calculate averages
            avg_words_per_sentence = len(words) / len(sentences) if sentences else 0

            # Find long sentences (> 25 words)
            long_sentences = []
            for sentence in sentences:
                sentence_words = re.findall(r'\b[a-zA-Z]+\b', sentence)
                if len(sentence_words) > 25:
                    long_sentences.append({
                        'length': len(sentence_words),
                        'preview': sentence[:100] + '...' if len(sentence) > 100 else sentence
                    })

            # Find passive voice occurrences
            passive_patterns = [
                r'\b(is|are|was|were|be|been|being)\s+\w+ed\b',
                r'\b(is|are|was|were|be|been|being)\s+\w+en\b'
            ]
            passive_count = sum(len(re.findall(pattern, content)) for pattern in passive_patterns)

            return {
                'file': str(file_path.relative_to(self.docs_dir)),
                'score': round(score, 1),
                'level': level,
                'total_words': len(words),
                'total_sentences': len(sentences),
                'avg_words_per_sentence': round(avg_words_per_sentence, 1),
                'long_sentences': len(long_sentences),
                'long_sentences_details': long_sentences[:5],  # First 5 examples
                'passive_voice_count': passive_count,
                'needs_improvement': score < 60 or len(long_sentences) > 5 or passive_count > 10
            }

        except Exception as e:
            return {
                'file': str(file_path.relative_to(self.docs_dir)),
                'error': str(e)
            }

    def analyze_all(self) -> List[Dict]:
        """Analyze all markdown files in docs directory"""
        md_files = list(self.docs_dir.glob('**/*.md')) + list(self.docs_dir.glob('**/*.mdx'))

        for file_path in md_files:
            result = self.analyze_file(file_path)
            self.results.append(result)

        return self.results

    def generate_report(self, output_path: str):
        """Generate readability report"""
        # Sort by score (lowest first - needs most improvement)
        sorted_results = sorted([r for r in self.results if 'error' not in r],
                               key=lambda x: x['score'])

        # Calculate statistics
        total_files = len(sorted_results)
        needs_improvement = sum(1 for r in sorted_results if r['needs_improvement'])
        avg_score = sum(r['score'] for r in sorted_results) / total_files if total_files > 0 else 0

        # Generate markdown report
        report = f"""# Documentation Readability Analysis Report

**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Files Analyzed**: {total_files}
**Average Score**: {avg_score:.1f}

## Summary

- **Files Needing Improvement**: {needs_improvement} ({needs_improvement/total_files*100:.1f}%)
- **Excellent Readability (>= 70)**: {sum(1 for r in sorted_results if r['score'] >= 70)}
- **Good Readability (60-69)**: {sum(1 for r in sorted_results if 60 <= r['score'] < 70)}
- **Needs Improvement (< 60)**: {sum(1 for r in sorted_results if r['score'] < 60)}

## Score Distribution

| Range | Level | Count |
|-------|-------|-------|
| 90-100 | Very Easy | {sum(1 for r in sorted_results if r['score'] >= 90)} |
| 80-89 | Easy | {sum(1 for r in sorted_results if 80 <= r['score'] < 90)} |
| 70-79 | Fairly Easy | {sum(1 for r in sorted_results if 70 <= r['score'] < 80)} |
| 60-69 | Standard | {sum(1 for r in sorted_results if 60 <= r['score'] < 70)} |
| 50-59 | Fairly Difficult | {sum(1 for r in sorted_results if 50 <= r['score'] < 60)} |
| 30-49 | Difficult | {sum(1 for r in sorted_results if 30 <= r['score'] < 50)} |
| 0-29 | Very Difficult | {sum(1 for r in sorted_results if r['score'] < 30)} |

## Files Needing Most Improvement

"""

        # Show top 20 files needing improvement
        for i, result in enumerate(sorted_results[:20], 1):
            if result['needs_improvement']:
                report += f"""
### {i}. {result['file']}

- **Score**: {result['score']} ({result['level']})
- **Metrics**: {result['total_words']} words, {result['total_sentences']} sentences
- **Avg Words/Sentence**: {result['avg_words_per_sentence']}
- **Long Sentences**: {result['long_sentences']}
- **Passive Voice**: {result['passive_voice_count']} occurrences

**Recommendations**:
"""
                if result['score'] < 60:
                    report += "- Simplify complex sentences\n"
                if result['avg_words_per_sentence'] > 20:
                    report += "- Break down long sentences (average > 20 words)\n"
                if result['long_sentences'] > 5:
                    report += f"- Reduce {result['long_sentences']} long sentences (> 25 words)\n"
                if result['passive_voice_count'] > 10:
                    report += f"- Convert passive voice to active ({result['passive_voice_count']} occurrences)\n"

                if result['long_sentences_details']:
                    report += "\n**Long Sentence Examples**:\n"
                    for example in result['long_sentences_details'][:3]:
                        report += f"- ({example['length']} words) {example['preview']}\n"

        report += """

## Improvement Guidelines

### Target Readability Scores
- **Technical Documentation**: 60-70 (Standard - Fairly Easy)
- **User Guides**: 70-80 (Fairly Easy - Easy)
- **Tutorials**: 80-90 (Easy - Very Easy)

### Writing Tips
1. **Shorten Sentences**: Aim for 15-20 words per sentence
2. **Use Active Voice**: Replace "was done by" with "did"
3. **Simplify Vocabulary**: Use common words over technical jargon where possible
4. **Break Paragraphs**: Keep paragraphs under 3-4 sentences
5. **Add Examples**: Concrete examples improve understanding
6. **Use Lists**: Break complex information into bullet points

---

*Generated by Documentation Readability Analyzer*
"""

        with open(output_path, 'w') as f:
            f.write(report)

        # Also save JSON for programmatic access
        json_path = output_path.replace('.md', '.json')
        with open(json_path, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_files': total_files,
                'average_score': avg_score,
                'needs_improvement': needs_improvement,
                'results': sorted_results
            }, f, indent=2)

        return output_path

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze-readability.py <docs_directory> [output_file]")
        sys.exit(1)

    docs_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "docs/reports/readability-report.md"

    analyzer = ReadabilityAnalyzer(docs_dir)
    print(f"Analyzing documentation in {docs_dir}...")
    analyzer.analyze_all()

    print(f"Generating report...")
    report_path = analyzer.generate_report(output_file)

    print(f"✓ Report generated: {report_path}")
    print(f"✓ JSON data: {report_path.replace('.md', '.json')}")

if __name__ == "__main__":
    main()
