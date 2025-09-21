function formatDuration(startTime, endTime) {
  const durationMs = endTime.getTime() - startTime.getTime();

  if (durationMs < 0) {
    return 'Invalid date range';
  }

  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'Less than a minute';
  }

  return parts.join(', ');
}

export { formatDuration };
