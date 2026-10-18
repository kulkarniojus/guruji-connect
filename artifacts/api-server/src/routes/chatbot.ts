import express, { Request, Response } from 'express';
import { NlpManager } from 'node-nlp';
import { storage } from '../storage';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  const session = req.session as any;
  
  if (!session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (session.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  next();
};

// Template management endpoints
router.get('/templates', isAdmin, async (req: Request, res: Response) => {
  try {
    const templates = await storage.getChatbotTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/templates', isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, content, isActive } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    const template = await storage.createChatbotTemplate({
      name,
      content,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/templates/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const { name, content, isActive } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    const template = await storage.updateChatbotTemplate(id, {
      name,
      content,
      isActive
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/templates/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const success = await storage.deleteChatbotTemplate(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Training data management endpoints
router.get('/training-data', isAdmin, async (req: Request, res: Response) => {
  try {
    const trainingData = await storage.getChatbotTrainingData();
    res.json(trainingData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/training-data', isAdmin, async (req: Request, res: Response) => {
  try {
    const { intent, utterances, responses, entities } = req.body;
    
    if (!intent || !utterances || !responses) {
      return res.status(400).json({ error: 'Intent, utterances, and responses are required' });
    }
    
    if (!Array.isArray(utterances) || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Utterances and responses must be arrays' });
    }
    
    const trainingData = await storage.createChatbotTrainingData({
      intent,
      utterances,
      responses,
      entities: entities || {}
    });
    
    res.status(201).json(trainingData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/training-data/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid training data ID' });
    }
    
    const { intent, utterances, responses, entities } = req.body;
    
    if (!intent || !utterances || !responses) {
      return res.status(400).json({ error: 'Intent, utterances, and responses are required' });
    }
    
    if (!Array.isArray(utterances) || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Utterances and responses must be arrays' });
    }
    
    const trainingData = await storage.updateChatbotTrainingData(id, {
      intent,
      utterances,
      responses,
      entities: entities || {}
    });
    
    if (!trainingData) {
      return res.status(404).json({ error: 'Training data not found' });
    }
    
    res.json(trainingData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/training-data/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid training data ID' });
    }
    
    const success = await storage.deleteChatbotTrainingData(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Training data not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Train the model
router.post('/train', isAdmin, async (req: Request, res: Response) => {
  try {
    const trainingData = await storage.getChatbotTrainingData();
    
    if (!trainingData || trainingData.length === 0) {
      return res.status(400).json({ error: 'No training data available' });
    }
    
    const nlpManager = new NlpManager({ languages: ['en'], forceNER: true });
    
    // Add all the training data
    for (const data of trainingData) {
      // Add utterances for intent
      for (const utterance of data.utterances) {
        nlpManager.addDocument('en', utterance, data.intent);
      }
      
      // Add entity texts if available
      if (data.entities) {
        for (const [entityName, values] of Object.entries(data.entities)) {
          for (const value of values) {
            nlpManager.addNamedEntityText(entityName, value, ['en'], [value]);
          }
        }
      }
      
      // Add responses for intent
      for (const response of data.responses) {
        nlpManager.addAnswer('en', data.intent, response);
      }
    }
    
    // Train the model
    await nlpManager.train();
    
    // Save the model (you might want to save it to a specific location)
    await nlpManager.save('chatbot-model.nlp');
    
    res.json({ success: true, message: 'Model trained successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Conversation management endpoints
router.get('/conversations', isAdmin, async (req: Request, res: Response) => {
  try {
    const conversations = await storage.getChatbotConversations();
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    const conversation = await storage.getChatbotConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations/:id/reply', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    
    const conversation = await storage.getChatbotConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Add the admin message to the conversation
    const message = await storage.addChatbotMessage({
      conversationId: id,
      text,
      fromUser: false
    });
    
    // Send the message via WhatsApp service
    // (This would typically be handled by your WhatsApp service)
    // whatsappService.sendMessage(conversation.whatsappNumber, text);
    
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/conversations/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    const { status } = req.body;
    
    if (!status || !['active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (active or closed) is required' });
    }
    
    const conversation = await storage.updateChatbotConversationStatus(id, status as 'active' | 'closed');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User management endpoints
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const users = await storage.getChatbotUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/link', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const { whatsappNumber } = req.body;
    
    if (!whatsappNumber) {
      return res.status(400).json({ error: 'WhatsApp number is required' });
    }
    
    const user = await storage.linkUserWhatsapp(id, whatsappNumber);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/opt-out', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await storage.optOutUserWhatsapp(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;