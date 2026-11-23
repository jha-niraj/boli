"""clipstats: tiny duration statistics for a batch of clips.

`from practice.lesson_07.clipstats import summarise` works because this file
re-exports it, like an index.ts barrel file.
"""

from practice.lesson_07.clipstats.stats import summarise

__all__ = ["summarise"]
