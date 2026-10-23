BEGIN;
CREATE TABLE public."PromoCampaign" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 kind text NOT NULL DEFAULT 'PACK_COLLECTION' CHECK(kind='PACK_COLLECTION'),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ENDED')),
 starts_on date NOT NULL, ends_on date, closed_at timestamptz,
 target integer NOT NULL DEFAULT 6 CHECK(target BETWEEN 1 AND 100),
 prize_limit integer NOT NULL DEFAULT 5 CHECK(prize_limit BETWEEN 0 AND 100),
 discount_percent integer NOT NULL DEFAULT 10 CHECK(discount_percent BETWEEN 1 AND 100),
 next_rank integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE public."PromoParticipant" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public."PromoCampaign"(id),
 customer_id text NOT NULL REFERENCES public."Customer"(id),
 confirmed integer NOT NULL DEFAULT 0, pending integer NOT NULL DEFAULT 0,
 completed_at timestamptz, completion_rank integer,
 benefit text CHECK(benefit IN ('PRIZE','DISCOUNT')),
 benefit_status text CHECK(benefit_status IN ('PENDING','USED','REVIEW')),
 prize_slot integer, used_order_id text, used_at timestamptz,
 keychain_delivered_at timestamptz, pieces_delivered integer NOT NULL DEFAULT 0 CHECK(pieces_delivered>=0),
 UNIQUE(campaign_id,customer_id)
);
CREATE UNIQUE INDEX promo_unique_prize_slot ON public."PromoParticipant"(campaign_id,prize_slot) WHERE prize_slot IS NOT NULL;
CREATE TABLE public."PromoPrize" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public."PromoCampaign"(id),
 position integer NOT NULL, name text NOT NULL, image_url text,
 participant_id uuid UNIQUE REFERENCES public."PromoParticipant"(id), delivered_at timestamptz,
 UNIQUE(campaign_id,position), CHECK(image_url IS NULL OR image_url ~ '^https://')
);
CREATE TABLE public."PromoOrder" (
 campaign_id uuid NOT NULL REFERENCES public."PromoCampaign"(id), order_id text NOT NULL,
 customer_id text REFERENCES public."Customer"(id), order_number integer, product_name text NOT NULL,
 quantity integer NOT NULL, confirmed integer NOT NULL DEFAULT 0, pending integer NOT NULL DEFAULT 0,
 order_status text NOT NULL, ordered_at timestamptz NOT NULL, confirmed_at timestamptz,
 historical boolean NOT NULL DEFAULT false, PRIMARY KEY(campaign_id,order_id)
);
CREATE INDEX promo_order_customer ON public."PromoOrder"(campaign_id,customer_id);
CREATE TABLE public."PromoEvent" (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES public."PromoCampaign"(id),
 participant_id uuid REFERENCES public."PromoParticipant"(id), event text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public."Order" ADD COLUMN "promoParticipantId" uuid REFERENCES public."PromoParticipant"(id),
 ADD COLUMN "promoDiscountPercent" integer NOT NULL DEFAULT 0 CHECK("promoDiscountPercent" BETWEEN 0 AND 100),
 ADD COLUMN "promoDiscountBase" double precision;

CREATE FUNCTION public.juani_promo_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public."UserRole" WHERE lower(email)=lower(auth.jwt()->>'email') AND role IN ('ADMIN','SUPERADMIN'));
$$;
REVOKE ALL ON FUNCTION public.juani_promo_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.juani_promo_admin() TO authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['PromoCampaign','PromoParticipant','PromoPrize','PromoOrder','PromoEvent'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('CREATE POLICY promo_admin_read ON public.%I FOR SELECT TO authenticated USING(public.juani_promo_admin())',t);
 END LOOP;
END $$;

CREATE FUNCTION public.juani_promo_eligible(c public."PromoCampaign", stamp timestamptz) RETURNS boolean
 LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT stamp >= ((c).starts_on::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
 AND ((c).ends_on IS NULL OR stamp < (((c).ends_on+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))
 AND ((c).closed_at IS NULL OR stamp <= (c).closed_at);
$$;

CREATE FUNCTION public.juani_promo_refresh(cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign"; p public."PromoParticipant"; slot integer; threshold_at timestamptz;
BEGIN
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=cid FOR UPDATE;
 INSERT INTO public."PromoParticipant"(campaign_id,customer_id)
 SELECT cid,customer_id FROM public."PromoOrder" WHERE campaign_id=cid AND customer_id IS NOT NULL GROUP BY customer_id
 ON CONFLICT DO NOTHING;
 UPDATE public."PromoParticipant" pp SET confirmed=s.confirmed,pending=s.pending FROM
 (SELECT p2.id,COALESCE(sum(o.confirmed),0)::int confirmed,COALESCE(sum(o.pending),0)::int pending
 FROM public."PromoParticipant" p2 LEFT JOIN public."PromoOrder" o ON o.campaign_id=p2.campaign_id AND o.customer_id=p2.customer_id
 WHERE p2.campaign_id=cid GROUP BY p2.id)s WHERE pp.id=s.id;
 -- Undelivered benefits can be withdrawn. Fulfilled ones are held for review,
 -- so a returned purchase never silently reissues a physical prize or coupon.
 UPDATE public."PromoParticipant" SET
 benefit=CASE WHEN benefit_status IN ('USED','REVIEW') THEN benefit ELSE NULL END,
 benefit_status=CASE WHEN benefit_status IN ('USED','REVIEW') THEN 'REVIEW' ELSE NULL END,
 prize_slot=CASE WHEN benefit_status IN ('USED','REVIEW') THEN prize_slot ELSE NULL END,
 completed_at=CASE WHEN benefit_status IN ('USED','REVIEW') THEN completed_at ELSE NULL END,
 completion_rank=CASE WHEN benefit_status IN ('USED','REVIEW') THEN completion_rank ELSE NULL END
 WHERE campaign_id=cid AND confirmed<c.target;
 FOR p IN SELECT * FROM public."PromoParticipant" WHERE campaign_id=cid AND confirmed>=c.target AND completed_at IS NULL ORDER BY
 (SELECT min(z.confirmed_at) FROM (SELECT confirmed_at,sum(confirmed) OVER(ORDER BY confirmed_at,order_id) n
  FROM public."PromoOrder" WHERE campaign_id=cid AND customer_id="PromoParticipant".customer_id AND confirmed>0)z WHERE z.n>=c.target),id
 LOOP
  SELECT min(z.confirmed_at) INTO threshold_at FROM
   (SELECT confirmed_at,sum(confirmed) OVER(ORDER BY confirmed_at,order_id) n FROM public."PromoOrder"
    WHERE campaign_id=cid AND customer_id=p.customer_id AND confirmed>0)z WHERE z.n>=c.target;
  UPDATE public."PromoCampaign" SET next_rank=next_rank+1 WHERE id=cid RETURNING next_rank INTO c.next_rank;
  UPDATE public."PromoParticipant" SET completed_at=COALESCE(threshold_at,clock_timestamp()),completion_rank=c.next_rank WHERE id=p.id;
 END LOOP;
 FOR p IN SELECT * FROM public."PromoParticipant" WHERE campaign_id=cid AND confirmed>=c.target AND (benefit IS NULL OR benefit_status='PENDING') ORDER BY completed_at,completion_rank,id LOOP
  IF p.benefit='PRIZE' THEN CONTINUE; END IF;
  SELECT n INTO slot FROM generate_series(1,c.prize_limit)n
   WHERE NOT EXISTS(SELECT 1 FROM public."PromoParticipant" WHERE campaign_id=cid AND prize_slot=n) ORDER BY n LIMIT 1;
  UPDATE public."PromoParticipant" SET benefit=CASE WHEN slot IS NOT NULL THEN 'PRIZE' ELSE 'DISCOUNT' END,
   benefit_status='PENDING',prize_slot=slot WHERE id=p.id;
 END LOOP;
END $$;

CREATE FUNCTION public.juani_promo_capture(cid uuid, oid text, historical_import boolean DEFAULT false) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public."Order"; c public."PromoCampaign"; prior public."PromoOrder"; conf int; pend int; stamp timestamptz;
BEGIN
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=cid;
 SELECT * INTO o FROM public."Order" WHERE id=oid;
 SELECT * INTO prior FROM public."PromoOrder" WHERE campaign_id=cid AND order_id=oid;
 IF o.id IS NULL THEN
  UPDATE public."PromoOrder" SET confirmed=0,pending=0,order_status='DELETED' WHERE campaign_id=cid AND order_id=oid;
  RETURN;
 END IF;
 IF NOT public.juani_promo_eligible(c,o."createdAt") THEN
  UPDATE public."PromoOrder" SET confirmed=0,pending=0,order_status='EXCLUDED' WHERE campaign_id=cid AND order_id=oid;
  RETURN;
 END IF;
 IF prior.order_id IS NULL AND NOT historical_import THEN
  IF c.status<>'ACTIVE' THEN RETURN; END IF;
  -- Availability is checked when enrolling, never retroactively on later edits.
  IF o."productId" IS NULL OR NOT EXISTS(SELECT 1 FROM public."Product" WHERE id=o."productId" AND active) THEN RETURN; END IF;
 END IF;
 conf:=CASE WHEN o.status='DELIVERED' THEN greatest(o.quantity,0) ELSE 0 END;
 pend:=CASE WHEN o.status='PENDING' THEN greatest(o.quantity,0) ELSE 0 END;
 stamp:=CASE WHEN conf=0 THEN NULL WHEN historical_import THEN o."updatedAt"
  WHEN prior.confirmed>0 AND conf<=prior.confirmed THEN prior.confirmed_at ELSE clock_timestamp() END;
 INSERT INTO public."PromoOrder"(campaign_id,order_id,customer_id,order_number,product_name,quantity,confirmed,pending,order_status,ordered_at,confirmed_at,historical)
 VALUES(cid,oid,o."customerId",o."orderNumber",o.product,o.quantity,conf,pend,o.status,o."createdAt",stamp,historical_import)
 ON CONFLICT(campaign_id,order_id) DO UPDATE SET customer_id=excluded.customer_id,order_number=excluded.order_number,
 product_name=excluded.product_name,quantity=excluded.quantity,confirmed=excluded.confirmed,pending=excluded.pending,
 order_status=excluded.order_status,confirmed_at=excluded.confirmed_at;
END $$;

CREATE FUNCTION public.juani_promo_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
  INSERT INTO public."PromoEvent"(campaign_id,participant_id,event,details)
  VALUES(NEW.campaign_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN 'PARTICIPANT_CREATED' ELSE 'PARTICIPANT_UPDATED' END,
   jsonb_build_object('confirmed',NEW.confirmed,'pending',NEW.pending,'benefit',NEW.benefit,'benefit_status',NEW.benefit_status,'prize_slot',NEW.prize_slot,'pieces_delivered',NEW.pieces_delivered));
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER promo_participant_audit AFTER INSERT OR UPDATE ON public."PromoParticipant" FOR EACH ROW EXECUTE FUNCTION public.juani_promo_audit();

CREATE FUNCTION public.juani_promo_order_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign"; oid text; participant uuid;
BEGIN
 oid:=CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
 FOR c IN SELECT * FROM public."PromoCampaign" WHERE status IN ('ACTIVE','ENDED') ORDER BY id FOR UPDATE LOOP
  IF c.status='ACTIVE' OR EXISTS(SELECT 1 FROM public."PromoOrder" WHERE campaign_id=c.id AND order_id=oid) THEN
   PERFORM public.juani_promo_capture(c.id,oid,false);
   PERFORM public.juani_promo_refresh(c.id);
  END IF;
 END LOOP;
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND NEW.status='CANCELLED' AND OLD.status<>'CANCELLED') THEN
  participant:=OLD."promoParticipantId";
  IF participant IS NOT NULL AND (TG_OP<>'DELETE' OR OLD.status='PENDING') THEN
   UPDATE public."PromoParticipant" p SET benefit_status=CASE WHEN p.confirmed>=cam.target THEN 'PENDING' ELSE 'REVIEW' END,
    used_order_id=NULL,used_at=NULL FROM public."PromoCampaign" cam
    WHERE p.id=participant AND cam.id=p.campaign_id AND p.used_order_id=oid;
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER zz_promo_order_changed AFTER INSERT OR UPDATE OR DELETE ON public."Order" FOR EACH ROW EXECUTE FUNCTION public.juani_promo_order_changed();

CREATE FUNCTION public.juani_promo_preserve_discount() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public."PromoParticipant";
BEGIN
 IF current_setting('juani.applying_promo_discount',true)='on' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW."promoParticipantId" IS NOT NULL OR NEW."promoDiscountPercent"<>0 OR NEW."promoDiscountBase" IS NOT NULL THEN RAISE EXCEPTION 'El descuento se aplica desde Promociones.'; END IF;
  RETURN NEW;
 END IF;
 IF NEW."promoParticipantId" IS DISTINCT FROM OLD."promoParticipantId" OR NEW."promoDiscountPercent"<>OLD."promoDiscountPercent" OR NEW."promoDiscountBase" IS DISTINCT FROM OLD."promoDiscountBase" THEN
  RAISE EXCEPTION 'Los datos del beneficio se administran desde Promociones.';
 END IF;
 IF OLD."promoParticipantId" IS NULL THEN RETURN NEW; END IF;
 IF NEW."customerId" IS DISTINCT FROM OLD."customerId" THEN RAISE EXCEPTION 'No se puede transferir un pedido con descuento a otro cliente.'; END IF;
 PERFORM c.id FROM public."PromoCampaign" c JOIN public."PromoParticipant" pp ON pp.campaign_id=c.id WHERE pp.id=OLD."promoParticipantId" FOR UPDATE OF c;
 SELECT * INTO STRICT p FROM public."PromoParticipant" WHERE id=OLD."promoParticipantId" FOR UPDATE;
 IF OLD.status='CANCELLED' AND NEW.status<>'CANCELLED' THEN
  IF p.benefit IS DISTINCT FROM 'DISCOUNT' OR p.benefit_status IS DISTINCT FROM 'PENDING' OR p.used_order_id IS NOT NULL THEN RAISE EXCEPTION 'El descuento ya no está disponible para reactivar este pedido.'; END IF;
  UPDATE public."PromoParticipant" SET benefit_status='USED',used_order_id=NEW.id,used_at=clock_timestamp() WHERE id=p.id;
 END IF;
 IF NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW."unitPrice" IS DISTINCT FROM OLD."unitPrice" OR NEW."productId" IS DISTINCT FROM OLD."productId" THEN
  IF NEW."unitPrice" IS NULL OR NEW."unitPrice"<0 THEN RAISE EXCEPTION 'Falta precio para recalcular el descuento.'; END IF;
  NEW."promoDiscountBase":=NEW.quantity*NEW."unitPrice";
 END IF;
 NEW."totalAmount":=round((NEW."promoDiscountBase"*(1-NEW."promoDiscountPercent"/100.0))::numeric,2)::double precision;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_promo_preserve_discount BEFORE INSERT OR UPDATE ON public."Order" FOR EACH ROW EXECUTE FUNCTION public.juani_promo_preserve_discount();

CREATE FUNCTION public.promo_create(p_name text,p_start date,p_end date DEFAULT NULL,p_target integer DEFAULT 6,p_prizes integer DEFAULT 5,p_discount integer DEFAULT 10) RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE cid uuid; BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 INSERT INTO public."PromoCampaign"(name,starts_on,ends_on,target,prize_limit,discount_percent) VALUES(p_name,p_start,p_end,p_target,p_prizes,p_discount) RETURNING id INTO cid;
 INSERT INTO public."PromoPrize"(campaign_id,position,name) SELECT cid,n,'Premio '||n FROM generate_series(1,p_prizes)n;
 RETURN cid;
END $$;

CREATE FUNCTION public.promo_preview(p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign"; result jsonb;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=p_campaign;
 SELECT jsonb_build_object('snapshot',COALESCE(md5(string_agg(concat_ws('|',id,"customerId",quantity,status,"updatedAt"::text),'~' ORDER BY id)),md5('empty')),'orders',count(*),'confirmed',COALESCE(sum(quantity) FILTER(WHERE status='DELIVERED'),0),
 'pending',COALESCE(sum(quantity) FILTER(WHERE status='PENDING'),0),'unlinked',count(*) FILTER(WHERE "customerId" IS NULL),
 'participants',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.customer_name) FROM
 (SELECT o."customerId" customer_id,cust.name customer_name,
 COALESCE(sum(o.quantity) FILTER(WHERE o.status='DELIVERED'),0) confirmed,COALESCE(sum(o.quantity) FILTER(WHERE o.status='PENDING'),0) pending,
 jsonb_agg(jsonb_build_object('order_number',o."orderNumber",'product_name',o.product,'quantity',o.quantity,'order_status',o.status) ORDER BY o."createdAt") orders
 FROM public."Order" o LEFT JOIN public."Customer" cust ON cust.id=o."customerId"
 WHERE public.juani_promo_eligible(c,o."createdAt") AND o.status<>'CANCELLED' GROUP BY o."customerId",cust.name)x),'[]'::jsonb)) INTO result
 FROM public."Order" WHERE public.juani_promo_eligible(c,"createdAt") AND status<>'CANCELLED';
 RETURN result;
END $$;

CREATE FUNCTION public.promo_activate(p_campaign uuid,p_snapshot text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign"; o record;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=p_campaign FOR UPDATE;
 IF c.status<>'DRAFT' THEN RAISE EXCEPTION 'Sólo se puede activar un borrador.'; END IF;
 IF p_snapshot IS DISTINCT FROM (public.promo_preview(c.id)->>'snapshot') THEN RAISE EXCEPTION 'Las compras cambiaron. Volvé a revisar la vista previa antes de activar.'; END IF;
 IF c.ends_on IS NOT NULL AND c.ends_on<(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'La fecha de fin ya pasó.'; END IF;
 IF EXISTS(SELECT 1 FROM public."Order" WHERE public.juani_promo_eligible(c,"createdAt") AND status<>'CANCELLED' AND "customerId" IS NULL) THEN RAISE EXCEPTION 'Hay pedidos sin cliente; vinculalos antes de activar.'; END IF;
 UPDATE public."PromoCampaign" SET status='ACTIVE' WHERE id=p_campaign;
 FOR o IN SELECT id FROM public."Order" WHERE public.juani_promo_eligible(c,"createdAt") ORDER BY "updatedAt",id LOOP
  PERFORM public.juani_promo_capture(c.id,o.id,true);
 END LOOP;
 PERFORM public.juani_promo_refresh(c.id);
 INSERT INTO public."PromoEvent"(campaign_id,event) VALUES(c.id,'CAMPAIGN_ACTIVATED');
END $$;

CREATE FUNCTION public.promo_configure(p_campaign uuid,p_name text,p_start date,p_end date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign";
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=p_campaign FOR UPDATE;
 IF c.status='ENDED' OR (c.status='ACTIVE' AND c.ends_on<(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) THEN RAISE EXCEPTION 'La promoción ya finalizó.'; END IF;
 IF c.status<>'DRAFT' AND p_start<>c.starts_on THEN RAISE EXCEPTION 'La fecha inicial no se cambia después de activar.'; END IF;
 IF p_end IS NOT NULL AND (p_end<p_start OR (c.status='ACTIVE' AND p_end<(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)) THEN RAISE EXCEPTION 'Fecha de fin inválida.'; END IF;
 UPDATE public."PromoCampaign" SET name=p_name,starts_on=p_start,ends_on=p_end WHERE id=c.id;
 INSERT INTO public."PromoEvent"(campaign_id,event) VALUES(c.id,'CAMPAIGN_CONFIGURED');
END $$;
CREATE FUNCTION public.promo_finish(p_campaign uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 PERFORM id FROM public."PromoCampaign" WHERE id=p_campaign FOR UPDATE;
 UPDATE public."PromoCampaign" SET status='ENDED',closed_at=clock_timestamp() WHERE id=p_campaign AND status='ACTIVE';
 IF NOT FOUND THEN RAISE EXCEPTION 'La promoción no está activa.'; END IF;
 INSERT INTO public."PromoEvent"(campaign_id,event) VALUES(p_campaign,'CAMPAIGN_FINISHED');
END $$;
CREATE FUNCTION public.promo_edit_prize(p_prize uuid,p_name text,p_image text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 IF length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'Ingresá el nombre del premio.'; END IF;
 UPDATE public."PromoPrize" SET name=trim(p_name),image_url=NULLIF(trim(p_image),'') WHERE id=p_prize AND delivered_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Premio no disponible para editar.'; END IF;
END $$;
CREATE FUNCTION public.promo_deliver_prize(p_participant uuid,p_prize uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public."PromoParticipant"; cid uuid;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT campaign_id INTO STRICT cid FROM public."PromoParticipant" WHERE id=p_participant;
 PERFORM id FROM public."PromoCampaign" WHERE id=cid FOR UPDATE;
 SELECT * INTO STRICT p FROM public."PromoParticipant" WHERE id=p_participant FOR UPDATE;
 IF p.benefit IS DISTINCT FROM 'PRIZE' OR p.benefit_status IS DISTINCT FROM 'PENDING' THEN RAISE EXCEPTION 'El cliente no tiene un premio pendiente.'; END IF;
 UPDATE public."PromoPrize" SET participant_id=p.id,delivered_at=clock_timestamp() WHERE id=p_prize AND campaign_id=cid AND delivered_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ese premio ya fue entregado o no pertenece a esta promoción.'; END IF;
 UPDATE public."PromoParticipant" SET benefit_status='USED',used_at=clock_timestamp() WHERE id=p.id;
END $$;
CREATE FUNCTION public.promo_physical_delivery(p_participant uuid,p_keychain boolean,p_pieces integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 UPDATE public."PromoParticipant" p SET pieces_delivered=p_pieces,keychain_delivered_at=CASE WHEN p_keychain THEN COALESCE(keychain_delivered_at,clock_timestamp()) ELSE NULL END
 FROM public."PromoCampaign" c WHERE p.id=p_participant AND c.id=p.campaign_id AND p_pieces BETWEEN 0 AND least(p.confirmed,c.target);
 IF NOT FOUND THEN RAISE EXCEPTION 'Las porciones entregadas no pueden superar las confirmadas ni la meta.'; END IF;
END $$;

CREATE FUNCTION public.promo_apply_discount(p_participant uuid,p_order text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public."PromoParticipant"; c public."PromoCampaign"; o public."Order"; first_order text;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO STRICT o FROM public."Order" WHERE id=p_order FOR UPDATE;
 SELECT campaign_id INTO STRICT c.id FROM public."PromoParticipant" WHERE id=p_participant;
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=c.id FOR UPDATE;
 SELECT * INTO STRICT p FROM public."PromoParticipant" WHERE id=p_participant FOR UPDATE;
 IF p.benefit IS DISTINCT FROM 'DISCOUNT' OR p.benefit_status IS DISTINCT FROM 'PENDING' THEN RAISE EXCEPTION 'El descuento no está disponible.'; END IF;
 SELECT id INTO first_order FROM public."Order" WHERE "customerId"=p.customer_id AND "createdAt">p.completed_at AND status<>'CANCELLED' ORDER BY "createdAt",id LIMIT 1;
 IF o.id IS DISTINCT FROM first_order OR o.status<>'PENDING' OR o."promoParticipantId" IS NOT NULL OR o."totalAmount" IS NULL OR o."totalAmount"<=0 OR o."isPaid" THEN
  RAISE EXCEPTION 'Seleccioná la próxima compra pendiente de pago y entrega, posterior a completar la promo.';
 END IF;
 UPDATE public."PromoParticipant" SET benefit_status='USED',used_order_id=o.id,used_at=clock_timestamp() WHERE id=p.id;
 PERFORM set_config('juani.applying_promo_discount','on',true);
 UPDATE public."Order" SET "promoParticipantId"=p.id,"promoDiscountPercent"=c.discount_percent,"promoDiscountBase"=o."totalAmount",
 "totalAmount"=round((o."totalAmount"*(1-c.discount_percent/100.0))::numeric,2)::double precision,"updatedAt"=clock_timestamp() WHERE id=o.id;
 PERFORM set_config('juani.applying_promo_discount','off',true);
END $$;

CREATE FUNCTION public.promo_dashboard(p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT jsonb_build_object('campaign',to_jsonb(c),'participants',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.confirmed DESC,x.pending DESC,x.customer_name) FROM
 (SELECT p.*,cust.name customer_name,COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.ordered_at) FROM public."PromoOrder" o WHERE o.campaign_id=p.campaign_id AND o.customer_id=p.customer_id),'[]'::jsonb) orders
 FROM public."PromoParticipant" p JOIN public."Customer" cust ON cust.id=p.customer_id WHERE p.campaign_id=c.id)x),'[]'::jsonb),
 'prizes',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.position) FROM (SELECT pr.*,cust.name customer_name FROM public."PromoPrize" pr LEFT JOIN public."PromoParticipant" p ON p.id=pr.participant_id LEFT JOIN public."Customer" cust ON cust.id=p.customer_id WHERE pr.campaign_id=c.id)x),'[]'::jsonb),
 'events',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id DESC) FROM (SELECT * FROM public."PromoEvent" WHERE campaign_id=c.id ORDER BY id DESC LIMIT 80)x),'[]'::jsonb)) INTO result FROM public."PromoCampaign" c WHERE c.id=p_campaign;
 RETURN result;
END $$;
-- Keep administrative mutations behind role checks. Internal functions are never RPCs for browser/anon use.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure sig,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'promo_%' OR p.proname LIKE 'juani_promo_%') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.sig);
  IF f.proname LIKE 'promo_%' OR f.proname='juani_promo_admin' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig); END IF;
 END LOOP;
END $$;
-- A reviewable draft: no historical orders or customer benefits are enrolled yet.
DO $$ DECLARE cid uuid; BEGIN
 INSERT INTO public."PromoCampaign"(name,starts_on) VALUES('Completá tu pizza','2026-10-22') RETURNING id INTO cid;
 INSERT INTO public."PromoPrize"(campaign_id,position,name) SELECT cid,n,'Premio '||n FROM generate_series(1,5)n;
END $$;
COMMIT;
