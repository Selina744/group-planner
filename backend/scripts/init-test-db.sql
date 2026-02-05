-- Test Database Initialization Script
-- This script runs automatically when the PostgreSQL test container starts

-- Ensure test_user has all necessary permissions
GRANT ALL ON SCHEMA public TO test_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO test_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO test_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO test_user;