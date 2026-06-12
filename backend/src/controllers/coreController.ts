import { Request, Response } from 'express';
import pool from '../config/db';

// --- VAULT CONTROLLER ---
export const getVaultBalances = async (req: Request, res: Response) => {
  const { userAddress } = req.params;
  try {
    const result = await pool.query('SELECT * FROM stablecoin_balances WHERE user_address = $1', [userAddress.toLowerCase()]);
    res.json({ success: true, balances: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const depositVault = async (req: Request, res: Response) => {
  const { userAddress, tokenAddress, amount } = req.body;
  try {
    const query = `
      INSERT INTO stablecoin_balances (user_address, token_address, uncommitted_balance)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_address, token_address)
      DO UPDATE SET uncommitted_balance = stablecoin_balances.uncommitted_balance + EXCLUDED.uncommitted_balance;
    `;
    await pool.query(query, [userAddress.toLowerCase(), tokenAddress.toLowerCase(), amount]);
    res.json({ success: true, message: 'Deposit recorded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const commitStaking = async (req: Request, res: Response) => {
  const { userAddress, tokenAddress, amount } = req.body;
  try {
    const check = await pool.query(
      'SELECT uncommitted_balance FROM stablecoin_balances WHERE user_address = $1 AND token_address = $2',
      [userAddress.toLowerCase(), tokenAddress.toLowerCase()]
    );
    if (check.rows.length === 0 || parseFloat(check.rows[0].uncommitted_balance) < parseFloat(amount)) {
      return res.status(400).json({ success: false, error: 'Insufficient uncommitted balance' });
    }

    const query = `
      UPDATE stablecoin_balances 
      SET uncommitted_balance = uncommitted_balance - $3,
          committed_balance = committed_balance + $3
      WHERE user_address = $1 AND token_address = $2;
    `;
    await pool.query(query, [userAddress.toLowerCase(), tokenAddress.toLowerCase(), amount]);
    res.json({ success: true, message: 'Assets committed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- LAUNCHPAD CONTROLLER ---
export const getProjects = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY id ASC');
    res.json({ success: true, projects: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const buyProjectTokens = async (req: Request, res: Response) => {
  const { projectId, userAddress, tokenAmount, stablecoinCost } = req.body;
  try {
    // Record allocation
    const query = `
      INSERT INTO allocations (project_id, user_address, token_allocation, stablecoin_paid)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_address)
      DO UPDATE SET token_allocation = allocations.token_allocation + EXCLUDED.token_allocation,
                    stablecoin_paid = allocations.stablecoin_paid + EXCLUDED.stablecoin_paid;
    `;
    await pool.query(query, [projectId, userAddress.toLowerCase(), tokenAmount, stablecoinCost]);
    res.json({ success: true, message: 'Token allocation recorded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAllocations = async (req: Request, res: Response) => {
  const { userAddress } = req.params;
  try {
    const result = await pool.query('SELECT * FROM allocations WHERE user_address = $1', [userAddress.toLowerCase()]);
    res.json({ success: true, allocations: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- GOVERNANCE CONTROLLER ---
export const getProposals = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM proposals ORDER BY proposal_id ASC');
    res.json({ success: true, proposals: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProposal = async (req: Request, res: Response) => {
  const { proposalId, target, value, data } = req.body;
  try {
    await pool.query(
      'INSERT INTO proposals (proposal_id, target, value, data) VALUES ($1, $2, $3, $4)',
      [proposalId, target.toLowerCase(), value, data]
    );
    res.json({ success: true, message: 'Proposal recorded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const approveProposal = async (req: Request, res: Response) => {
  const { proposalId, adminRole } = req.body; // adminRole: 'a', 'b', 'c'
  try {
    const column = adminRole === 'a' ? 'approved_a' : adminRole === 'b' ? 'approved_b' : 'approved_c';
    await pool.query(`UPDATE proposals SET ${column} = TRUE WHERE proposal_id = $1`, [proposalId]);
    res.json({ success: true, message: 'Proposal approval updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const executeProposal = async (req: Request, res: Response) => {
  const { proposalId } = req.body;
  try {
    await pool.query('UPDATE proposals SET executed = TRUE WHERE proposal_id = $1', [proposalId]);
    res.json({ success: true, message: 'Proposal marked as executed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
