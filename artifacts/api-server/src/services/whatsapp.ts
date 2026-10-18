import { Client, Message, Events } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { NlpManager } from 'node-nlp';
import fs from 'fs';
import { storage } from '../storage';
import path from 'path';

/**
 * WhatsApp service for sending and receiving messages
 * This service uses whatsapp-web.js to connect to WhatsApp
 * and node-nlp for natural language processing
 */
class WhatsAppService {
  private client: Client;
  private isInitialized: boolean = false;
  private nlpManager: NlpManager;
  private qrCodePromiseResolve: ((value: string | PromiseLike<string>) => void) | null = null;
  private qrCodePromise: Promise<string> | null = null;
  private sessionPath = path.join(process.cwd(), 'whatsapp-session.json');
  
  constructor() {
    // Initialize WhatsApp client
    this.client = new Client({
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      // Use session if available
      session: this.loadSession()
    });
    
    // Initialize NLP manager
    this.nlpManager = new NlpManager({ languages: ['en'], forceNER: true });
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Load WhatsApp session from file if available
   */
  private loadSession(): any {
    try {
      if (fs.existsSync(this.sessionPath)) {
        const sessionData = fs.readFileSync(this.sessionPath, 'utf8');
        return JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Error loading WhatsApp session:', error);
    }
    return null;
  }
  
  /**
   * Save WhatsApp session to file
   */
  private saveSession(session: any): void {
    try {
      fs.writeFileSync(this.sessionPath, JSON.stringify(session), 'utf8');
    } catch (error) {
      console.error('Error saving WhatsApp session:', error);
    }
  }
  
  /**
   * Set up WhatsApp client event handlers
   */
  private setupEventHandlers(): void {
    // QR code generation event
    this.client.on(Events.QR_RECEIVED, (qr) => {
      console.log('WhatsApp QR Code received, scan it to log in:');
      qrcode.generate(qr, { small: true });
      
      // Resolve the QR code promise if it exists
      if (this.qrCodePromiseResolve) {
        this.qrCodePromiseResolve(qr);
        this.qrCodePromiseResolve = null;
      }
    });
    
    // Authentication event
    this.client.on(Events.AUTHENTICATED, (session) => {
      console.log('WhatsApp authenticated successfully');
      this.saveSession(session);
    });
    
    // Ready event
    this.client.on(Events.READY, () => {
      console.log('WhatsApp client is ready');
      this.isInitialized = true;
    });
    
    // Message event
    this.client.on(Events.MESSAGE_RECEIVED, async (message: Message) => {
      if (message.from === 'status@broadcast') return;
      
      try {
        // Process the message
        await this.processIncomingMessage(message);
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
      }
    });
    
    // Disconnected event
    this.client.on(Events.DISCONNECTED, () => {
      console.log('WhatsApp client disconnected');
      this.isInitialized = false;
    });
  }
  
  /**
   * Initialize the WhatsApp client
   */
  public async initialize(): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('Initializing WhatsApp client...');
        await this.client.initialize();
        
        // Load the NLP model if it exists
        try {
          if (fs.existsSync('chatbot-model.nlp')) {
            await this.nlpManager.load('chatbot-model.nlp');
            console.log('NLP model loaded successfully');
          } else {
            console.log('NLP model not found, bot will not provide intelligent responses');
            // Load training data and train the model
            try {
              // This method assumes that chatbotTrainingData is defined elsewhere in your project
              const trainingData = await storage.getChatbotTrainingData();
              
              if (trainingData && trainingData.length > 0) {
                console.log('Training NLP model with available training data...');
                
                for (const data of trainingData) {
                  // Add utterances for intent
                  for (const utterance of data.utterances) {
                    this.nlpManager.addDocument('en', utterance, data.intent);
                  }
                  
                  // Add entity texts if available
                  if (data.entities) {
                    for (const [entityName, values] of Object.entries(data.entities)) {
                      for (const value of values) {
                        this.nlpManager.addNamedEntityText(entityName, value, ['en'], [value]);
                      }
                    }
                  }
                  
                  // Add responses for intent
                  for (const response of data.responses) {
                    this.nlpManager.addAnswer('en', data.intent, response);
                  }
                }
                
                // Train the model
                await this.nlpManager.train();
                await this.nlpManager.save('chatbot-model.nlp');
                console.log('NLP model trained and saved successfully');
              } else {
                console.log('No training data available for NLP model');
              }
            } catch (error) {
              console.error('Error training NLP model:', error);
            }
          }
        } catch (error) {
          console.error('Error loading NLP model:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      throw error;
    }
  }
  
  /**
   * Get a QR code for WhatsApp authentication
   */
  public async getQRCode(): Promise<string> {
    if (this.isInitialized) {
      return Promise.resolve('Already authenticated');
    }
    
    if (!this.qrCodePromise) {
      this.qrCodePromise = new Promise<string>((resolve) => {
        this.qrCodePromiseResolve = resolve;
      });
      
      // Initialize the client if not already done
      if (!this.client.info) {
        this.initialize().catch(console.error);
      }
    }
    
    return this.qrCodePromise;
  }
  
  /**
   * Send a WhatsApp message
   */
  public async sendMessage(to: string, text: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Normalize the phone number
      const normalizedNumber = this.normalizePhoneNumber(to);
      if (!normalizedNumber) {
        throw new Error('Invalid phone number');
      }
      
      // Send the message
      await this.client.sendMessage(`${normalizedNumber}@c.us`, text);
      
      console.log(`Message sent to ${normalizedNumber}: ${text}`);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }
  
  /**
   * Send a template message with placeholders
   */
  public async sendTemplateMessage(to: string, templateName: string, placeholders: Record<string, string>): Promise<void> {
    try {
      // Get the template from storage
      const templates = await storage.getChatbotTemplates();
      const template = templates.find(t => t.name === templateName && t.isActive);
      
      if (!template) {
        throw new Error(`Template "${templateName}" not found or inactive`);
      }
      
      // Replace placeholders in the template
      let messageText = template.content;
      for (const [key, value] of Object.entries(placeholders)) {
        messageText = messageText.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      // Send the message
      await this.sendMessage(to, messageText);
    } catch (error) {
      console.error('Error sending template message:', error);
      throw error;
    }
  }
  
  /**
   * Process an incoming WhatsApp message
   */
  private async processIncomingMessage(message: Message): Promise<void> {
    const from = message.from;
    const text = message.body;
    
    console.log(`Received message from ${from}: ${text}`);
    
    // Extract the phone number from the chat ID
    const phoneNumber = from.split('@')[0];
    
    // Check if this is a new conversation or part of an existing one
    let conversation = await this.findOrCreateConversation(phoneNumber);
    
    // Store the message
    await storage.addChatbotMessage({
      conversationId: conversation.id,
      text,
      fromUser: true
    });
    
    // Process the message with NLP
    await this.processWithNLP(conversation, text);
  }
  
  /**
   * Find or create a conversation for a phone number
   */
  private async findOrCreateConversation(phoneNumber: string): Promise<any> {
    try {
      // Find existing conversation
      const conversations = await storage.getChatbotConversations();
      const conversation = conversations.find(c => c.whatsappNumber === phoneNumber && c.status === 'active');
      
      if (conversation) {
        return conversation;
      }
      
      // If no active conversation, create a new one
      const userId = await this.findUserIdByPhone(phoneNumber);
      
      return await storage.createChatbotConversation({
        userId: userId || 0,  // Use 0 for unknown users
        whatsappNumber: phoneNumber,
        status: 'active'
      });
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Find a user ID by phone number
   */
  private async findUserIdByPhone(phoneNumber: string): Promise<number | null> {
    try {
      const users = await storage.getChatbotUsers();
      const user = users.find(u => u.mobile === phoneNumber || u.whatsappNumber === phoneNumber);
      
      return user ? user.id : null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }
  
  /**
   * Process a message with NLP and send a response
   */
  private async processWithNLP(conversation: any, text: string): Promise<void> {
    try {
      // Process the message with NLP
      const result = await this.nlpManager.process('en', text);
      
      console.log('NLP Result:', result);
      
      // Get a response based on the intent
      let response: string;
      
      if (result.intent && result.score > 0.6) {
        // Use the NLP response if confident
        const answers = await this.nlpManager.getAnswers('en', text);
        if (answers && answers.length > 0) {
          // Randomly select an answer
          const randomIndex = Math.floor(Math.random() * answers.length);
          response = answers[randomIndex].answer;
        } else {
          response = "I'm sorry, I didn't understand that. Could you please rephrase?";
        }
      } else {
        // Handle common intents
        switch(result.intent) {
          case 'greeting':
            response = "Hello! How can I help you today?";
            break;
          case 'booking_inquiry':
            // Check if there are any active bookings for the user
            if (conversation.userId) {
              const userBookings = await storage.getBookingsByCustomerId(conversation.userId);
              
              if (userBookings && userBookings.length > 0) {
                // Get the most recent booking
                const latestBooking = userBookings.sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                
                response = `You have a ${latestBooking.pujaName} booking on ${new Date(latestBooking.scheduledAt).toLocaleDateString()} at ${new Date(latestBooking.scheduledAt).toLocaleTimeString()}. Status: ${latestBooking.status}`;
              } else {
                response = "You don't have any active bookings. Would you like to book a puja?";
              }
            } else {
              response = "I couldn't find any bookings. Please register on our app to book pujas.";
            }
            break;
          case 'puja_info':
            // Extract puja name entity if available
            let pujaName = '';
            if (result.entities && result.entities.length > 0) {
              const pujaEntity = result.entities.find(e => e.entity === 'puja');
              if (pujaEntity) {
                pujaName = pujaEntity.option;
              }
            }
            
            if (pujaName) {
              // Get puja information
              const puja = await storage.searchPujas(pujaName);
              if (puja && puja.length > 0) {
                response = `${puja[0].name} is a ${puja[0].duration} minute puja that costs around ₹${puja[0].basePrice}. ${puja[0].description}`;
              } else {
                response = `I don't have information about ${pujaName}. Please check our app for a list of all pujas.`;
              }
            } else {
              response = "We offer various types of pujas. Please check our app for more details.";
            }
            break;
          case 'guruji_info':
            if (conversation.userId) {
              // Get booking information for the user
              const userBookings = await storage.getBookingsByCustomerId(conversation.userId);
              
              if (userBookings && userBookings.length > 0) {
                // Find a booking with an assigned guruji
                const bookingWithGuruji = userBookings.find(b => b.gurujiId);
                
                if (bookingWithGuruji) {
                  const guruji = await storage.getGurujiProfile(bookingWithGuruji.gurujiId);
                  
                  if (guruji) {
                    const user = await storage.getUser(guruji.userId);
                    response = `Your guruji is ${user.firstName} ${user.lastName}. They have ${guruji.experience} years of experience and a rating of ${guruji.rating}/5 from ${guruji.totalReviews} reviews.`;
                  } else {
                    response = "I couldn't find information about your guruji.";
                  }
                } else {
                  response = "You don't have a guruji assigned to any of your bookings yet.";
                }
              } else {
                response = "You don't have any bookings with a guruji. Would you like to book a puja?";
              }
            } else {
              response = "Please register on our app to get connected with a guruji.";
            }
            break;
          case 'help':
            response = "I can help you with information about pujas, bookings, and more. You can ask about your bookings, find information about pujas, or get contact details for your guruji.";
            break;
          default:
            response = "I'm not sure how to help with that. Could you try asking in a different way? You can ask about bookings, pujas, or your assigned guruji.";
        }
      }
      
      // Add the bot's response to the conversation
      await storage.addChatbotMessage({
        conversationId: conversation.id,
        text: response,
        fromUser: false
      });
      
      // Send the response via WhatsApp
      await this.sendMessage(conversation.whatsappNumber, response);
    } catch (error) {
      console.error('Error processing message with NLP:', error);
      
      // Send a fallback response
      await this.sendMessage(
        conversation.whatsappNumber, 
        "I'm sorry, I'm having trouble processing your request. Please try again later or contact customer support."
      );
    }
  }
  
  /**
   * Normalize a phone number to international format
   */
  private normalizePhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');
    
    // If the number starts with '0', replace with the country code (default to India +91)
    if (normalized.startsWith('0')) {
      normalized = '91' + normalized.substring(1);
    }
    
    // If no country code is present, add it (default to India +91)
    if (normalized.length === 10) {
      normalized = '91' + normalized;
    }
    
    // Validate the phone number (should be 11-15 digits with country code)
    if (normalized.length >= 11 && normalized.length <= 15) {
      return normalized;
    }
    
    return null;
  }
  
  /**
   * Shutdown the WhatsApp client
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('Shutting down WhatsApp client...');
        await this.client.destroy();
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error shutting down WhatsApp client:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const whatsappService = new WhatsAppService();
export default whatsappService;