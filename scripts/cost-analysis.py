#!/usr/bin/env python3
import csv
import datetime as dt
from collections import defaultdict
from pathlib import Path

PATH = Path('data/project-pnl/cost_entries.csv')


def load_rows(path: Path):
    with path.open(newline='') as f:
        rows = []
        for row in csv.DictReader(f):
            row['amount'] = float(row['amount'])
            row['date'] = dt.date.fromisoformat(row['date'])
            rows.append(row)
        return rows


def summarize(rows, start, end):
    subset = [r for r in rows if start <= r['date'] <= end]
    by_project = defaultdict(float)
    by_category = defaultdict(float)
    by_day = defaultdict(float)
    for row in subset:
        by_project[row['project']] += row['amount']
        by_category[row['category']] += row['amount']
        by_day[str(row['date'])] += row['amount']
    return {
        'start': start,
        'end': end,
        'count': len(subset),
        'total': sum(r['amount'] for r in subset),
        'by_project': dict(sorted(by_project.items(), key=lambda kv: -kv[1])),
        'by_category': dict(sorted(by_category.items(), key=lambda kv: -kv[1])),
        'by_day': dict(sorted(by_day.items())),
    }


def main():
    rows = load_rows(PATH)
    latest = max(r['date'] for r in rows)
    this_start = latest - dt.timedelta(days=6)
    prev_end = this_start - dt.timedelta(days=1)
    prev_start = prev_end - dt.timedelta(days=6)

    this_week = summarize(rows, this_start, latest)
    last_week = summarize(rows, prev_start, prev_end)
    freshness_days = (dt.date.today() - latest).days

    print(f'Cost file: {PATH}')
    print(f'Latest entry: {latest} ({freshness_days} days old)')
    print(f"This window: {this_week['start']} to {this_week['end']} total=${this_week['total']:.2f} rows={this_week['count']}")
    print(f"Previous window: {last_week['start']} to {last_week['end']} total=${last_week['total']:.2f} rows={last_week['count']}")
    print(f"Delta: ${this_week['total'] - last_week['total']:.2f}")

    print('\nBy project:')
    for key, value in this_week['by_project'].items():
        print(f'- {key}: ${value:.2f}')

    print('\nBy category:')
    for key, value in this_week['by_category'].items():
        print(f'- {key}: ${value:.2f}')

    if freshness_days > 7:
        print('\nWARNING: cost data is stale, so trend conclusions may be misleading.')


if __name__ == '__main__':
    main()
