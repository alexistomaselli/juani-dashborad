BEGIN;
-- Once six packs were delivered, administrative corrections require review;
-- they must not silently put an assured prize back into the waitlist pool.
ALTER TABLE public."PromoParticipant" ADD COLUMN prize_secured_at timestamptz;
UPDATE public."PromoParticipant" p SET prize_secured_at=COALESCE(p.used_at,clock_timestamp())
FROM public."PromoCampaign" c WHERE c.id=p.campaign_id AND p.benefit='PRIZE' AND p.confirmed>=c.target;
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
 benefit=CASE WHEN (benefit_status IN ('USED','REVIEW') OR prize_secured_at IS NOT NULL) THEN benefit ELSE NULL END,
 benefit_status=CASE WHEN (benefit_status IN ('USED','REVIEW') OR prize_secured_at IS NOT NULL) THEN 'REVIEW' ELSE NULL END,
 prize_slot=CASE WHEN (benefit_status IN ('USED','REVIEW') OR prize_secured_at IS NOT NULL) THEN prize_slot ELSE NULL END,
 completed_at=CASE WHEN (benefit_status IN ('USED','REVIEW') OR prize_secured_at IS NOT NULL) THEN completed_at ELSE NULL END,
 completion_rank=CASE WHEN (benefit_status IN ('USED','REVIEW') OR prize_secured_at IS NOT NULL) THEN completion_rank ELSE NULL END
 WHERE campaign_id=cid AND (confirmed+pending<c.target OR (benefit='PRIZE' AND prize_secured_at IS NOT NULL AND confirmed<c.target));
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
 UPDATE public."PromoParticipant" SET prize_secured_at=COALESCE(prize_secured_at,clock_timestamp())
 WHERE campaign_id=cid AND benefit='PRIZE' AND confirmed>=c.target AND prize_secured_at IS NULL;
END $$;
COMMIT;
