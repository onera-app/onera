-- Drop server_models and model_servers tables (redundant - enclave exposes /models directly)
DROP TABLE IF EXISTS server_models;
DROP TABLE IF EXISTS model_servers;
