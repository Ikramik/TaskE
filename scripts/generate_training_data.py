import json
import random
import os

class TrainingDataGenerator:
    def __init__(self):
        with open('data/intent_schema.json', 'r') as f:
            self.schema = json.load(f)
        
        self.entity_patterns = {
            'time': ['at {time}', 'around {time}', 'for {time}', 'by {time}'],
            'date': ['on {date}', 'this {date}', 'next {date}', 'for {date}'],
            'duration': ['for {duration}', 'lasting {duration}', 'for about {duration}'],
            'priority': ['with {priority} priority', 'it\'s {priority} priority'],
            'category': ['for {category}', 'under {category}', 'as {category}']
        }
        
        self.entity_values = {
            'time': ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'],
            'date': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'today', 'tomorrow'],
            'duration': ['30 minutes', '1 hour', '2 hours', '3 hours', '1.5 hours'],
            'priority': ['low', 'medium', 'high'],
            'category': ['work', 'personal', 'health', 'study']
        }

    def generate_training_examples(self, num_examples_per_intent=20):
        training_data = []
        
        for intent in self.schema['intents']:
            print(f"Generating examples for: {intent['tag']}")
            
            for _ in range(num_examples_per_intent):
                example = self.generate_example(intent)
                if example:
                    training_data.append(example)
        
        return training_data

    def generate_example(self, intent):
        # Select a random pattern
        pattern = random.choice(intent['patterns'])
        
        # Extract entities based on the pattern
        entities = {}
        
        # For required entities, ensure they're present
        for entity_type in intent.get('required_entities', []):
            if entity_type == 'task_title':
                # Extract task title from pattern or generate one
                task_title = self.extract_task_title(pattern)
                entities[entity_type] = task_title
        
        # Add optional entities randomly
        for entity_type in intent.get('optional_entities', []):
            if random.random() > 0.6:  # 40% chance to include optional entity
                entity_value = random.choice(self.entity_values[entity_type])
                entities[entity_type] = entity_value
                # Add the entity text to the pattern
                entity_pattern = random.choice(self.entity_patterns[entity_type])
                pattern += ' ' + entity_pattern.format(**{entity_type: entity_value})
        
        return {
            "text": pattern,
            "intent": intent['tag'],
            "entities": entities
        }

    def extract_task_title(self, pattern):
        # Simple task title extraction from pattern
        task_titles = [
            "team meeting", "gym session", "doctor appointment", "study time",
            "project work", "phone call", "email review", "coding practice",
            "laundry", "grocery shopping", "meal prep", "reading time"
        ]
        return random.choice(task_titles)

    def save_training_data(self, training_data, filename='data/training_data.json'):
        with open(filename, 'w') as f:
            json.dump(training_data, f, indent=2)
        print(f"✅ Saved {len(training_data)} training examples to {filename}")

# Generate the data
if __name__ == "__main__":
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    generator = TrainingDataGenerator()
    training_data = generator.generate_training_examples(num_examples_per_intent=15)
    generator.save_training_data(training_data)
    
    print(f"✅ Generated {len(training_data)} training examples")
    print("📝 Sample examples:")
    for i, example in enumerate(training_data[:3]):
        print(f"  {i+1}. '{example['text']}'")
        print(f"     → Intent: {example['intent']}")
        print(f"     → Entities: {example['entities']}")
        print()