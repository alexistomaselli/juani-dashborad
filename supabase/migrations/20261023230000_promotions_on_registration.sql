BEGIN;
-- Keep delivered and pending packs separate; both now count toward completion.
ALTER TABLE public."PromoOrder" ADD COLUMN earned_at timestamptz;
ALTER TABLE public."PromoParticipant" ADD COLUMN promotion_notice_at timestamptz, ADD COLUMN promotion_notified_at timestamptz;
UPDATE public."PromoOrder" SET earned_at=ordered_at;
CREATE OR REPLACE FUNCTION public.juani_promo_refresh(cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 WHERE campaign_id=cid AND confirmed+pending<c.target;
 FOR p IN SELECT * FROM public."PromoParticipant" WHERE campaign_id=cid AND confirmed+pending>=c.target AND completed_at IS NULL ORDER BY
 (SELECT min(z.earned_at) FROM (SELECT earned_at,sum(confirmed+pending) OVER(ORDER BY earned_at,order_id) n
  FROM public."PromoOrder" WHERE campaign_id=cid AND customer_id="PromoParticipant".customer_id AND confirmed+pending>0)z WHERE z.n>=c.target),id
 LOOP
  SELECT min(z.earned_at) INTO threshold_at FROM
   (SELECT earned_at,sum(confirmed+pending) OVER(ORDER BY earned_at,order_id) n FROM public."PromoOrder"
    WHERE campaign_id=cid AND customer_id=p.customer_id AND confirmed+pending>0)z WHERE z.n>=c.target;
  UPDATE public."PromoCampaign" SET next_rank=next_rank+1 WHERE id=cid RETURNING next_rank INTO c.next_rank;
  UPDATE public."PromoParticipant" SET completed_at=COALESCE(threshold_at,clock_timestamp()),completion_rank=c.next_rank WHERE id=p.id;
 END LOOP;
 FOR p IN SELECT * FROM public."PromoParticipant" WHERE campaign_id=cid AND confirmed+pending>=c.target AND (benefit IS NULL OR benefit_status='PENDING') ORDER BY completed_at,completion_rank,id LOOP
  IF p.benefit='PRIZE' THEN CONTINUE; END IF;
  SELECT n INTO slot FROM generate_series(1,c.prize_limit)n
   WHERE NOT EXISTS(SELECT 1 FROM public."PromoParticipant" WHERE campaign_id=cid AND prize_slot=n) ORDER BY n LIMIT 1;
  IF slot IS NOT NULL AND p.benefit='DISCOUNT' THEN
   UPDATE public."PromoParticipant" SET promotion_notice_at=clock_timestamp(),promotion_notified_at=NULL WHERE id=p.id;
   INSERT INTO public."PromoEvent"(campaign_id,participant_id,event) VALUES(cid,p.id,'WAITLIST_PROMOTED');
  END IF;
  UPDATE public."PromoParticipant" SET benefit=CASE WHEN slot IS NOT NULL THEN 'PRIZE' ELSE 'DISCOUNT' END,
   benefit_status='PENDING',prize_slot=slot WHERE id=p.id;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.juani_promo_capture(cid uuid, oid text, historical_import boolean DEFAULT false) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public."Order"; c public."PromoCampaign"; prior public."PromoOrder"; conf int; pend int; stamp timestamptz; earned timestamptz;
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
 earned:=CASE WHEN conf+pend=0 THEN prior.earned_at
  WHEN prior.order_id IS NULL THEN CASE WHEN historical_import THEN o."createdAt" ELSE clock_timestamp() END
  WHEN conf+pend>prior.confirmed+prior.pending OR o."customerId" IS DISTINCT FROM prior.customer_id THEN clock_timestamp()
  ELSE prior.earned_at END;
 INSERT INTO public."PromoOrder"(campaign_id,order_id,customer_id,order_number,product_name,quantity,confirmed,pending,order_status,ordered_at,confirmed_at,historical,earned_at)
 VALUES(cid,oid,o."customerId",o."orderNumber",o.product,o.quantity,conf,pend,o.status,o."createdAt",stamp,historical_import,earned)
 ON CONFLICT(campaign_id,order_id) DO UPDATE SET customer_id=excluded.customer_id,order_number=excluded.order_number,
 product_name=excluded.product_name,quantity=excluded.quantity,confirmed=excluded.confirmed,pending=excluded.pending,
 order_status=excluded.order_status,confirmed_at=excluded.confirmed_at,earned_at=excluded.earned_at;
END $$;
CREATE OR REPLACE FUNCTION public.juani_promo_order_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
   UPDATE public."PromoParticipant" p SET benefit_status=CASE WHEN p.confirmed+p.pending>=cam.target THEN 'PENDING' ELSE 'REVIEW' END,
    used_order_id=NULL,used_at=NULL FROM public."PromoCampaign" cam
    WHERE p.id=participant AND cam.id=p.campaign_id AND p.used_order_id=oid;
  END IF;
 END IF;
 IF participant IS NOT NULL THEN
  SELECT * INTO c FROM public."PromoCampaign" WHERE id=(SELECT campaign_id FROM public."PromoParticipant" WHERE id=participant);
  PERFORM public.juani_promo_refresh(c.id);
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.promo_deliver_prize(p_participant uuid,p_prize uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public."PromoParticipant"; cid uuid; goal int;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT campaign_id INTO STRICT cid FROM public."PromoParticipant" WHERE id=p_participant;
 PERFORM id FROM public."PromoCampaign" WHERE id=cid FOR UPDATE;
 SELECT * INTO STRICT p FROM public."PromoParticipant" WHERE id=p_participant FOR UPDATE;
 IF p.benefit IS DISTINCT FROM 'PRIZE' OR p.benefit_status IS DISTINCT FROM 'PENDING' THEN RAISE EXCEPTION 'El cliente no tiene un premio pendiente.'; END IF;
 SELECT target INTO goal FROM public."PromoCampaign" WHERE id=cid;
 IF p.confirmed<goal THEN RAISE EXCEPTION 'El premio está reservado. Primero deben entregarse los pedidos que completan las porciones.'; END IF;
 UPDATE public."PromoPrize" SET participant_id=p.id,delivered_at=clock_timestamp() WHERE id=p_prize AND campaign_id=cid AND delivered_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ese premio ya fue entregado o no pertenece a esta promoción.'; END IF;
 UPDATE public."PromoParticipant" SET benefit_status='USED',used_at=clock_timestamp() WHERE id=p.id;
END $$;
CREATE OR REPLACE FUNCTION public.promo_preview(p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public."PromoCampaign"; result jsonb;
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO STRICT c FROM public."PromoCampaign" WHERE id=p_campaign;
 SELECT jsonb_build_object('snapshot',COALESCE(md5('registered-v2|' || string_agg(concat_ws('|',id,"customerId",quantity,status,"updatedAt"::text),'~' ORDER BY id)),md5('registered-v2|empty')),'orders',count(*),'confirmed',COALESCE(sum(quantity) FILTER(WHERE status='DELIVERED'),0),
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
CREATE OR REPLACE FUNCTION public.promo_physical_delivery(p_participant uuid,p_keychain boolean,p_pieces integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 UPDATE public."PromoParticipant" p SET pieces_delivered=p_pieces,keychain_delivered_at=CASE WHEN p_keychain THEN COALESCE(keychain_delivered_at,clock_timestamp()) ELSE NULL END
 FROM public."PromoCampaign" c WHERE p.id=p_participant AND c.id=p.campaign_id AND p_pieces BETWEEN 0 AND least(p.confirmed+p.pending,c.target);
 IF NOT FOUND THEN RAISE EXCEPTION 'Las porciones entregadas no pueden superar las acumuladas ni la meta.'; END IF;
END $$;
-- The next purchase consumes an existing coupon atomically for both channels.
-- This BEFORE INSERT runs after the guard against callers setting discount fields.
CREATE FUNCTION public.juani_promo_auto_discount() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public."PromoParticipant"; c public."PromoCampaign";
BEGIN
 IF NEW.status<>'PENDING' OR NEW."customerId" IS NULL OR NEW."isPaid" OR NEW."totalAmount" IS NULL OR NEW."totalAmount"<=0 THEN RETURN NEW; END IF;
 FOR c IN SELECT * FROM public."PromoCampaign" WHERE status IN ('ACTIVE','ENDED') ORDER BY id FOR UPDATE LOOP
  PERFORM public.juani_promo_refresh(c.id);
  SELECT * INTO p FROM public."PromoParticipant" WHERE campaign_id=c.id AND customer_id=NEW."customerId" AND benefit='DISCOUNT' AND benefit_status='PENDING' FOR UPDATE;
  IF p.id IS NULL OR NEW."createdAt"<=p.completed_at THEN CONTINUE; END IF;
  -- No retroactive application if an earlier next purchase was already recorded.
  IF EXISTS(SELECT 1 FROM public."Order" WHERE "customerId"=NEW."customerId" AND "createdAt">p.completed_at AND status<>'CANCELLED') THEN CONTINUE; END IF;
  NEW."promoParticipantId":=p.id;
  NEW."promoDiscountPercent":=c.discount_percent;
  NEW."promoDiscountBase":=NEW."totalAmount";
  NEW."totalAmount":=round((NEW."totalAmount"*(1-c.discount_percent/100.0))::numeric,2)::double precision;
  UPDATE public."PromoParticipant" SET benefit_status='USED',used_order_id=NEW.id,used_at=clock_timestamp() WHERE id=p.id;
  EXIT; -- Never stack benefits from two campaigns.
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER zzz_promo_auto_discount BEFORE INSERT ON public."Order" FOR EACH ROW EXECUTE FUNCTION public.juani_promo_auto_discount();
REVOKE ALL ON FUNCTION public.juani_promo_auto_discount() FROM PUBLIC,anon,authenticated;

-- Bot has only an anon key. Require the random order UUID AND exact WhatsApp,
-- returning only that customer's progress and aggregate availability, no other identities.
CREATE FUNCTION public.promo_order_status(p_order text,p_whatsapp text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE o public."Order"; result jsonb;
BEGIN
 SELECT * INTO o FROM public."Order" WHERE id=p_order AND whatsapp=p_whatsapp AND length(trim(p_whatsapp))>0;
 IF o.id IS NULL THEN RETURN '[]'::jsonb; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
 'campaign_id',c.id,'name',c.name,'target',c.target,'accumulated',p.confirmed+p.pending,'delivered',p.confirmed,'pending',p.pending,
 'earned_in_order',COALESCE(po.confirmed+po.pending,0),'completion_rank',p.completion_rank,
 'benefit',p.benefit,'benefit_status',p.benefit_status,'discount_percent',c.discount_percent,
 'prize_secured',p.benefit='PRIZE' AND p.confirmed>=c.target,
 'waiting',p.benefit='DISCOUNT' AND p.benefit_status='PENDING' AND EXISTS(SELECT 1 FROM public."PromoParticipant" reserved WHERE reserved.campaign_id=c.id AND reserved.benefit='PRIZE' AND reserved.benefit_status='PENDING' AND reserved.confirmed<c.target),
 'discount_applied',CASE WHEN o."promoParticipantId"=p.id THEN o."promoDiscountPercent" ELSE 0 END) ORDER BY c.created_at),'[]'::jsonb) INTO result
 FROM public."PromoParticipant" p JOIN public."PromoCampaign" c ON c.id=p.campaign_id
 LEFT JOIN public."PromoOrder" po ON po.campaign_id=c.id AND po.order_id=o.id
 WHERE p.customer_id=o."customerId" AND (po.order_id IS NOT NULL OR p.id=o."promoParticipantId");
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.promo_order_status(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promo_order_status(text,text) TO anon,authenticated;
CREATE FUNCTION public.promo_acknowledge_promotion(p_participant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.juani_promo_admin() THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 UPDATE public."PromoParticipant" SET promotion_notified_at=clock_timestamp()
 WHERE id=p_participant AND promotion_notice_at IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.promo_acknowledge_promotion(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.promo_acknowledge_promotion(uuid) TO authenticated;
-- Recalculate existing campaigns without enrolling drafts or touching Order/Product.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT id FROM public."PromoCampaign" WHERE status<>'DRAFT' ORDER BY id LOOP
  PERFORM public.juani_promo_refresh(c.id);
 END LOOP;
END $$;
COMMIT;
