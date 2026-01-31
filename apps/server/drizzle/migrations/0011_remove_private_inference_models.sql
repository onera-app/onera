-- Remove privateInferenceModels table and modelId FK from enclaves
-- Models now come directly from enclave /models endpoint

-- First drop the foreign key constraint and column from enclaves
ALTER TABLE "enclaves" DROP CONSTRAINT IF EXISTS "enclaves_model_id_private_inference_models_id_fk";
ALTER TABLE "enclaves" DROP COLUMN IF EXISTS "model_id";

-- Drop the index on model_id
DROP INDEX IF EXISTS "idx_enclaves_model_id";

-- Drop the privateInferenceModels table
DROP TABLE IF EXISTS "private_inference_models";
