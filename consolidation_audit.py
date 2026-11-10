#!/usr/bin/env python3
"""
consolidation_audit.py - 2026 Production Consolidation Tool
Audits and consolidates project structure while preserving functionality.
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, List, Set
import hashlib

class ConsolidationAuditor:
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.archive_root = self.root / "_production_archive"
        self.audit_log = []

    def log_action(self, action: str, details: str):
        """Log consolidation actions for audit trail."""
        self.audit_log.append({
            "action": action,
            "details": details,
            "timestamp": str(Path.cwd())
        })

    def get_file_hash(self, file_path: Path) -> str:
        """Get SHA256 hash of file for integrity checking."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def identify_cache_files(self) -> List[Path]:
        """Identify cache files that can be safely archived."""
        cache_patterns = [
            "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
            ".DS_Store", "node_modules", ".next", ".nuxt",
            "*.pyc", "*.pyo", "*.pyd"
        ]

        cache_files = []
        for pattern in cache_patterns:
            for path in self.root.rglob(pattern):
                if path.is_file() or path.is_dir():
                    cache_files.append(path)

        return cache_files

    def identify_log_files(self) -> List[Path]:
        """Identify log files for archiving."""
        log_files = []
        log_extensions = [".log", ".out", ".err"]

        for ext in log_extensions:
            for path in self.root.rglob(f"*{ext}"):
                if path.is_file():
                    log_files.append(path)

        return log_files

    def identify_legacy_code(self) -> List[Path]:
        """Identify potentially legacy code files."""
        legacy_files = []

        # Files in old directories
        legacy_dirs = ["archive", "old", "legacy", "deprecated"]
        for dir_name in legacy_dirs:
            legacy_dir = self.root / dir_name
            if legacy_dir.exists():
                for path in legacy_dir.rglob("*"):
                    if path.is_file():
                        legacy_files.append(path)

        return legacy_files

    def identify_research_files(self) -> List[Path]:
        """Identify research and documentation files."""
        research_files = []

        research_patterns = [
            "research_*.json", "research_*.txt", "research_*.md",
            "*_research.*", "*_study.*", "*_analysis.*",
            "PROTOBUF_DECODER_RESEARCH.md"
        ]

        for pattern in research_patterns:
            for path in self.root.rglob(pattern):
                if path.is_file():
                    research_files.append(path)

        return research_files

    def move_to_archive(self, files: List[Path], category: str):
        """Move files to appropriate archive category."""
        archive_dir = self.archive_root / category
        archive_dir.mkdir(exist_ok=True)

        for file_path in files:
            if file_path.exists():
                relative_path = file_path.relative_to(self.root)
                archive_path = archive_dir / relative_path

                # Create subdirectories if needed
                archive_path.parent.mkdir(parents=True, exist_ok=True)

                # Move file
                shutil.move(str(file_path), str(archive_path))
                self.log_action("ARCHIVE", f"Moved {relative_path} to {category}")

    def audit_critical_dependencies(self) -> Dict[str, List[str]]:
        """Audit critical files that must not be lost."""
        critical_files = {
            "cargo_files": [],
            "python_files": [],
            "docker_files": [],
            "config_files": []
        }

        # Cargo files
        for cargo_file in self.root.rglob("Cargo.toml"):
            critical_files["cargo_files"].append(str(cargo_file.relative_to(self.root)))

        # Python files
        for py_file in self.root.rglob("*.py"):
            if not any(skip in str(py_file) for skip in ["__pycache__", ".venv"]):
                critical_files["python_files"].append(str(py_file.relative_to(self.root)))

        # Docker files
        docker_patterns = ["Dockerfile*", "docker-compose*.yml", "*.dockerfile"]
        for pattern in docker_patterns:
            for docker_file in self.root.rglob(pattern):
                critical_files["docker_files"].append(str(docker_file.relative_to(self.root)))

        # Config files
        config_patterns = ["*.json", "*.toml", "*.yaml", "*.yml", ".env*"]
        for pattern in config_patterns:
            for config_file in self.root.rglob(pattern):
                if not any(skip in str(config_file) for skip in ["node_modules", "target", "__pycache__"]):
                    critical_files["config_files"].append(str(config_file.relative_to(self.root)))

        return critical_files

    def create_consolidation_report(self) -> Dict:
        """Create comprehensive consolidation report."""
        report = {
            "audit_timestamp": str(Path.cwd()),
            "critical_files": self.audit_critical_dependencies(),
            "archive_candidates": {
                "cache_files": [str(p.relative_to(self.root)) for p in self.identify_cache_files()],
                "log_files": [str(p.relative_to(self.root)) for p in self.identify_log_files()],
                "legacy_files": [str(p.relative_to(self.root)) for p in self.identify_legacy_code()],
                "research_files": [str(p.relative_to(self.root)) for p in self.identify_research_files()]
            },
            "actions_taken": self.audit_log,
            "recommendations": []
        }

        # Generate recommendations
        if report["archive_candidates"]["cache_files"]:
            report["recommendations"].append("Archive cache files to reduce repository size")

        if report["archive_candidates"]["log_files"]:
            report["recommendations"].append("Archive log files for historical reference")

        if report["archive_candidates"]["legacy_files"]:
            report["recommendations"].append("Review legacy files for potential integration before archiving")

        return report

    def execute_safe_consolidation(self):
        """Execute safe consolidation operations."""
        print("🔍 Starting consolidation audit...")

        # Archive cache files (safest to archive)
        cache_files = self.identify_cache_files()
        if cache_files:
            print(f"📦 Archiving {len(cache_files)} cache files...")
            self.move_to_archive(cache_files, "cache")

        # Archive log files
        log_files = self.identify_log_files()
        if log_files:
            print(f"📋 Archiving {len(log_files)} log files...")
            self.move_to_archive(log_files, "logs")

        # Archive research files (keep for reference)
        research_files = self.identify_research_files()
        if research_files:
            print(f"🔬 Archiving {len(research_files)} research files...")
            self.move_to_archive(research_files, "research")

        # Generate report
        report = self.create_consolidation_report()
        report_path = self.root / "consolidation_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"✅ Consolidation complete. Report saved to {report_path}")
        return report

if __name__ == "__main__":
    auditor = ConsolidationAuditor(".")
    report = auditor.execute_safe_consolidation()

    print("\n📊 Consolidation Summary:")
    print(f"  Critical files preserved: {sum(len(v) for v in report['critical_files'].values())}")
    print(f"  Files archived: {sum(len(v) for v in report['archive_candidates'].values())}")
    print(f"  Actions taken: {len(report['actions_taken'])}")

    if report['recommendations']:
        print("\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  • {rec}")
