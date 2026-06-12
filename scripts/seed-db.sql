-- SQL Seed Script for SX Launchpad

-- Insert Demo Users
INSERT INTO users (address) VALUES 
('0x1111111111111111111111111111111111111111'),
('0x2222222222222222222222222222222222222222'),
('0x7777777777777777777777777777777777777777'); -- treasury

-- Insert Admin Device Bindings (simulate adminA, adminB, adminC)
INSERT INTO device_bindings (admin_address, device_hash) VALUES 
('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x2bf597b8a8b1d960000000000000000000000000000000000000000000000000'), -- hardhat account 0
('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x2bf597b8a8b1d960000000000000000000000000000000000000000000000000'), -- hardhat account 1
('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', '0x2bf597b8a8b1d960000000000000000000000000000000000000000000000000'); -- hardhat account 2

-- Insert Demo Projects
-- Project 0: SX Global (Active Seed Sale)
INSERT INTO projects (
    id, token_address, stablecoin_address, price, 
    sale_start, sale_end, lock_period, penalty_percent, 
    buyback_start, buyback_end, buyback_price, finalized, active
) VALUES (
    0, 
    '0x0000000000000000000000000000000000000000', -- Token not deployed yet (placeholder)
    '0x5FbDB2315678afecb367f032d93F642f64180aa3', -- USDC (placeholder)
    2.500000000000000000, 
    CURRENT_TIMESTAMP - INTERVAL '1 day', 
    CURRENT_TIMESTAMP + INTERVAL '5 days', 
    2592000, -- 30 days lock
    10, -- 10% penalty
    CURRENT_TIMESTAMP + INTERVAL '6 days', 
    CURRENT_TIMESTAMP + INTERVAL '10 days', 
    2.500000000000000000, 
    FALSE, 
    TRUE
);
-- Project 1: YieldSync RWA (Ended Sale, Claimable)
INSERT INTO projects (
    id, token_address, stablecoin_address, price, 
    sale_start, sale_end, lock_period, penalty_percent, 
    buyback_start, buyback_end, buyback_price, finalized, active
) VALUES (
    1, 
    '0x0000000000000000000000000000000000000000', -- Token not deployed yet
    '0x5FbDB2315678afecb367f032d93F642f64180aa3', -- USDC
    1.000000000000000000, 
    CURRENT_TIMESTAMP - INTERVAL '10 days', 
    CURRENT_TIMESTAMP - INTERVAL '5 days', 
    2592000, -- 30 days lock
    12, -- 12% penalty
    CURRENT_TIMESTAMP - INTERVAL '4 days', 
    CURRENT_TIMESTAMP + INTERVAL '1 day', 
    0.950000000000000000, 
    TRUE, 
    TRUE
);

-- Insert Demo Allocations for Project 1
INSERT INTO allocations (project_id, user_address, token_allocation, stablecoin_paid, claimed, refunded) VALUES
(1, '0x1111111111111111111111111111111111111111', 1000.000000000000000000, 1000.000000000000000000, FALSE, FALSE),
(1, '0x2222222222222222222222222222222222222222', 2500.000000000000000000, 2500.000000000000000000, TRUE, FALSE);
