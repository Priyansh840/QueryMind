"""
QueryMind - Date Filter Helper Functions
Resolves preset relative date ranges (today, yesterday, this_week, etc.) to UTC datetime boundaries.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple


def resolve_date_preset(preset: str, now: Optional[datetime] = None) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Resolves a preset date string into a tuple of (start_datetime, end_datetime) in UTC.
    Supported presets:
        - "today"
        - "yesterday"
        - "this_week"
        - "last_7_days"
        - "last_30_days"
        - "this_month"
        - "last_month"

    Returns (None, None) if preset is empty/None.
    Raises ValueError if preset is unrecognized.
    """
    if not preset:
        return None, None

    normalized = preset.strip().lower().replace("-", "_")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    # Today: 00:00:00 to 23:59:59.999999
    today_start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current.replace(hour=23, minute=59, second=59, microsecond=999999)

    if normalized == "today":
        return today_start, today_end

    elif normalized == "yesterday":
        yesterday_start = today_start - timedelta(days=1)
        yesterday_end = today_end - timedelta(days=1)
        return yesterday_start, yesterday_end

    elif normalized == "this_week":
        # Monday is weekday() == 0
        days_since_monday = current.weekday()
        week_start = today_start - timedelta(days=days_since_monday)
        return week_start, today_end

    elif normalized in ("last_7_days", "7_days", "7days"):
        start = current - timedelta(days=7)
        return start, current

    elif normalized in ("last_30_days", "30_days", "30days"):
        start = current - timedelta(days=30)
        return start, current

    elif normalized == "this_month":
        month_start = today_start.replace(day=1)
        return month_start, today_end

    elif normalized == "last_month":
        # First day of this month minus 1 day gives last day of previous month
        first_of_this_month = today_start.replace(day=1)
        last_day_of_last_month = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_day_of_last_month.replace(day=1)
        last_month_end = last_day_of_last_month.replace(hour=23, minute=59, second=59, microsecond=999999)
        return first_of_last_month, last_month_end

    else:
        raise ValueError(
            f"Unsupported date preset: '{preset}'. "
            "Supported presets: today, yesterday, this_week, last_7_days, last_30_days, this_month, last_month."
        )
