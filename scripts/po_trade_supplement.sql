-- Supplementary SQL for Potrade Database
-- Run this AFTER running po_trade_dump.sql

-- Add missing columns to brokers table
ALTER TABLE public.brokers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.brokers ADD COLUMN IF NOT EXISTS permission jsonb DEFAULT '{}';

-- Update existing brokers to have active = true
UPDATE public.brokers SET active = true WHERE active IS NULL;

-- Create preferences table
CREATE TABLE IF NOT EXISTS public.preferences (
    broker_id integer NOT NULL PRIMARY KEY,
    general jsonb
);

ALTER TABLE public.preferences OWNER TO potrade;

-- Insert default preference record
INSERT INTO public.preferences (broker_id, general) 
VALUES (999, '{}')
ON CONFLICT (broker_id) DO NOTHING;

-- Create fxrate table
CREATE TABLE IF NOT EXISTS public.fxrate (
    fxrate_id serial PRIMARY KEY,
    currency_pair character varying NOT NULL,
    rate double precision,
    security character varying,
    is_stale boolean DEFAULT false
);

ALTER TABLE public.fxrate OWNER TO potrade;

-- Add some default FX rates
INSERT INTO public.fxrate (currency_pair, rate, security, is_stale) 
VALUES 
    ('AUDUSD', 1.0, 'AUDUSD Curncy', false),
    ('AUDEUR', 1.0, 'AUDEUR Curncy', false),
    ('AUDGBP', 1.0, 'AUDGBP Curncy', false)
ON CONFLICT DO NOTHING;

-- Add a test user for login (username: wpo, password: wpo1)
INSERT INTO public.brokers (username, password, firstname, lastname, accesslevel, active, permission)
VALUES ('wpo', 'wpo1', 'Test', 'User', 1, true, '{}')
ON CONFLICT (broker_id) DO NOTHING;

-- Set search path for the database
ALTER DATABASE potrade SET search_path TO public;

-- Done!
SELECT 'Database setup complete!' AS status;
