CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE "UserRole"(email text,role text);
INSERT INTO "UserRole" VALUES('test@example.invalid','ADMIN');
CREATE TABLE "Customer"(id text PRIMARY KEY,name text);
CREATE TABLE "Product"(id text PRIMARY KEY,name text,active boolean DEFAULT true,"updatedAt" timestamptz DEFAULT now());
CREATE TABLE "Order"(id text PRIMARY KEY DEFAULT gen_random_uuid(),"customerId" text REFERENCES "Customer"(id),"customerName" text,product text NOT NULL,"productId" text REFERENCES "Product"(id),quantity integer NOT NULL,
status text DEFAULT 'PENDING',"orderNumber" integer,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),"unitPrice" double precision DEFAULT 100,"unitCost" double precision DEFAULT 20,"totalAmount" double precision DEFAULT 100,"isPaid" boolean DEFAULT false);
