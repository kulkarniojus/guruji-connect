import { Router, Request, Response, NextFunction } from 'express';
import { dbStorage } from '../dbStorage';
import { 
  insertUserJourneySchema, 
  insertUserJourneyItemSchema, 
  type UserJourney,
  type UserJourneyItem
} from '@shared/schema';

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = Router();

// Get all journeys for the authenticated user
router.get('/journey', isAuthenticated, async (req, res) => {
  try {
    // Get userId from session
    const userId = req.session.userId as number;
    const journeys = await dbStorage.getUserJourneyByUserId(userId);
    
    // Return an empty array if no journeys found
    if (!journeys || journeys.length === 0) {
      return res.json([]);
    }
    
    // Return the journeys
    res.json(journeys);
  } catch (error) {
    console.error('Error fetching user journeys:', error);
    res.status(500).json({ message: 'Error fetching user journeys' });
  }
});

// Get a specific journey with its items
router.get('/journey/:id', isAuthenticated, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.id);
    const userId = req.session.userId as number;
    
    // Fetch the journey
    const journey = await dbStorage.getUserJourney(journeyId);
    
    // Check if journey exists and belongs to the user
    if (!journey || journey.userId !== userId) {
      return res.status(404).json({ message: 'Journey not found' });
    }
    
    // Fetch journey items
    const journeyItems = await dbStorage.getUserJourneyItemsByJourneyId(journeyId);
    
    // Return journey with its items
    res.json({ 
      journey, 
      items: journeyItems.sort((a: UserJourneyItem, b: UserJourneyItem) => a.sequence - b.sequence) 
    });
  } catch (error) {
    console.error('Error fetching journey details:', error);
    res.status(500).json({ message: 'Error fetching journey details' });
  }
});

// Create a new journey
router.post('/journey', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId as number;
    
    // Parse and validate the request body
    const result = insertUserJourneySchema.safeParse({ ...req.body, userId });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid journey data', 
        errors: result.error.errors 
      });
    }
    
    // Create the journey
    const journey = await dbStorage.createUserJourney(result.data);
    res.status(201).json(journey);
  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ message: 'Error creating journey' });
  }
});

// Add an item to a journey
router.post('/journey/:id/items', isAuthenticated, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.id);
    const userId = req.session.userId as number;
    
    // Fetch the journey to verify ownership
    const journey = await dbStorage.getUserJourney(journeyId);
    
    // Check if journey exists and belongs to the user
    if (!journey || journey.userId !== userId) {
      return res.status(404).json({ message: 'Journey not found' });
    }
    
    // Parse and validate the request body
    const result = insertUserJourneyItemSchema.safeParse({ 
      ...req.body, 
      journeyId 
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid journey item data', 
        errors: result.error.errors 
      });
    }
    
    // Create the journey item
    const item = await dbStorage.createUserJourneyItem(result.data);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding journey item:', error);
    res.status(500).json({ message: 'Error adding journey item' });
  }
});

// Mark a journey item as complete
router.patch('/journey/items/:id/complete', isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.session.userId as number;
    const { reflection } = req.body;
    
    // Fetch the item
    const item = await dbStorage.getUserJourneyItem(itemId);
    
    // Check if item exists
    if (!item) {
      return res.status(404).json({ message: 'Journey item not found' });
    }
    
    // Fetch the journey to verify ownership
    const journey = await dbStorage.getUserJourney(item.journeyId);
    
    // Check if journey exists and belongs to the user
    if (!journey || journey.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this journey item' });
    }
    
    // Mark the item as complete
    const updatedItem = await dbStorage.markUserJourneyItemComplete(itemId, reflection);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error completing journey item:', error);
    res.status(500).json({ message: 'Error completing journey item' });
  }
});

// Delete a journey item
router.delete('/journey/items/:id', isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.session.userId as number;
    
    // Fetch the item
    const item = await dbStorage.getUserJourneyItem(itemId);
    
    // Check if item exists
    if (!item) {
      return res.status(404).json({ message: 'Journey item not found' });
    }
    
    // Fetch the journey to verify ownership
    const journey = await dbStorage.getUserJourney(item.journeyId);
    
    // Check if journey exists and belongs to the user
    if (!journey || journey.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this journey item' });
    }
    
    // Delete the item
    await dbStorage.deleteUserJourneyItem(itemId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting journey item:', error);
    res.status(500).json({ message: 'Error deleting journey item' });
  }
});

export default router;