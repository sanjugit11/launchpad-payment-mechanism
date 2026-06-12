import { Request, Response } from 'express';
import { runSecurityScan } from '../services/scanner';
import pool from '../config/db';

export const triggerScan = async (req: Request, res: Response) => {
  try {
    const result = await runSecurityScan();
    res.json({
      success: true,
      message: 'Security scan completed successfully',
      findingsCount: result.findings.length,
      findings: result.findings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getLatestReport = async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT * FROM audit_reports ORDER BY scanned_at DESC LIMIT 1');
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No scan reports found' });
    }
    res.json({
      success: true,
      report: dbResult.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
