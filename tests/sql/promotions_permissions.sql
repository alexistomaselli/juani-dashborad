BEGIN;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","email":"test@example.invalid"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE c uuid; caught bool:=false; BEGIN
 SELECT id INTO c FROM public."PromoCampaign" LIMIT 1;
 IF c IS NULL THEN RAISE EXCEPTION 'Admin cannot read campaigns'; END IF;
 PERFORM public.promo_dashboard(c);
 BEGIN INSERT INTO public."PromoCampaign"(name,starts_on) VALUES('Forbidden',current_date);
 EXCEPTION WHEN insufficient_privilege THEN caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Browser can bypass administrative RPC'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ DECLARE caught bool:=false; BEGIN
 BEGIN PERFORM public.promo_create('Forbidden',current_date); EXCEPTION WHEN insufficient_privilege THEN caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Anonymous user can create promotions'; END IF;
END $$;
ROLLBACK;
