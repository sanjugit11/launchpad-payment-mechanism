CREATE TABLE IF NOT EXISTS audit_reports (
    id SERIAL PRIMARY KEY,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    findings JSONB NOT NULL,
    compliance_report TEXT NOT NULL
);