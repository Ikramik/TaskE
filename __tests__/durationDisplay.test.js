// Test the duration display logic from your code
const getDurationDisplay = (duration, durationType) => {
  if (duration === 0) {
    return "Select duration";
  }

  if (durationType === "custom") {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  } else {
    if (duration === 15) return "15 min";
    if (duration === 30) return "30 min"; 
    if (duration === 60) return "1 hour";
    return `${duration} min`;
  }
};

describe('Duration Display', () => {
  test('shows placeholder for zero duration', () => {
    expect(getDurationDisplay(0, 'preset')).toBe('Select duration');
  });

  test('formats custom duration with hours and minutes', () => {
    expect(getDurationDisplay(90, 'custom')).toBe('1h 30m');
  });

  test('formats preset durations correctly', () => {
    expect(getDurationDisplay(60, 'preset')).toBe('1 hour');
    expect(getDurationDisplay(30, 'preset')).toBe('30 min');
  });
});