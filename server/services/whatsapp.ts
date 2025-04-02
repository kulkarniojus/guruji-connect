import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  whatsappUsers, 
  whatsappConversations, 
  whatsappMessages, 
  chatbotTemplates,
  users
} from '@shared/schema';
import { NlpManager } from 'node-nlp';

// Initialize NLP manager for intent recognition
const manager = new NlpManager({ languages: ['en'], forceNER: true });

// WhatsApp Client
let whatsappClient: Client;

// Initialize the WhatsApp client
export async function initWhatsAppClient() {
  console.log('Initializing WhatsApp client...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('QR Code received, scan to authenticate:');
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp client is ready');
    // Load trained model or train the NLP model
    loadOrTrainNlpModel();
  });

  whatsappClient.on('message', async (message) => {
    try {
      await handleIncomingMessage(message);
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  });

  await whatsappClient.initialize();
}

// Load or train the NLP model
async function loadOrTrainNlpModel() {
  try {
    // Try to load existing model
    await manager.load('./chatbot-model.nlp');
    console.log('NLP model loaded successfully');
  } catch (error) {
    console.log('Training new NLP model...');
    
    // Fetch training data from database
    const trainingData = await db.query.chatbotTrainingData.findMany();
    
    if (trainingData.length === 0) {
      // If no training data in database, add some default training data
      await addDefaultTrainingData();
    }
    
    // Train the model with data from database
    const freshTrainingData = await db.query.chatbotTrainingData.findMany();
    
    for (const data of freshTrainingData) {
      manager.addDocument('en', data.text, data.intent);
      
      // If entities are provided, add them to the training
      if (data.entities) {
        for (const entity of Object.entries(data.entities)) {
          const [entityName, entityValue] = entity;
          manager.addNamedEntityText(
            entityName,
            entityValue as string,
            ['en'],
            [entityValue as string]
          );
        }
      }
    }
    
    // Train the model
    await manager.train();
    // Save the model for future use
    await manager.save('./chatbot-model.nlp');
    console.log('NLP model trained and saved successfully');
  }
}

