import json
import random

# --- CONFIGURATION ---
OUTPUT_FILE = "sagemaker_source/training_data.json"
TARGET_COUNT = 1500  # We will generate this many examples

# --- VOCABULARY ---
tasks = [
    "workout", "gym session", "yoga", "meditation", "cardio",
    "study session", "math homework", "thesis writing", "research", "reading",
    "client call", "team meeting", "email review", "project planning", "coding",
    "doctor appointment", "dentist visit", "grocery shopping", "laundry", "call mom"
]

times = ["9am", "10am", "11:30am", "12pm", "2pm", "3:30pm", "4pm", "5pm", "7pm", "8:30pm"]
durations = ["30 minutes", "1 hour", "1.5 hours", "2 hours", "45 minutes", "3 hours"]
dates = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "next week", "this weekend"]
priorities = ["low", "medium", "high", "urgent"]
categories = ["work", "personal", "health", "study"]

# --- TEMPLATES ---
# {placeholder} maps to the vocabulary lists above
add_task_templates = [
    ("add {task}", ["task_title"]),
    ("remind me to {task}", ["task_title"]),
    ("schedule {task} for {time}", ["task_title", "time"]),
    ("add {task} at {time} for {duration}", ["task_title", "time", "duration"]),
    ("create a task to {task} on {date}", ["task_title", "date"]),
    ("schedule {task} with {priority} priority", ["task_title", "priority"]),
    ("add {task} under {category}", ["task_title", "category"]),
    ("new {category} task: {task} for {duration}", ["category", "task_title", "duration"]),
    ("block {duration} for {task} tomorrow", ["duration", "task_title"]),
    ("schedule {task} next {date} at {time}", ["task_title", "date", "time"]),
    ("{task} for {duration} priority {priority}", ["task_title", "duration", "priority"]),
    ("i need to {task} {date}", ["task_title", "date"])
]

query_templates = [
    "what is on my calendar", "show my schedule", "list my tasks", "what do i have today",
    "show me tasks for {date}", "what is up next", "check my schedule for {date}",
    "do i have any {category} tasks?", "list {priority} priority tasks",
    "what's happening {date}?"
]

# --- GENERATOR ---
data = []

def generate_add_task():
    tmpl, slots = random.choice(add_task_templates)
    
    # Pick random values
    val_task = random.choice(tasks)
    val_time = random.choice(times)
    val_dur = random.choice(durations)
    val_date = random.choice(dates)
    val_prio = random.choice(priorities)
    val_cat = random.choice(categories)
    
    # Construct sentence
    sentence = tmpl.format(
        task=val_task, time=val_time, duration=val_dur,
        date=val_date, priority=val_prio, category=val_cat
    )
    
    # Construct Entities
    entities = {}
    if "task_title" in slots: entities["task_title"] = val_task
    if "time" in slots: entities["time"] = val_time
    if "duration" in slots: entities["duration"] = val_dur
    if "date" in slots: entities["date"] = val_date
    if "priority" in slots: entities["priority"] = val_prio
    if "category" in slots: entities["category"] = val_cat
    
    return {"text": sentence, "intent": "add_task", "entities": entities}

def generate_simple(intent, templates):
    tmpl = random.choice(templates)
    # Fill potential slots for query (like date)
    val_date = random.choice(dates)
    val_cat = random.choice(categories)
    val_prio = random.choice(priorities)
    
    text = tmpl.format(date=val_date, category=val_cat, priority=val_prio)
    
    entities = {}
    if "{date}" in tmpl: entities["date"] = val_date
    if "{category}" in tmpl: entities["category"] = val_cat
    
    return {"text": text, "intent": intent, "entities": entities}

# --- MAIN LOOP ---
print(f"Generating {TARGET_COUNT} training examples...")

for _ in range(TARGET_COUNT):
    r = random.random()
    if r < 0.6:  # 60% Add Task (Most complex)
        data.append(generate_add_task())
    elif r < 0.8: # 20% Query
        data.append(generate_simple("query_tasks", query_templates))
    elif r < 0.9: # 10% Greetings/Help
        data.append(generate_simple("greeting", ["hello", "hi", "good morning", "hey there"]))
    else:         # 10% Other
        data.append(generate_simple("help", ["help", "what can you do?", "how does this work"]))

# Save
with open(OUTPUT_FILE, "w") as f:
    json.dump(data, f, indent=2)

print(f"DONE! Saved to {OUTPUT_FILE}")