---Defines what type of NVIDIA-supplied part it is.
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(64) UNIQUE NOT NULL, -- e.g., "Riser Card", "Fan", "Power Supply", "Interposer"
    description VARCHAR(256), -- Short explanation of what this part does in the test setup
    total_received INT DEFAULT 0, -- How many units NVIDIA has shipped us in total (lifetime count)
    received_date TIMESTAMPTZ DEFAULT NOW(), -- When we received this item from NVIDIA
    total_in_stock INT DEFAULT 0, -- How many units we currently have on hand (should decrease when used or RMA'ed)
    total_rma INT DEFAULT 0, -- How many units were returned to NVIDIA for RMA
    total_damaged INT DEFAULT 0, -- How many units are no longer usable (physical damage, dead-on-arrival, etc.)
    notes VARCHAR(256) -- Any extra details, shipment notes, batch numbers, etc.
);


---All inventory items live here.
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES inventory_categories(id), -- Links this item to its category (riser, fan, PSU, etc.)
    item_sn VARCHAR(64), -- Serial number from NVIDIA (not all items have SN, so nullable)
    item_pn VARCHAR(64), -- Part number, e.g. "692-2G520-0280-5R1"
    status VARCHAR(32) NOT NULL
        CHECK (status IN ('available', 'in_use', 'RMA', 'damaged')), -- Current lifecycle state of the item
    condition VARCHAR(32)
        CHECK (condition IN ('new', 'used', 'refurbished')), -- Optional: helps track asset quality
    location VARCHAR(64),
        -- Where the item physically is: (Need to connect to fixtures later) - Need a guidance from Thay/Mehret for how he wants to tarck it.
        -- "Inventory Shelf A", "Fixture NCT017-01", "RMA Box", etc.
    received_date TIMESTAMPTZ DEFAULT NOW(),  -- When we received this item from NVIDIA
    notes VARCHAR(256)  -- Any notes about item, batch, handling
);


---Tracks history of where a part was used.
CREATE TABLE inventory_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),  -- The specific unit that is being assigned
    fixture_part_id UUID NOT NULL REFERENCES fixture_parts(id), -- Which fixture part (LA Slot, RA Slot, Riser, etc.) this item is used in (May need to use Fixture if not fixture parts)
    assignment_type VARCHAR(32) NOT NULL
        CHECK (assignment_type IN ('install', 'remove')),
        -- "install" = item placed in a fixture
        -- "remove"  = item taken out and returned to inventory
    start_date TIMESTAMPTZ DEFAULT NOW(), -- When we installed the item
    end_date TIMESTAMPTZ, -- When we removed it (null = still in use)
    creator VARCHAR(32), -- Person who installed or removed the item
    notes VARCHAR(256) -- Extra info: condition found, reason for change, etc.
);

