// Test your actual configuration arrays
const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', color: '#FF9800' },
  { id: 'high', label: 'High', color: '#F44336' },
];

const CATEGORIES = [
  { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#2196F3' },
  { id: 'personal', label: 'Personal', icon: 'person-outline', color: '#4CAF50' },
  { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#FF9800' },
  { id: 'study', label: 'Study', icon: 'school-outline', color: '#9C27B0' },
];

describe('Task Configuration', () => {
  test('priority system has correct structure', () => {
    expect(PRIORITIES).toHaveLength(3);
    expect(PRIORITIES[0].id).toBe('low');
    expect(PRIORITIES[2].color).toBe('#F44336');
  });

  test('categories have all required properties', () => {
    CATEGORIES.forEach(category => {
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('label'); 
      expect(category).toHaveProperty('icon');
      expect(category).toHaveProperty('color');
    });
  });

  test('work category has correct blue color', () => {
    const workCategory = CATEGORIES.find(cat => cat.id === 'work');
    expect(workCategory.color).toBe('#2196F3');
  });
});