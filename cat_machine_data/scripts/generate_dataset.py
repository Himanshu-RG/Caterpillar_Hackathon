#!/usr/bin/env python
"""CLI Script to generate synthetic machine telemetry dataset."""

import argparse
import sys
from pathlib import Path

# Add project root to sys.path so 'src' can be imported cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.generate import run_pipeline


def main():
    parser = argparse.ArgumentParser(description="Synthetic Industrial Telemetry Dataset Generator")
    parser.add_argument(
        "--config",
        type=str,
        default=str(PROJECT_ROOT / "config.yaml"),
        help="Path to YAML configuration file",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Activate demo scale configuration (10 machines, 30 days)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Deterministic random seed override",
    )

    args = parser.parse_args()
    report = run_pipeline(
        config_path=args.config,
        is_demo=args.demo,
        override_seed=args.seed,
    )

    if report["status"] != "PASSED":
        print(f"Dataset generated with warnings/issues: {len(report['issues'])}")
        sys.exit(1)
    else:
        print("Dataset generated and validated successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
