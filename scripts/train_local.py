import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, GlobalAveragePooling1D, Dense

# --- CONFIG ---
DATA_FILE = 'training_data.json'  # Make sure this file is in your main folder
VOCAB_SIZE = 1000
MAX_LEN = 50
EMBEDDING_DIM = 16

# 1. Load Data
print("Loading data...")
try:
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    # Look one level up if not found
    with open('../training_data.json', 'r') as f:
        data = json.load(f)

texts = [item['text'] for item in data]
labels = [item['intent'] for item in data]

# 2. Process Labels (Map "add_task" -> 0, etc.)
unique_labels = sorted(list(set(labels)))
label_map = {label: i for i, label in enumerate(unique_labels)}
numeric_labels = [label_map[label] for label in labels]

print(f"Classes: {unique_labels}")
# Save the label map so the proxy knows the truth
with open('label_map.json', 'w') as f:
    json.dump(unique_labels, f)

# 3. Create Tokenizer
tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token="<OOV>")
tokenizer.fit_on_texts(texts)
word_index = tokenizer.word_index

# Save Tokenizer
with open('tokenizer.json', 'w') as f:
    f.write(tokenizer.to_json())
print("✅ Tokenizer saved.")

# 4. Prepare Sequences
sequences = tokenizer.texts_to_sequences(texts)
padded_sequences = pad_sequences(sequences, maxlen=MAX_LEN, padding='post', truncating='post')

# 5. Build & Train Model
model = Sequential([
    Embedding(VOCAB_SIZE, EMBEDDING_DIM, input_length=MAX_LEN),
    GlobalAveragePooling1D(),
    Dense(16, activation='relu'),
    Dense(len(unique_labels), activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

print("Training brain...")
model.fit(np.array(padded_sequences), np.array(numeric_labels), epochs=50, verbose=0)

# 6. Save Model
model.save('my_brain.h5')
print("✅ New Brain (my_brain.h5) saved successfully!")