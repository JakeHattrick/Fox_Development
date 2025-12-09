---Auto-populate inherited fields in fixture_parts
---This trigger function automatically copies fixture-related fields into fixture_parts whenever a new part is created.
CREATE OR REPLACE FUNCTION populate_fixture_parts_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Pull data from fixtures table based on parent_fixture_id
    SELECT 
        f.fixture_name,
        f.gen_type,
        f.rack,
        f.fixture_sn,
        f.test_type,
        f.ip_address,
        f.mac_address
    INTO 
        NEW.fixture_name,
        NEW.gen_type,
        NEW.rack,
        NEW.fixture_sn,
        NEW.test_type,
        NEW.ip_address,
        NEW.mac_address
    FROM fixtures f
    WHERE f.id = NEW.parent_fixture_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---Create the Trigger
---When a new row is inserted into fixture_parts, 
---the trigger automatically fills fixture_name, rack, fixture_sn, test_type, ip_address, and mac_address 
---using the matching row from the fixtures table based on parent_fixture_id.
CREATE TRIGGER trg_populate_fixture_parts_fields
BEFORE INSERT ON fixture_parts
FOR EACH ROW
EXECUTE FUNCTION populate_fixture_parts_fields();

