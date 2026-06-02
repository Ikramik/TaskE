import os
import json
import tensorflow as tf
import pickle
import logging

# Setup Logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global Cache
MODEL_ASSETS = None

def load_assets():
    """Load model and artifacts."""
    logger.info("Loading Model Assets...")
    base_dir = os.environ.get('SM_MODEL_DIR', '/opt/ml/model')
    
    # 1. Load Model
    model_path = os.path.join(base_dir, '1')
    if not os.path.exists(model_path): model_path = base_dir
    model = tf.keras.models.load_model(model_path)
    
    # 2. Load Vectorizer
    vocab_path = os.path.join(base_dir, 'vectorizer_vocab.pkl')
    if os.path.exists(vocab_path):
        with open(vocab_path, 'rb') as f: vocab = pickle.load(f)
        vectorizer = tf.keras.layers.TextVectorization(
            max_tokens=5000, output_mode='int', output_sequence_length=50, vocabulary=vocab)
    else:
        vectorizer = tf.keras.layers.TextVectorization(max_tokens=5000, output_mode='int', output_sequence_length=50)

    # 3. Load Intents
    classes = []
    intent_map = {}
    le_path = os.path.join(base_dir, 'label_encoder.json')
    if os.path.exists(le_path):
        with open(le_path, 'r') as f:
            data = json.load(f)
            classes = data.get('classes', [])
            intent_map = {str(i): c for i, c in enumerate(classes)}
            
    return {'model': model, 'vectorizer': vectorizer, 'classes': classes, 'intent_map': intent_map}

def handler(data, context):
    """Universal Entry Point"""
    global MODEL_ASSETS
    
    try:
        # Initialize
        if MODEL_ASSETS is None: MODEL_ASSETS = load_assets()

        # Parse Input
        body = data.read().decode('utf-8')
        request = json.loads(body)
        
        # Extract Text
        input_text = ""
        if 'instances' in request:
            item = request['instances'][0]
            if isinstance(item, dict): input_text = item.get('text', '')
            else: input_text = str(item)
        elif 'text' in request:
            input_text = request['text']
        else:
            input_text = str(request)

        # Inference
        vectorized = MODEL_ASSETS['vectorizer'](tf.constant([input_text]))
        preds = MODEL_ASSETS['model'].predict(vectorized, verbose=0)
        
        idx = tf.argmax(preds, axis=1).numpy()[0]
        conf = float(tf.reduce_max(preds, axis=1).numpy()[0])
        
        intent = MODEL_ASSETS['intent_map'].get(str(idx), "unknown")
        if idx < len(MODEL_ASSETS['classes']):
            intent = MODEL_ASSETS['classes'][idx]

        # Entities
        entities = {}
        if 'tomorrow' in input_text.lower(): entities['day'] = 'tomorrow'
        
        response = {
            "intent": intent,
            "confidence": conf,
            "entities": entities,
            "response": f"Detected: {intent}"
        }
        
        #THE FIX: Return Tuple (Data, ContentType)
        return json.dumps(response), "application/json"
        
    except Exception as e:
        logger.error(f"Error: {e}")
        # Return error as tuple too
        return json.dumps({"error": str(e)}), "application/json"