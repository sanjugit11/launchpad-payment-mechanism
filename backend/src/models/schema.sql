-- PostgreSQL Database Schema for SX Launchpad

-- Drop tables if they exist
DROP TABLE IF EXISTS audit_reports CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS stablecoin_balances CASCADE;
DROP TABLE IF EXISTS device_bindings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    address VARCHAR(42) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device Bindings for Admins
CREATE TABLE device_bindings (
    admin_address VARCHAR(42) PRIMARY KEY,
    device_hash VARCHAR(66) NOT NULL,
    bound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Stablecoin Vault Balances (Committed & Uncommitted)
CREATE TABLE stablecoin_balances (
    user_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    committed_balance NUMERIC(36, 18) DEFAULT 0,
    uncommitted_balance NUMERIC(36, 18) DEFAULT 0,
    accrued_yield NUMERIC(36, 18) DEFAULT 0,
    last_accrual_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_address, token_address)
);

-- Launchpad Projects Table
CREATE TABLE projects (
    id INT PRIMARY KEY,
    token_address VARCHAR(42) NOT NULL,
    stablecoin_address VARCHAR(42) NOT NULL,
    price NUMERIC(36, 18) NOT NULL,
    sale_start TIMESTAMP NOT NULL,
    sale_end TIMESTAMP NOT NULL,
    lock_period INT NOT NULL, -- in seconds
    penalty_percent INT NOT NULL,
    buyback_start TIMESTAMP NOT NULL,
    buyback_end TIMESTAMP NOT NULL,
    buyback_price NUMERIC(36, 18) NOT NULL,
    finalized BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Allocations for Users
CREATE TABLE allocations (
    project_id INT NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    token_allocation NUMERIC(36, 18) DEFAULT 0,
    stablecoin_paid NUMERIC(36, 18) DEFAULT 0,
    claimed BOOLEAN DEFAULT FALSE,
    refunded BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (project_id, user_address),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Multisig Governance Proposals
CREATE TABLE proposals (
    proposal_id INT PRIMARY KEY,
    target VARCHAR(42) NOT NULL,
    value NUMERIC(36, 18) DEFAULT 0,
    data TEXT NOT NULL,
    approved_a BOOLEAN DEFAULT FALSE,
    approved_b BOOLEAN DEFAULT FALSE,
    approved_c BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security Audits Table
CREATE TABLE audit_reports (
    id SERIAL PRIMARY KEY,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    findings JSONB NOT NULL,
    compliance_report TEXT NOT NULL
);
