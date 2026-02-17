import { Router } from 'express';
import { prisma } from '../index';
import { generateSubmittalPdf } from '../services/pdf';

export const submittalsRouter = Router();

// List submittals for a project
submittalsRouter.get('/project/:projectId', async (req, res) => {
  try {
    const submittals = await prisma.submittal.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { updatedAt: 'desc' },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: true,
            items: {
              orderBy: { sortOrder: 'asc' },
              include: { part: { include: { manufacturer: true } } },
            },
          },
        },
      },
    });
    res.json(submittals);
  } catch (error) {
    console.error('Error fetching submittals:', error);
    res.status(500).json({ error: 'Failed to fetch submittals' });
  }
});

// Get single submittal with full details
submittalsRouter.get('/:id', async (req, res) => {
  try {
    const submittal = await prisma.submittal.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: true,
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                part: {
                  include: { manufacturer: true, vendor: true, category: true },
                },
              },
            },
          },
        },
      },
    });
    if (!submittal) return res.status(404).json({ error: 'Submittal not found' });
    res.json(submittal);
  } catch (error) {
    console.error('Error fetching submittal:', error);
    res.status(500).json({ error: 'Failed to fetch submittal' });
  }
});

// Create submittal
submittalsRouter.post('/', async (req, res) => {
  try {
    const { projectId, title } = req.body;
    const submittal = await prisma.submittal.create({
      data: { projectId, title },
      include: { project: true, sections: true },
    });
    res.status(201).json(submittal);
  } catch (error) {
    console.error('Error creating submittal:', error);
    res.status(500).json({ error: 'Failed to create submittal' });
  }
});

// Update submittal
submittalsRouter.put('/:id', async (req, res) => {
  try {
    const submittal = await prisma.submittal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(submittal);
  } catch (error) {
    console.error('Error updating submittal:', error);
    res.status(500).json({ error: 'Failed to update submittal' });
  }
});

// Delete submittal
submittalsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.submittal.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting submittal:', error);
    res.status(500).json({ error: 'Failed to delete submittal' });
  }
});

// Add section to submittal
submittalsRouter.post('/:id/sections', async (req, res) => {
  try {
    const { title, categoryId } = req.body;
    // Get next sort order
    const maxOrder = await prisma.submittalSection.aggregate({
      where: { submittalId: req.params.id },
      _max: { sortOrder: true },
    });
    const section = await prisma.submittalSection.create({
      data: {
        submittalId: req.params.id,
        title,
        categoryId: categoryId || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { category: true, items: true },
    });
    res.status(201).json(section);
  } catch (error) {
    console.error('Error adding section:', error);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

// Update section
submittalsRouter.put('/:id/sections/:sectionId', async (req, res) => {
  try {
    const section = await prisma.submittalSection.update({
      where: { id: req.params.sectionId },
      data: req.body,
      include: { category: true, items: true },
    });
    res.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
submittalsRouter.delete('/:id/sections/:sectionId', async (req, res) => {
  try {
    await prisma.submittalSection.delete({ where: { id: req.params.sectionId } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Add item to section
submittalsRouter.post('/:id/sections/:sectionId/items', async (req, res) => {
  try {
    const { partId, specOverride } = req.body;
    const maxOrder = await prisma.submittalItem.aggregate({
      where: { sectionId: req.params.sectionId },
      _max: { sortOrder: true },
    });
    const item = await prisma.submittalItem.create({
      data: {
        sectionId: req.params.sectionId,
        partId,
        specOverride: specOverride || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { part: { include: { manufacturer: true } } },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Remove item from section
submittalsRouter.delete('/:id/sections/:sectionId/items/:itemId', async (req, res) => {
  try {
    await prisma.submittalItem.delete({ where: { id: req.params.itemId } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Auto-populate submittal from project BOM
submittalsRouter.post('/:id/populate', async (req, res) => {
  try {
    const submittal = await prisma.submittal.findUnique({
      where: { id: req.params.id },
      include: { project: { include: { bomItems: { include: { part: { include: { category: true } } } } } } },
    });
    if (!submittal) return res.status(404).json({ error: 'Submittal not found' });

    // Group BOM items by category
    const byCat = new Map<string, { categoryId: string; categoryName: string; parts: { partId: string; sortOrder: number }[] }>();
    const uncategorized: { partId: string; sortOrder: number }[] = [];

    for (const bomItem of submittal.project.bomItems) {
      const cat = bomItem.part.category;
      if (cat) {
        if (!byCat.has(cat.id)) {
          byCat.set(cat.id, { categoryId: cat.id, categoryName: cat.name, parts: [] });
        }
        byCat.get(cat.id)!.parts.push({
          partId: bomItem.part.id,
          sortOrder: bomItem.part.priorityRanking ?? 999,
        });
      } else {
        uncategorized.push({ partId: bomItem.part.id, sortOrder: bomItem.part.priorityRanking ?? 999 });
      }
    }

    // Create sections and items
    let sectionOrder = 0;
    for (const [, group] of byCat) {
      group.parts.sort((a, b) => a.sortOrder - b.sortOrder);
      const section = await prisma.submittalSection.create({
        data: {
          submittalId: submittal.id,
          title: group.categoryName,
          categoryId: group.categoryId,
          sortOrder: sectionOrder++,
        },
      });
      for (let i = 0; i < group.parts.length; i++) {
        await prisma.submittalItem.create({
          data: {
            sectionId: section.id,
            partId: group.parts[i].partId,
            sortOrder: i,
          },
        });
      }
    }

    if (uncategorized.length > 0) {
      uncategorized.sort((a, b) => a.sortOrder - b.sortOrder);
      const section = await prisma.submittalSection.create({
        data: {
          submittalId: submittal.id,
          title: 'General',
          sortOrder: sectionOrder++,
        },
      });
      for (let i = 0; i < uncategorized.length; i++) {
        await prisma.submittalItem.create({
          data: {
            sectionId: section.id,
            partId: uncategorized[i].partId,
            sortOrder: i,
          },
        });
      }
    }

    // Return the fully populated submittal
    const result = await prisma.submittal.findUnique({
      where: { id: submittal.id },
      include: {
        project: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: true,
            items: {
              orderBy: { sortOrder: 'asc' },
              include: { part: { include: { manufacturer: true } } },
            },
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.error('Error populating submittal:', error);
    res.status(500).json({ error: 'Failed to populate submittal' });
  }
});

// Generate PDF
submittalsRouter.get('/:id/pdf', async (req, res) => {
  try {
    const submittal = await prisma.submittal.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: true,
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                part: {
                  include: { manufacturer: true, vendor: true, category: true },
                },
              },
            },
          },
        },
      },
    });
    if (!submittal) return res.status(404).json({ error: 'Submittal not found' });

    const pdfBuffer = await generateSubmittalPdf(submittal);

    await prisma.submittal.update({
      where: { id: submittal.id },
      data: { status: 'generated', generatedAt: new Date() },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Submittal-${submittal.project.jobNumber || submittal.project.jobName}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});
