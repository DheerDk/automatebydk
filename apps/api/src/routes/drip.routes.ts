import { Router } from 'express';
import { DripController } from '../controllers/drip.controller.js';
import { authenticate, requireTenant } from '../middlewares/auth.js';

const router = Router();

// Protected Tenant Drip Sequence Routes
router.use(authenticate, requireTenant);

router.get('/stats', DripController.getStats);
router.get('/', DripController.listSequences);
router.post('/', DripController.createSequence);
router.post('/enroll', DripController.manualEnroll);
router.get('/:id', DripController.getSequenceById);
router.put('/:id', DripController.updateSequence);
router.delete('/:id', DripController.deleteSequence);
router.patch('/:id/toggle', DripController.toggleSequence);

export default router;
