#!/usr/bin/env python3
import os
import subprocess
import sys
import time

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


class AuditTool:
    def __init__(self):
        self.results = []
        self.root = os.getcwd()

    def run_command(self, title, cmd, cwd=None):
        if cwd is None:
            cwd = self.root

        console.print(f"[bold blue]>>[/bold blue] [bold]{title}[/bold] ([dim]{cmd}[/dim])")
        start = time.time()

        try:
            process = subprocess.Popen(
                cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            stdout, stderr = process.communicate()
            elapsed = time.time() - start

            success = process.returncode == 0
            self.results.append(
                {"title": title, "success": success, "elapsed": f"{elapsed:.2f}s", "output": stdout + stderr}
            )

            if success:
                console.print(f"[bold green]✓[/bold green] {title} [dim]({elapsed:.2f}s)[/dim]")
            else:
                console.print(f"[bold red]✗[/bold red] {title} [dim]({elapsed:.2f}s)[/dim]")
                if stderr:
                    console.print(Panel(stderr.strip(), title="Error", border_style="red"))

            return success
        except Exception as e:
            self.results.append({"title": title, "success": False, "elapsed": "0s", "output": str(e)})
            console.print(f"[bold red]!!![/bold red] {title} failed: {e}")
            return False

    def summary(self):
        table = Table(title="[bold]Deep Audit Summary (December 2025 Standard)[/bold]", border_style="cyan")
        table.add_column("Safety", justify="center")
        table.add_column("Layer", justify="left")
        table.add_column("Status", justify="center")
        table.add_column("Latency", justify="right")

        for res in self.results:
            status = "[bold green]PASS[/bold green]" if res["success"] else "[bold red]FAIL[/bold red]"
            safety = "🛡️" if res["success"] else "⚠️"
            table.add_row(safety, res["title"], status, res["elapsed"])

        console.print("\n")
        console.print(table)


def main():
    audit = AuditTool()

    console.print(
        Panel.fit(
            "[bold cyan]STORM-DRIVE 2026: Deep Project Audit[/bold cyan]\n[dim]Industrial-Strength Quality Enforcement[/dim]",
            border_style="cyan",
        )
    )

    # Phase 1: Rust Optimization & Hygiene
    audit.run_command("Rust: Toolchain Audit", "rustc --version && cargo --version")
    audit.run_command("Rust: Format Check", "cargo fmt --all -- --check")
    audit.run_command("Rust: Pedantic Clippy", "cargo clippy --workspace --all-targets -- -D warnings")

    # Phase 2: Python / AI Logic
    audit.run_command("Python: Ruff Aggressive Fix", "uv run ruff check --fix --unsafe-fixes .")
    audit.run_command("Python: Ruff Format", "uv run ruff format .")

    # Phase 3: Testing & Protocol Audit
    audit.run_command("Rust: Smart Tests", "cargo test --workspace")
    audit.run_command("MCP: Handbook Audit", "./scripts/audit_mcp_release.sh")

    # Phase 4: Spelling & Documentation
    audit.run_command("Hygiene: Spellcheck", "/home/toxic/.cargo/bin/typos . --exclude '_legacy_archive'")

    audit.summary()

    all_success = all(r["success"] for r in audit.results)
    if not all_success:
        console.print(
            "\n[bold yellow]PROMPT:[/bold yellow] Some layers failed. Use [bold]just fix[/bold] or review logs."
        )
        sys.exit(1)
    else:
        console.print("\n[bold green]System Status: OPTIMIZED[/bold green] (Zero-Tolerance Met)")
        sys.exit(0)


if __name__ == "__main__":
    main()
