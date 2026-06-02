// QuickAIService.js
export class QuickAIService {
  constructor() {
    this.apiUrl = "YOUR_API_GATEWAY_URL_HERE";
    this.fallbackEnabled = true;
    this.timeout = 5000; // 5 second timeout
  }

  async processMessage(message, context = {}) {
    try {
      console.log("🤖 Calling AI endpoint for:", message);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: message,
          userId: context.userId || "anonymous",
          context: context
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const aiResponse = await response.json();
      
      // Validate AI response structure
      if (this.validateAIResponse(aiResponse)) {
        return this.formatForChatbot(aiResponse);
      } else {
        throw new Error("Invalid AI response format");
      }

    } catch (error) {
      console.warn("AI Service failed:", error.message);
      
      if (this.fallbackEnabled) {
        return this.fallbackToLocalNLP(message);
      } else {
        // Return error response
        return {
          intent: "error",
          confidence: 0,
          entities: {},
          response: "I'm having trouble connecting to my AI brain right now. Please try again later.",
          source: 'error',
          timestamp: Date.now()
        };
      }
    }
  }

  validateAIResponse(response) {
    const required = ['intent', 'confidence', 'entities'];
    return required.every(field => field in response);
  }

  formatForChatbot(aiData) {
    return {
      intent: aiData.intent,
      confidence: aiData.confidence,
      entities: aiData.entities,
      response: aiData.response,
      source: 'ai',
      timestamp: Date.now(),
      rawAIResponse: aiData
    };
  }

  fallbackToLocalNLP(message) {
    console.log("🔄 Using local NLP fallback");
    
    const { intent, confidence } = this.classifyIntent(message);
    const entities = this.extractEntities(message);
    
    return {
      intent,
      confidence,
      entities,
      response: this.generateResponse(intent, entities),
      source: 'fallback',
      timestamp: Date.now()
    };
  }

  // Your existing local NLP methods
  classifyIntent(message) {
    // Keep your existing regex-based classification
    const patterns = {
      add_task: /\b(add|create|schedule|new)\b/i,
      view_tasks: /\b(show|view|list|what).*\b(tasks|schedule)\b/i,
      delete_task: /\b(delete|remove|cancel)\b/i,
      greeting: /\b(hello|hi|hey)\b/i,
      thanks: /\b(thanks|thank you|thx)\b/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        return { intent, confidence: 0.8 }; // Lower confidence for fallback
      }
    }

    return { intent: 'unknown', confidence: 0.1 };
  }

  extractEntities(message) {
    // Your existing entity extraction
    const entities = {};
    
    // Time extraction
    const timeMatch = message.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
    if (timeMatch) entities.time = timeMatch[1];
    
    // Duration extraction  
    const durationMatch = message.match(/\b(\d+)\s*(?:min|minutes|hour|hours)\b/i);
    if (durationMatch) entities.duration = parseInt(durationMatch[1]);
    
    return entities;
  }

  generateResponse(intent, entities) {
    const responses = {
      add_task: `I'll add ${entities.taskTitle || 'this task'} to your schedule.`,
      view_tasks: "Here are your current tasks...",
      delete_task: `I'll remove ${entities.taskTitle || 'that task'} for you.`,
      greeting: "Hello! How can I help with your tasks today?",
      thanks: "You're welcome!",
      unknown: "I'm not sure how to help with that. Try asking about adding, viewing, or deleting tasks."
    };
    
    return responses[intent] || responses.unknown;
  }
}