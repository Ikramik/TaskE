import json
from tensorflow.keras.preprocessing.text import Tokenizer

# --- CONFIG ---
DATA_FILE = 'training_data.json' 
VOCAB_SIZE = 1000   # Must match your original training config
OOV_TOKEN = "<OOV>"

try:
    print(f"1. Loading {DATA_FILE}...")
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    
    # Extract just the text sentences
    texts = [item['text'] for item in data]
    print(f"   Found {len(texts)} sentences.")
    
    # 2. Train Tokenizer
    print("2. Learning vocabulary...")
    tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token=OOV_TOKEN)
    tokenizer.fit_on_texts(texts)
    
    # 3. Save it
    print("3. Saving tokenizer.json...")
    json_str = tokenizer.to_json()
    with open('tokenizer.json', 'w') as f:
        f.write(json_str)
        
    print("SUCCESS! tokenizer.json created.")
    print(f"Vocabulary size: {len(tokenizer.word_index)}")

except Exception as e:
    print(f"ERROR: {e}")