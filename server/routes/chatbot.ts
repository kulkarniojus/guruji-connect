import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  chatbotTemplates,
  chatbotTrainingData,
  whatsappUsers,
  whatsappConversations,
  whatsappMessages,
  insertChatbotTemplateSchema,
  insertChatbotTrainingDataSchema,
} from '@shared/schema';
import { 
  initWhatsAppClient, 
  sendTemplateMessage, 
  initDefaultTemplates 
} from '../services/whatsapp';

const router = Router();

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Initialize WhatsApp client and default templates
let initialized = false;
const initialize = async () => {
  if (!initialized) {
    try {
      await initDefaultTemplates();
      await initWhatsAppClient();
      initialized = true;
      console.log('WhatsApp integration initialized');
    } catch (error) {
      console.error('Failed to initialize WhatsApp integration:', error);
    }
  }
};

// Initialize on server start
initialize();

// Get all chatbot templates
router.get('/templates', isAdmin, async (req: Request, res: Response) => {
  try {
    const templates = await db.query.chatbotTemplates.findMany({
      orderBy: desc(chatbotTemplates.updatedAt)
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Create new template
router.post('/templates', isAdmin, async (req: Request, res: Response) => {
  try {
    const templateData = insertChatbotTemplateSchema.parse(req.body);
    
    const [template] = await db.insert(chatbotTemplates).values({
      ...templateData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    // Check if template exists
    const existingTemplate = await db.query.chatbotTemplates.findFirst({
      where: eq(chatbotTemplates.id, id)
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update template
    const [updatedTemplate] = await db.update(chatbotTemplates)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(chatbotTemplates.id, id))
      .returning();
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    // Check if template exists
    const existingTemplate = await db.query.chatbotTemplates.findFirst({
      where: eq(chatbotTemplates.id, id)
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Delete template
    await db.delete(chatbotTemplates).where(eq(chatbotTemplates.id, id));
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// Get all training data
router.get('/training-data', isAdmin, async (req: Request, res: Response) => {
  try {
    const trainingData = await db.query.chatbotTrainingData.findMany({
      orderBy: desc(chatbotTrainingData.updatedAt)
    });
    
    res.json(trainingData);
  } catch (error) {
    console.error('Error fetching training data:', error);
    res.status(500).json({ message: 'Failed to fetch training data' });
  }
});

// Create new training data
router.post('/training-data', isAdmin, async (req: Request, res: Response) => {
  try {
    const trainingDataItem = insertChatbotTrainingDataSchema.parse(req.body);
    
    const [newTrainingData] = await db.insert(chatbotTrainingData).values({
      ...trainingDataItem,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    res.status(201).json(newTrainingData);
  } catch (error) {
    console.error('Error creating training data:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to create training data' });
  }
});

// Update training data
router.put('/training-data/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    // Check if training data exists
    const existingTrainingData = await db.query.chatbotTrainingData.findFirst({
      where: eq(chatbotTrainingData.id, id)
    });
    
    if (!existingTrainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }
    
    // Update training data
    const [updatedTrainingData] = await db.update(chatbotTrainingData)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(chatbotTrainingData.id, id))
      .returning();
    
    res.json(updatedTrainingData);
  } catch (error) {
    console.error('Error updating training data:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to update training data' });
  }
});

// Delete training data
router.delete('/training-data/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    // Check if training data exists
    const existingTrainingData = await db.query.chatbotTrainingData.findFirst({
      where: eq(chatbotTrainingData.id, id)
    });
    
    if (!existingTrainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }
    
    // Delete training data
    await db.delete(chatbotTrainingData).where(eq(chatbotTrainingData.id, id));
    
    res.json({ message: 'Training data deleted successfully' });
  } catch (error) {
    console.error('Error deleting training data:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to delete training data' });
  }
});

// Train NLP model
router.post('/train', isAdmin, async (req: Request, res: Response) => {
  try {
    // This would typically call a function to train the model
    // For now, we'll just simulate a successful response
    
    res.json({ message: 'Model training initiated' });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ message: 'Failed to train model' });
  }
});

// Get WhatsApp conversations
router.get('/conversations', isAdmin, async (req: Request, res: Response) => {
  try {
    const conversations = await db.query.whatsappConversations.findMany({
      with: {
        whatsappUser: {
          with: {
            user: true
          }
        },
        messages: {
          orderBy: desc(whatsappMessages.createdAt),
          limit: 50
        }
      },
      orderBy: desc(whatsappConversations.lastMessageAt)
    });
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get specific conversation and its messages
router.get('/conversations/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    const conversation = await db.query.whatsappConversations.findFirst({
      where: eq(whatsappConversations.id, id),
      with: {
        whatsappUser: {
          with: {
            user: true
          }
        },
        messages: {
          orderBy: desc(whatsappMessages.createdAt)
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// Send a reply to a conversation
router.post('/conversations/:id/reply', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
    
    // Get conversation with WhatsApp user
    const conversation = await db.query.whatsappConversations.findFirst({
      where: eq(whatsappConversations.id, id),
      with: {
        whatsappUser: true
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Send message via WhatsApp
    const waNumber = conversation.whatsappUser.whatsappNumber;
    const success = await sendTemplateMessage(waNumber, 'custom_message', { message });
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to send WhatsApp message' });
    }
    
    // Save message to database
    const [savedMessage] = await db.insert(whatsappMessages).values({
      conversationId: conversation.id,
      direction: 'outbound',
      messageContent: message,
      isDelivered: true,
      isRead: false,
      createdAt: new Date()
    }).returning();
    
    // Update conversation last message time
    await db.update(whatsappConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(whatsappConversations.id, conversation.id));
    
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error sending reply:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to send reply' });
  }
});

// Mark conversation as active/inactive
router.put('/conversations/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    
    // Check if conversation exists
    const conversation = await db.query.whatsappConversations.findFirst({
      where: eq(whatsappConversations.id, id)
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Update conversation status
    const [updatedConversation] = await db.update(whatsappConversations)
      .set({ isActive })
      .where(eq(whatsappConversations.id, id))
      .returning();
    
    res.json(updatedConversation);
  } catch (error) {
    console.error('Error updating conversation status:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to update conversation status' });
  }
});

// Get WhatsApp users
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const waUsers = await db.query.whatsappUsers.findMany({
      with: {
        user: true
      },
      orderBy: desc(whatsappUsers.lastInteractionAt)
    });
    
    res.json(waUsers);
  } catch (error) {
    console.error('Error fetching WhatsApp users:', error);
    res.status(500).json({ message: 'Failed to fetch WhatsApp users' });
  }
});

// Link WhatsApp user to system user
router.put('/users/:id/link', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const { userId } = z.object({ userId: z.number() }).parse(req.body);
    
    // Check if WhatsApp user exists
    const waUser = await db.query.whatsappUsers.findFirst({
      where: eq(whatsappUsers.id, id)
    });
    
    if (!waUser) {
      return res.status(404).json({ message: 'WhatsApp user not found' });
    }
    
    // Update WhatsApp user
    const [updatedUser] = await db.update(whatsappUsers)
      .set({ 
        userId,
        isVerified: true,
        updatedAt: new Date()
      })
      .where(eq(whatsappUsers.id, id))
      .returning();
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error linking WhatsApp user:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to link WhatsApp user' });
  }
});

// Opt out WhatsApp user
router.put('/users/:id/opt-out', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    
    // Check if WhatsApp user exists
    const waUser = await db.query.whatsappUsers.findFirst({
      where: eq(whatsappUsers.id, id)
    });
    
    if (!waUser) {
      return res.status(404).json({ message: 'WhatsApp user not found' });
    }
    
    // Update WhatsApp user
    const [updatedUser] = await db.update(whatsappUsers)
      .set({ 
        isOptedIn: false,
        updatedAt: new Date()
      })
      .where(eq(whatsappUsers.id, id))
      .returning();
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error opting out WhatsApp user:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: 'Failed to opt out WhatsApp user' });
  }
});

export default router;