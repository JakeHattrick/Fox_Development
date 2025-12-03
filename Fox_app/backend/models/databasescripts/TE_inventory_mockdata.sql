---Establish the categories for better inventory distribution
INSERT INTO inventory_categories (category_name, description, total_received, received_date, total_in_stock, total_rma, total_damaged, notes) VALUES
('Riser Card', 'Used to connect GPU to test fixture riser slot.', 20, NOW() - INTERVAL '60 days', 18, 1, 1, 'Batch RC-2025A'),
('Cooling Fan', 'High-RPM fan used for thermal and airflow testing.', 50, NOW() - INTERVAL '45 days', 47, 2, 1, 'Shipment FAN-Q1-25'),
('Power Supply', 'Server PSU used to power test fixtures.', 10, NOW() - INTERVAL '30 days', 9, 0, 1, '1200W Supermicro units'),
('Interposer', 'Electrical interface board used for GPU signal validation.', 15, NOW() - INTERVAL '15 days', 15, 0, 0, 'All new from NVIDIA'),
('Cable Assembly', 'High-speed test cables (PCIe, 8-pin, 12VHPWR, etc.).', 40, NOW() - INTERVAL '10 days', 39, 0, 1, 'Mixed batches from NV QA');

---All inventory items live here.
INSERT INTO inventory_items (category_id, item_sn, item_pn, status, condition, location, received_date, notes) VALUES
((SELECT id FROM inventory_categories WHERE category_name = 'Riser Card'), 'RC-2025A-001', 'RISER-9001', 'available', 'new', 'Inventory Shelf A', NOW() - INTERVAL '55 days', 'Initial shipment'),
((SELECT id FROM inventory_categories WHERE category_name = 'Riser Card'), 'RC-2025A-002', 'RISER-9001', 'in_use', 'used', 'Fixture NCT017-01', NOW() - INTERVAL '54 days', 'Installed in fixture left slot'),
((SELECT id FROM inventory_categories WHERE category_name = 'Cooling Fan'), 'FAN-Q1-001', 'FAN-5000RPM', 'available', 'new', 'Inventory Shelf B', NOW() - INTERVAL '40 days', 'Spare cooling fan'),
((SELECT id FROM inventory_categories WHERE category_name = 'Cooling Fan'), 'FAN-Q1-002', 'FAN-5000RPM', 'damaged', 'used', 'RMA Box', NOW() - INTERVAL '42 days', 'Bearing noise detected'),
((SELECT id FROM inventory_categories WHERE category_name = 'Power Supply'), 'PSU-1200-01', 'PSU-1200W-SMC', 'in_use', 'used', 'Fixture NCT021-03', NOW() - INTERVAL '28 days', 'Stable under load'),
((SELECT id FROM inventory_categories WHERE category_name = 'Interposer'), 'INT-2025-11', 'INT-400X', 'available', 'new', 'Inventory Shelf C', NOW() - INTERVAL '10 days', 'New batch from NVIDIA'),
((SELECT id FROM inventory_categories WHERE category_name = 'Cable Assembly'), 'CAB-HPWR-884', 'CAB-12VHPWR-1M', 'available', 'new', 'Inventory Shelf D', NOW() - INTERVAL '7 days', 'High-power cable for bench testing'),
((SELECT id FROM inventory_categories WHERE category_name = 'Cable Assembly'), NULL, 'CAB-PCIe-6pin', 'damaged', 'used', 'RMA Box', NOW() - INTERVAL '8 days', 'Connector bent during fixture removal');

---
INSERT INTO inventory_assignments 
(inventory_item_id, fixture_part_id, assignment_type, start_date, end_date, creator, notes)
VALUES
-- 1
(
  (SELECT id FROM inventory_items WHERE item_sn = 'RC-2025A-002'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT017-01'
       AND fp.tester_type='LA Slot'),
  'install',
  NOW() - INTERVAL '50 days',
  NULL,
  'admin',
  'Riser installed during initial setup'
),

-- 2 
(
  (SELECT id FROM inventory_items WHERE item_sn = 'PSU-1200-01'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT017-02'
       AND fp.tester_type='RA Slot'),
  'install',
  NOW() - INTERVAL '25 days',
  NULL,
  'tech_john',
  'PSU logically associated with RA slot'
),

-- 3
(
  (SELECT id FROM inventory_items WHERE item_sn = 'FAN-Q1-002'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT017-01'
       AND fp.tester_type='RA Slot'),
  'install',
  NOW() - INTERVAL '38 days',
  NOW() - INTERVAL '35 days',
  'admin',
  'Fan temporarily placed for airflow testing'
),

-- 4
(
  (SELECT id FROM inventory_items WHERE item_sn = 'FAN-Q1-002'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT017-01'
       AND fp.tester_type='RA Slot'),
  'remove',
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '35 days',
  'admin',
  'Fan removed due to vibration'
),

-- 5
(
  (SELECT id FROM inventory_items WHERE item_sn = 'CAB-HPWR-884'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT017-02'
       AND fp.tester_type='LA Slot'),
  'install',
  NOW() - INTERVAL '5 days',
  NULL,
  'tech_mike',
  'Cable used for new refurb batch'
),

-- 6
(
  (SELECT id FROM inventory_items WHERE item_sn = 'INT-2025-11'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT020-01'
       AND fp.tester_type='LA Slot'),
  'install',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '1 days',
  'admin',
  'Interposer used for diagnostics'
),

-- 7
(
  (SELECT id FROM inventory_items WHERE item_sn = 'INT-2025-11'),
  (SELECT fp.id 
     FROM fixture_parts fp 
     JOIN fixtures f ON fp.parent_fixture_id = f.id
     WHERE f.fixture_name='NCT020-01'
       AND fp.tester_type='LA Slot'),
  'remove',
  NOW() - INTERVAL '1 days',
  NOW() - INTERVAL '1 days',
  'admin',
  'Returned to inventory after diagnostics'
);
