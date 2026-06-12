import { Router } from 'express';
import { 
  getVaultBalances, 
  depositVault, 
  commitStaking, 
  getProjects, 
  buyProjectTokens, 
  getAllocations, 
  getProposals, 
  createProposal, 
  approveProposal, 
  executeProposal 
} from '../controllers/coreController';
import { triggerScan, getLatestReport } from '../controllers/auditController';

const router = Router();

// Vault Routes
router.get('/vault/:userAddress', getVaultBalances);
router.post('/vault/deposit', depositVault);
router.post('/vault/commit', commitStaking);

// Launchpad Routes
router.get('/projects', getProjects);
router.post('/projects/buy', buyProjectTokens);
router.get('/allocations/:userAddress', getAllocations);

// Governance Routes
router.get('/proposals', getProposals);
router.post('/proposals/create', createProposal);
router.post('/proposals/approve', approveProposal);
router.post('/proposals/execute', executeProposal);

// Security / AI Auditor Routes
router.post('/audit/scan', triggerScan);
router.get('/audit/latest', getLatestReport);

export default router;
