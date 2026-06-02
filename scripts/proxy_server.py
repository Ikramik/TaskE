from flask import Flask, request, jsonify
import json
import logging
import random
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.text import tokenizer_from_json
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIG ---
MAX_LEN = 50

# --- LOAD RESOURCES ---
# 1. Load the Tokenizer
with open('tokenizer.json', 'r') as f:
    tokenizer = tokenizer_from_json(f.read())

# 2. Load the Label Map (The Truth)
with open('label_map.json', 'r') as f:
    classes = json.load(f)  # e.g. ["add_task", "greeting", ...]

# 3. Load the Model (Local Brain)
# We use the model we just trained locally
model = load_model('my_brain.h5')
print("✅ Local Brain Loaded Successfully!")

# --- RESPONSES ---
RESPONSES = {
    "greeting": ["Hello! How can I help?", "Hi! Ready to schedule tasks?"],
    "add_task": ["I'll add that to your list.", "Scheduling that now."],
    "query_tasks": ["Here is your schedule.", "Checking your tasks..."],
    "help": ["Try saying 'Add a meeting at 2pm'.", "I can help you manage tasks."],
    "unknown": ["I didn't catch that.", "Could you rephrase?"]
}

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_text = data.get('text', '')
        logger.info(f"Phone says: {user_text}")

        # 1. Preprocess
        seq = tokenizer.texts_to_sequences([user_text])
        padded = pad_sequences(seq, maxlen=MAX_LEN, padding='post', truncating='post')

        # 2. Predict (Locally)
        prediction = model.predict(padded)
        predicted_index = np.argmax(prediction[0])
        confidence = prediction[0][predicted_index]

        # 3. Map to Intent
        intent = classes[predicted_index]
        
        # Threshold: If unsure, say "unknown"
        if confidence < 0.6: 
            intent = "unknown"

        logger.info(f"Detected Intent: {intent} (Confidence: {confidence:.2f})")

        # 4. Reply
        reply_text = random.choice(RESPONSES.get(intent, RESPONSES["unknown"]))

        return jsonify({
            "text": reply_text,
            "intent": intent,
            "confidence": float(confidence)
        })

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"text": "Brain Error", "intent": "error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)