const validateForm = (form) => {
  const errors = {};
  if (!form.title || form.title.trim() === '') {
    errors.title = "Task title is required";
  }
  if (!form.frequency) {
    errors.frequency = "Frequency is required";
  }
  if (form.frequency === "weekly" && form.selectedDays.length === 0) {
    errors.frequency = "Please select at least one day for weekly tasks";
  }
  if (form.duration === 0) {
    errors.duration = "Duration is required";
  }
  return errors;
};

describe('Task Form Validation', () => {
  test('should detect missing task title', () => {
    const form = {
      title: "",
      frequency: "daily",
      duration: 30,
      selectedDays: []
    };
    
    const errors = validateForm(form);
    expect(errors.title).toBe("Task title is required");
  });

  test('should validate weekly tasks have selected days', () => {
    const form = {
      title: "Test Task",
      frequency: "weekly", 
      duration: 30,
      selectedDays: [] 
    };
    
    const errors = validateForm(form);
    expect(errors.frequency).toBe("Please select at least one day for weekly tasks");
  });

  test('should pass validation for valid daily task', () => {
    const form = {
      title: "Valid Task",
      frequency: "daily",
      duration: 60,
      selectedDays: []
    };
    
    const errors = validateForm(form);
    expect(Object.keys(errors).length).toBe(0);
  });

  test('should detect missing duration', () => {
    const form = {
      title: "Test Task", 
      frequency: "daily",
      duration: 0, 
      selectedDays: []
    };
    
    const errors = validateForm(form);
    expect(errors.duration).toBe("Duration is required");
  });
});