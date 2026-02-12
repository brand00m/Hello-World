import { Router } from 'express';
import { prisma } from '../index';

export const vendorsRouter = Router();

// List all vendors
vendorsRouter.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where: any = {};

    if (search) {
      where.companyName = { contains: String(search), mode: 'insensitive' };
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { parts: true } },
      },
    });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get single vendor
vendorsRouter.get('/:id', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { parts: true } },
      },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// Create vendor
vendorsRouter.post('/', async (req, res) => {
  try {
    const vendor = await prisma.vendor.create({ data: req.body });
    res.status(201).json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update vendor
vendorsRouter.put('/:id', async (req, res) => {
  try {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Delete vendor
vendorsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});