// Add default training data if none exists
async function addDefaultTrainingData() {
  const defaultTrainingData = [
    // Greeting intents
    { text: 'Hi', intent: 'greeting' },
    { text: 'Hello', intent: 'greeting' },
    { text: 'Good morning', intent: 'greeting' },
    { text: 'Hey there', intent: 'greeting' },
    { text: 'Namaste', intent: 'greeting' },
    
    // Booking inquiry intents
    { text: 'I want to book a puja', intent: 'booking_inquiry' },
    { text: 'How can I schedule a ceremony?', intent: 'booking_inquiry' },
    { text: 'I need to arrange a puja ceremony', intent: 'booking_inquiry' },
    { text: 'Book an appointment with guruji', intent: 'booking_inquiry' },
    
    // Puja information intents
    { text: 'What pujas do you offer?', intent: 'puja_information' },
    { text: 'Tell me about Satyanarayan puja', intent: 'puja_information' },
    { text: 'What is the cost of Griha Pravesh puja?', intent: 'puja_information' },
    { text: 'How long does Ganesh puja take?', intent: 'puja_information' },
    
    // Guruji availability intents
    { text: 'Is there a guruji available tomorrow?', intent: 'guruji_availability' },
    { text: 'When can I find a priest for home ceremony?', intent: 'guruji_availability' },
    { text: 'Check availability for next Sunday', intent: 'guruji_availability' },
    
    // Payment issues
    { text: 'I have a problem with my payment', intent: 'payment_issue' },
    { text: 'Payment failed', intent: 'payment_issue' },
    { text: 'How do I pay for my booking?', intent: 'payment_issue' },
    
    // Cancel booking
    { text: 'I want to cancel my booking', intent: 'cancel_booking' },
    { text: 'Cancel my appointment', intent: 'cancel_booking' },
    { text: 'How do I cancel a puja?', intent: 'cancel_booking' },
    
    // Reschedule booking
    { text: 'Can I reschedule my puja?', intent: 'reschedule_booking' },
    { text: 'Change the date of my booking', intent: 'reschedule_booking' },
    { text: 'Need to reschedule appointment', intent: 'reschedule_booking' },
    
    // General inquiry
    { text: 'How does GurujiConnect work?', intent: 'general_inquiry' },
    { text: 'Tell me about your service', intent: 'general_inquiry' },
    { text: 'What is GurujiConnect?', intent: 'general_inquiry' },
    
    // Technical support
    { text: 'App is not working', intent: 'technical_support' },
    { text: 'Having trouble with login', intent: 'technical_support' },
    { text: 'Can\'t see my bookings', intent: 'technical_support' },
    
    // Other inquiries
    { text: 'Connect me with customer support', intent: 'other' },
    { text: 'I have a special request', intent: 'other' },
    { text: 'Need help with something else', intent: 'other' },
  ];
  
  for (const data of defaultTrainingData) {
    await db.insert(chatbotTrainingData).values({
      text: data.text,
      intent: data.intent as any,
      entities: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  console.log('Default training data added');
}

// Handle incoming WhatsApp messages
async function handleIncomingMessage(message: any) {
  console.log(`Received message: ${message.body} from ${message.from}`);

  if (message.fromMe) return; // Ignore messages sent by us
  
  // Extract the WhatsApp number without WhatsApp suffix
  const whatsappNumber = message.from.replace('@c.us', '');
  
  // Find or create WhatsApp user
  let whatsappUser = await db.query.whatsappUsers.findFirst({
    where: eq(whatsappUsers.whatsappNumber, whatsappNumber)
  });
  
  if (!whatsappUser) {
    // Create new WhatsApp user if not exists
    const [newUser] = await db.insert(whatsappUsers).values({
      whatsappNumber,
      isOptedIn: true,
      lastInteractionAt: new Date()
    }).returning();
    
    whatsappUser = newUser;
  } else {
    // Update last interaction time
    await db.update(whatsappUsers)
      .set({ lastInteractionAt: new Date() })
      .where(eq(whatsappUsers.id, whatsappUser.id));
  }
  
  // Find active conversation or create new one
  let conversation = await db.query.whatsappConversations.findFirst({
    where: and(
      eq(whatsappConversations.whatsappUserId, whatsappUser.id),
      eq(whatsappConversations.isActive, true)
    )
  });
  
  if (!conversation) {
    // Create new conversation
    const [newConversation] = await db.insert(whatsappConversations).values({
      whatsappUserId: whatsappUser.id,
      lastMessageAt: new Date(),
      contextData: {}
    }).returning();
    
    conversation = newConversation;
  } else {
    // Update conversation last message time
    await db.update(whatsappConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(whatsappConversations.id, conversation.id));
  }
  
  // Save incoming message to database
  await db.insert(whatsappMessages).values({
    conversationId: conversation.id,
    direction: 'inbound',
    messageContent: message.body,
    mediaUrl: message.hasMedia ? await saveMedia(message) : null,
    messageId: message.id._serialized
  });
  
  // Process message with NLP
  const result = await manager.process('en', message.body);
  const intent = result.intent || 'other';
  const confidence = result.score || 0;
  
  console.log(`Detected intent: ${intent} with confidence: ${confidence}`);
  
  // Update message intent in database
  await db.update(whatsappMessages)
    .set({ intent: intent as any })
    .where(eq(whatsappMessages.messageId, message.id._serialized));
  
  // Get response based on intent
  const response = await getResponseForIntent(intent, whatsappUser, conversation.contextData);
  
  // Send response
  await whatsappClient.sendMessage(message.from, response);
  
  // Save outbound message to database
  await db.insert(whatsappMessages).values({
    conversationId: conversation.id,
    direction: 'outbound',
    messageContent: response,
    isDelivered: true,
    intent: intent as any
  });
}

// Save media if message contains any
async function saveMedia(message: any): Promise<string | null> {
  if (!message.hasMedia) return null;
  
  try {
    const media = await message.downloadMedia();
    // Here you would typically upload the media to a storage service
    // and return the URL. For simplicity, we're returning the media data.
    return `data:${media.mimetype};base64,${media.data}`;
  } catch (error) {
    console.error('Error downloading media:', error);
    return null;
  }
}

// Get response template based on intent
async function getResponseForIntent(
  intent: string, 
  whatsappUser: typeof whatsappUsers.$inferSelect,
  contextData: any
): Promise<string> {
  // Try to find a template for the intent
  const template = await db.query.chatbotTemplates.findFirst({
    where: and(
      eq(chatbotTemplates.intent, intent as any),
      eq(chatbotTemplates.isActive, true)
    )
  });
  
  // If no template found, use a default response
  if (!template) {
    return getDefaultResponse(intent);
  }
  
  // Get user data if associated with a system user
  let userData = null;
  if (whatsappUser.userId) {
    userData = await db.query.users.findFirst({
      where: eq(users.id, whatsappUser.userId)
    });
  }
  
  // Replace variables in template
  let responseText = template.content;
  
  // Replace user variables
  if (userData) {
    responseText = responseText.replace(/\{firstName\}/g, userData.firstName);
    responseText = responseText.replace(/\{lastName\}/g, userData.lastName);
  }
  
  // Replace context data variables
  if (contextData) {
    for (const [key, value] of Object.entries(contextData)) {
      responseText = responseText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  }
  
  return responseText;
}

// Default responses for each intent
function getDefaultResponse(intent: string): string {
  const responses: Record<string, string> = {
    greeting: 'Hello! Welcome to GurujiConnect. How can I help you today?',
    booking_inquiry: 'Thank you for your interest in booking a puja. Please visit our app or website to see available options and schedule your ceremony.',
    puja_information: 'We offer various types of pujas and ceremonies. You can view the full list, including prices and details, on our app or website.',
    guruji_availability: 'Our gurujis have different availability schedules. Please check our app to find available slots for your preferred date and location.',
    payment_issue: 'I\'m sorry to hear you\'re having payment issues. Please contact our support team at support@gurujiconnect.com for assistance.',
    cancel_booking: 'To cancel a booking, please log in to our app and go to your bookings section. You can cancel from there according to our cancellation policy.',
    reschedule_booking: 'You can reschedule your booking through our app. Go to your bookings and select the reschedule option for your appointment.',
    general_inquiry: 'GurujiConnect is a platform that connects you with qualified spiritual advisors for online consultations and religious ceremonies.',
    technical_support: 'I\'m sorry you\'re experiencing technical issues. Please describe the problem in detail, or contact support@gurujiconnect.com for assistance.',
    other: 'Thank you for your message. If you need specific help, please provide more details or contact our customer support team.'
  };
  
  return responses[intent] || responses.other;
}

// Send template message to a WhatsApp number
export async function sendTemplateMessage(
  whatsappNumber: string, 
  templateName: string, 
  variables: Record<string, string> = {}
): Promise<boolean> {
  try {
    if (!whatsappClient || !whatsappClient.info) {
      console.error('WhatsApp client not initialized');
      return false;
    }
    
    // Get template from database
    const template = await db.query.chatbotTemplates.findFirst({
      where: eq(chatbotTemplates.name, templateName)
    });
    
    if (!template) {
      console.error(`Template "${templateName}" not found`);
      return false;
    }
    
    // Format WhatsApp number
    const formattedNumber = whatsappNumber.includes('@c.us') 
      ? whatsappNumber 
      : `${whatsappNumber}@c.us`;
    
    // Replace variables in template
    let messageContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      messageContent = messageContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    // Send message
    await whatsappClient.sendMessage(formattedNumber, messageContent);
    
    // Get or create WhatsApp user
    let whatsappUser = await db.query.whatsappUsers.findFirst({
      where: eq(whatsappUsers.whatsappNumber, whatsappNumber.replace('@c.us', ''))
    });
    
    if (!whatsappUser) {
      // Create new WhatsApp user
      const [newUser] = await db.insert(whatsappUsers).values({
        whatsappNumber: whatsappNumber.replace('@c.us', ''),
        isOptedIn: true,
        lastInteractionAt: new Date()
      }).returning();
      
      whatsappUser = newUser;
    }
    
    // Get or create conversation
    let conversation = await db.query.whatsappConversations.findFirst({
      where: and(
        eq(whatsappConversations.whatsappUserId, whatsappUser.id),
        eq(whatsappConversations.isActive, true)
      )
    });
    
    if (!conversation) {
      // Create new conversation
      const [newConversation] = await db.insert(whatsappConversations).values({
        whatsappUserId: whatsappUser.id,
        lastMessageAt: new Date(),
        contextData: {}
      }).returning();
      
      conversation = newConversation;
    }
    
    // Save outbound message to database
    await db.insert(whatsappMessages).values({
      conversationId: conversation.id,
      direction: 'outbound',
      messageContent,
      isDelivered: true,
      intent: template.intent
    });
    
    return true;
  } catch (error) {
    console.error('Error sending template message:', error);
    return false;
  }
}

// Send notification to user based on booking status change
export async function sendBookingStatusNotification(
  bookingId: number,
  status: string
): Promise<boolean> {
  try {
    // Get booking details with customer information
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        customer: true,
        puja: true
      }
    });
    
    if (!booking || !booking.customer) {
      console.error(`Booking ${bookingId} not found or no customer associated`);
      return false;
    }
    
    // Get WhatsApp user for the customer
    const whatsappUser = await db.query.whatsappUsers.findFirst({
      where: eq(whatsappUsers.userId, booking.customer.id)
    });
    
    if (!whatsappUser) {
      console.error(`No WhatsApp user found for customer ${booking.customer.id}`);
      return false;
    }
    
    // Determine template name based on status
    let templateName = '';
    switch (status) {
      case 'confirmed':
        templateName = 'booking_confirmed';
        break;
      case 'cancelled':
        templateName = 'booking_cancelled';
        break;
      case 'in_progress':
        templateName = 'booking_started';
        break;
      case 'completed':
        templateName = 'booking_completed';
        break;
      default:
        templateName = 'booking_update';
    }
    
    // Send notification using template
    return await sendTemplateMessage(
      whatsappUser.whatsappNumber,
      templateName,
      {
        customerName: booking.customer.firstName,
        pujaName: booking.puja?.name || 'your ceremony',
        bookingId: bookingId.toString(),
        bookingDate: new Date(booking.date).toLocaleDateString(),
        status
      }
    );
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return false;
  }
}

// Initialize default templates
export async function initDefaultTemplates() {
  const defaultTemplates = [
    {
      name: 'greeting',
      description: 'Default greeting response',
      content: 'Hello {firstName}! Welcome to GurujiConnect. How can I help you today?',
      intent: 'greeting' as any,
      variables: ['firstName']
    },
    {
      name: 'booking_confirmed',
      description: 'Sent when a booking is confirmed',
      content: 'Dear {customerName}, your booking #{bookingId} for {pujaName} on {bookingDate} has been confirmed. You can view details in the GurujiConnect app.',
      intent: 'booking_inquiry' as any,
      variables: ['customerName', 'bookingId', 'pujaName', 'bookingDate']
    },
    {
      name: 'booking_cancelled',
      description: 'Sent when a booking is cancelled',
      content: 'Dear {customerName}, your booking #{bookingId} for {pujaName} has been cancelled. If you didn\'t request this cancellation, please contact support.',
      intent: 'cancel_booking' as any,
      variables: ['customerName', 'bookingId', 'pujaName']
    },
    {
      name: 'booking_reminder',
      description: 'Sent as a reminder before scheduled puja',
      content: 'Reminder: Your {pujaName} is scheduled for tomorrow at {bookingTime}. Please ensure you\'re prepared as per the guidelines shared earlier.',
      intent: 'booking_inquiry' as any,
      variables: ['pujaName', 'bookingTime']
    },
    {
      name: 'payment_confirmation',
      description: 'Sent when payment is received',
      content: 'Thank you, {customerName}! We\'ve received your payment of ₹{amount} for booking #{bookingId}. Your receipt is available in the app.',
      intent: 'payment_issue' as any,
      variables: ['customerName', 'amount', 'bookingId']
    }
  ];
  
  for (const template of defaultTemplates) {
    // Check if template already exists
    const existing = await db.query.chatbotTemplates.findFirst({
      where: eq(chatbotTemplates.name, template.name)
    });
    
    if (!existing) {
      // Create new template
      await db.insert(chatbotTemplates).values({
        ...template,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Created template: ${template.name}`);
    }
  }
}