import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, checkRole } from '../middlewares/auth';
import { insertPujaSchema } from '../../shared/schema';
import { z } from 'zod';

const pujaRouter = Router();

// Get all pujas - public route
pujaRouter.get('/', async (req: Request, res: Response) => {
  try {
    const pujas = await storage.getAllPujas();
    res.json(pujas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single puja by ID - public route
pujaRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const puja = await storage.getPuja(id);
    
    if (!puja) {
      return res.status(404).json({ error: 'Puja not found' });
    }
    
    res.json(puja);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search pujas - public route
pujaRouter.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const query = req.params.query;
    const pujas = await storage.searchPujas(query);
    res.json(pujas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes for managing pujas
// Create a new puja - admin only (demo mode bypasses auth)
pujaRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertPujaSchema.parse({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const newPuja = await storage.createPuja(validatedData);
    res.status(201).json(newPuja);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update an existing puja - admin only (demo mode bypasses auth)
pujaRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const puja = await storage.getPuja(id);
    
    if (!puja) {
      return res.status(404).json({ error: 'Puja not found' });
    }
    
    // Update with new values
    const updatedData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const updatedPuja = await storage.updatePuja(id, updatedData);
    res.json(updatedPuja);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a puja - admin only (demo mode bypasses auth)
pujaRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const puja = await storage.getPuja(id);
    
    if (!puja) {
      return res.status(404).json({ error: 'Puja not found' });
    }
    
    const success = await storage.deletePuja(id);
    
    if (success) {
      res.json({ message: 'Puja deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete puja' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default pujaRouter;