import { Router } from 'express';
import { prisma } from '../index';

export const manufacturersRouter = Router();

// List all manufacturers
manufacturersRouter.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where: any = {};

    if (search) {
      where.name = { contains: String(search), mode: 'insensitive' };
    }

    const manufacturers = await prisma.manufacturer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { parts: true } },
      },
    });
    res.json(manufacturers);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  }
});

// Create manufacturer
manufacturersRouter.post('/', async (req, res) => {
  try {
    const manufacturer = await prisma.manufacturer.create({ data: req.body });
    res.status(201).json(manufacturer);
  } catch (error) {
    console.error('Error creating manufacturer:', error);
    res.status(500).json({ error: 'Failed to create manufacturer' });
  }
});

// Update manufacturer
manufacturersRouter.put('/:id', async (req, res) => {
  try {
    const manufacturer = await prisma.manufacturer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(manufacturer);
  } catch (error) {
    console.error('Error updating manufacturer:', error);
    res.status(500).json({ error: 'Failed to update manufacturer' });
  }
});

// Delete manufacturer
manufacturersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.manufacturer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    res.status(500).json({ error: 'Failed to delete manufacturer' });
  }
});
