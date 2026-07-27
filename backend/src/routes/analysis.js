import { Router } from 'express';
import upload from '../middlewares/upload.js';
import {
  handleZipUpload,
  handleGithubClone,
  handleGetStatus,
  handleGetResult
} from '../controllers/analysisController.js';

const router = Router();

router.post('/upload', upload.single('file'), handleZipUpload);
router.post('/github', handleGithubClone);
router.get('/status/:jobId', handleGetStatus);
router.get('/result/:jobId', handleGetResult);

export default router;
