# Fox Development Database Setup - Windows Standard Operating Procedure

## Overview
This SOP provides step-by-step instructions for setting up the Fox development database on Windows. This replaces the automated script approach with reliable manual steps.

## Prerequisites
- Windows 10/11 or Windows Server
- Administrator access
- `fox_backup.dump` file available

## Step 1: Install PostgreSQL

### Download and Install PostgreSQL 17:
1. Go to https://www.postgresql.org/download/windows/
2. Download PostgreSQL 17.x Windows installer
3. Run the installer as Administrator
4. **Important**: During installation, set a password for the `postgres` user (you can use a simple password like `postgres`)
5. **Important**: Note the port number (default is 5432)
6. **Important**: Note the installation directory (usually `C:\Program Files\PostgreSQL\17\`)

### Verify Installation:
```cmd
# Open Command Prompt as Administrator
psql --version
```

## Step 2: Configure PostgreSQL Authentication

### Find the pg_hba.conf file:
```cmd
# The file is typically located at:
# C:\Program Files\PostgreSQL\17\data\pg_hba.conf
```

### Edit the pg_hba.conf file:
1. Open Notepad as Administrator
2. Open `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
3. Find these lines:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
```

4. Change `scram-sha-256` to `trust`:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 trust
```

5. Save the file

### Restart PostgreSQL to apply changes:
```cmd
# Open Services (services.msc) or use Command Prompt:
net stop postgresql-x64-17
net start postgresql-x64-17
```

## Step 3: Create the Database

```cmd
# Connect to PostgreSQL as postgres user
psql -U postgres -h localhost

# In the psql prompt, create the database:
CREATE DATABASE fox_db;

# Exit psql
\q
```

## Step 4: Create the Database User

```cmd
# Connect to PostgreSQL as postgres user
psql -U postgres -h localhost

# Create gpu_user with no password (matching production)
CREATE USER gpu_user;

# Grant necessary privileges
ALTER USER gpu_user CREATEDB CREATEROLE;
GRANT ALL PRIVILEGES ON DATABASE fox_db TO gpu_user;

# Connect to the fox_db database
\c fox_db

# Grant privileges on schema and objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gpu_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gpu_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO gpu_user;

# Exit psql
\q
```

## Step 5: Restore from Dump File

```cmd
# Navigate to the directory containing fox_backup.dump
cd C:\path\to\fox_backup.dump

<<<<<<< HEAD
# Restore the database
pg_restore --host=localhost --port=5432 --username=gpu_user --dbname=fox_db --clean --if-exists --verbose --no-owner --no-privileges fox_backup.dump
=======
# First, ensure the database exists and user has proper permissions
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS fox_db;"
psql -h localhost -U postgres -c "CREATE DATABASE fox_db OWNER gpu_user;"
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fox_db TO gpu_user;"

# Restore the database (try without --clean first)
pg_restore --host=localhost --port=5432 --username=gpu_user --dbname=fox_db --verbose --no-owner --no-privileges fox_backup.dump
```

### If the above fails, try this alternative approach:

```cmd
# Connect to the database and create schema first
psql -h localhost -U gpu_user -d fox_db -c "CREATE SCHEMA IF NOT EXISTS public;"

# Then restore
pg_restore --host=localhost --port=5432 --username=gpu_user --dbname=fox_db --verbose --no-owner --no-privileges --schema=public fox_backup.dump
>>>>>>> origin/main
```

## Step 6: Verify the Setup

```cmd
# Test connection (should not prompt for password)
psql -h localhost -U gpu_user -d fox_db

# In the psql prompt, check version and tables:
SELECT version();
\dt
\q
```

## Troubleshooting

### If pg_restore fails:
Try the alternative method:
```cmd
# Convert dump to SQL format first
pg_restore --host=localhost --port=5432 --username=gpu_user --dbname=fox_db --schema-only --no-owner --no-privileges --file=C:\temp\fox_schema.sql fox_backup.dump

# Restore schema
psql -h localhost -U gpu_user -d fox_db -f C:\temp\fox_schema.sql

# Restore data
pg_restore --host=localhost --port=5432 --username=gpu_user --dbname=fox_db --data-only --no-owner --no-privileges --disable-triggers fox_backup.dump
```

### If authentication fails:
1. Verify pg_hba.conf has `trust` method for localhost
2. Restart PostgreSQL service: `net stop postgresql-x64-17 && net start postgresql-x64-17`
3. Check PostgreSQL is running in Services (services.msc)

### If you can't find pg_hba.conf:
```cmd
# Connect to PostgreSQL and find the config file location
psql -U postgres -h localhost -c "SHOW hba_file;"
```

### If PostgreSQL service won't start:
1. Check Windows Event Viewer for error details
2. Verify the data directory has proper permissions
3. Try running PostgreSQL installer as Administrator and choose "Repair"

## Expected Results

After successful setup:
- Database `fox_db` exists
- User `gpu_user` exists with no password
- 13 tables restored from dump file
- Connection works without password prompt

## Next Steps

1. Start the Fox_app backend: `cd Fox_app/backend && npm start`
2. Run ETL scripts as needed
3. Verify all applications can connect to the database

## Windows-Specific Notes

- **Service Name**: PostgreSQL service is typically named `postgresql-x64-17`
- **Data Directory**: Usually `C:\Program Files\PostgreSQL\17\data\`
- **Config Files**: Located in the data directory
- **Logs**: Check `C:\Program Files\PostgreSQL\17\data\log\` for error logs
- **Environment Variables**: PostgreSQL bin directory should be in your PATH

---
**Note:** This SOP replaces the automated `db_auto_build.py` script for better reliability and cross-platform compatibility.
