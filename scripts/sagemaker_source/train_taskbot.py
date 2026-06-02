import os
import json
import argparse
import tensorflow as tf
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def load_training_data(training_dir):
    """Load and preprocess training data"""
    training_data_path = os.path.join(training_dir, 'training_data.json')
    
    with open(training_data_path, 'r') as f:
        data = json.load(f)
    
    print(f"📊 Loaded {len(data)} training examples")
    
    # Extract texts and intents
    texts = [example['text'] for example in data]
    intents = [example['intent'] for example in data]
    
    return texts, intents

def preprocess_data(texts, intents):
    """Preprocess data for training"""
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(intents)
    
    # Text vectorization
    vectorizer = tf.keras.layers.TextVectorization(
        max_tokens=5000,
        output_mode='int',
        output_sequence_length=50
    )
    
    # Adapt vectorizer to the texts
    text_ds = tf.data.Dataset.from_tensor_slices(texts)
    vectorizer.adapt(text_ds)
    
    # Vectorize texts
    X_encoded = vectorizer(texts)
    
    print(f"📈 Number of classes: {len(label_encoder.classes_)}")
    print(f"🔤 Classes: {label_encoder.classes_}")
    
    return X_encoded, y_encoded, vectorizer, label_encoder

def create_model(vocab_size, num_classes, embedding_dim=128):
    """Create the neural network model"""
    model = tf.keras.Sequential([
        tf.keras.layers.Embedding(
            input_dim=vocab_size,
            output_dim=embedding_dim,
            input_length=50
        ),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

if __name__ == '__main__':
    # Parse hyperparameters
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--batch_size', type=int, default=16)
    parser.add_argument('--learning_rate', type=float, default=0.001)
    parser.add_argument('--vocab_size', type=int, default=5000)
    parser.add_argument('--embedding_dim', type=int, default=128)
    
    args, _ = parser.parse_known_args()
    
    # Load and preprocess data
    texts, intents = load_training_data('/opt/ml/input/data/training')
    X_encoded, y_encoded, vectorizer, label_encoder = preprocess_data(texts, intents)
    
    # 🔧 FIX: Convert TensorFlow tensors to NumPy arrays
    X_numpy = X_encoded.numpy()  # Convert TensorFlow tensor to NumPy
    y_numpy = np.array(y_encoded)  # Ensure y is NumPy array
    
    # Split data (now with NumPy arrays)
    X_train, X_val, y_train, y_val = train_test_split(
        X_numpy, y_numpy, test_size=0.2, random_state=42
    )
    
    # Create model
    model = create_model(
        vocab_size=args.vocab_size,
        num_classes=len(label_encoder.classes_),
        embedding_dim=args.embedding_dim
    )
    
    print(" Model architecture:")
    model.summary()
    
    # Train model
    print(" Starting training...")
    history = model.fit(
        X_train, y_train,
        batch_size=args.batch_size,
        epochs=args.epochs,
        validation_data=(X_val, y_val),
        verbose=1
    )
    
    # Save model
    model.save('/opt/ml/model/1')
    
    # Save preprocessing artifacts
    artifacts = {
        'vectorizer': vectorizer.get_config(),
        'label_encoder': {
            'classes': label_encoder.classes_.tolist()
        }
    }
    
    with open('/opt/ml/model/artifacts.json', 'w') as f:
        json.dump(artifacts, f)
    
    print("Training completed and model saved!")
    # Save vectorizer vocabulary
    vectorizer_vocab = vectorizer.get_vocabulary()
    with open('/opt/ml/model/vectorizer_vocab.pkl', 'wb') as f:
        pickle.dump(vectorizer_vocab, f)

    # Save label encoder
    with open('/opt/ml/model/label_encoder.json', 'w') as f:
        json.dump({
            'classes': label_encoder.classes_.tolist()
        }, f)

    print("Model and artifacts saved!")