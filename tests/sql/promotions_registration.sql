-- Disposable databases only; isolate from concurrent-test fixtures, then roll back.
BEGIN;
DO $$ BEGIN
 IF current_database() NOT LIKE 'juani_promos_%' THEN RAISE EXCEPTION 'Use a disposable juani_promos_* database'; END IF;
END $$;
DELETE FROM "Order";
UPDATE "PromoCampaign" SET status='ENDED',closed_at=clock_timestamp()-interval '1 day' WHERE status<>'DRAFT';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS whatsapp text;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","email":"test@example.invalid"}',true);
DO $$
DECLARE cid uuid; pid uuid; sixth uuid; seventh uuid; prize uuid; caught bool; rank_before int; result jsonb;
BEGIN
 INSERT INTO "Product"(id,name,active,stock) VALUES('v2-product','Test',true,200);
 INSERT INTO "Customer"(id,name) SELECT 'v2-'||i,'Test '||i FROM generate_series(1,8)i;
 cid:=promo_create('Registration test',current_date,NULL,6,5,10);
 INSERT INTO "Order"(id,"customerId",product,"productId",quantity,status,"createdAt","totalAmount",whatsapp)
 VALUES('v2-first','v2-1','Test','v2-product',6,'PENDING',clock_timestamp(),600,'test-phone');
 IF EXISTS(SELECT 1 FROM "PromoOrder" WHERE campaign_id=cid) THEN RAISE EXCEPTION 'Draft enrolled'; END IF;
 result:=promo_preview(cid);
 IF (result->>'pending')::int<>6 THEN RAISE EXCEPTION 'Preview missing pending'; END IF;
 caught:=false;
 BEGIN PERFORM promo_activate(cid,'old-snapshot'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Old preview accepted'; END IF;
 PERFORM promo_activate(cid,result->>'snapshot');
 SELECT id,completion_rank INTO pid,rank_before FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-1';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=pid AND pending=6 AND confirmed=0 AND benefit='PRIZE') THEN RAISE EXCEPTION 'Pending did not reserve'; END IF;
 SELECT id INTO prize FROM "PromoPrize" WHERE campaign_id=cid ORDER BY position LIMIT 1;
 caught:=false;
 BEGIN PERFORM promo_deliver_prize(pid,prize); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Reserved prize delivered before secured'; END IF;
 -- Six other completions: 4 more reservations, then two coupons.
 FOR i IN 2..7 LOOP
 INSERT INTO "Order"(id,"customerId",product,"productId",quantity,status,"createdAt","totalAmount",whatsapp)
 VALUES('v2-order-'||i,'v2-'||i,'Test','v2-product',6,'PENDING',clock_timestamp(),600,'test-phone-'||i);
 END LOOP;
 SELECT id INTO sixth FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-6';
 SELECT id INTO seventh FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-7';
 IF (SELECT count(*) FROM "PromoParticipant" WHERE campaign_id=cid AND benefit='PRIZE')<>5 THEN RAISE EXCEPTION 'Prize cap'; END IF;
 result:=promo_order_status('v2-order-6','test-phone-6')->0;
 IF (result->>'accumulated')::int<>6 OR (result->>'waiting')::bool IS NOT TRUE THEN RAISE EXCEPTION 'Bot status incorrect: %',result; END IF;
 IF promo_order_status('v2-order-6','wrong')<>'[]'::jsonb THEN RAISE EXCEPTION 'Mismatched WhatsApp exposed progress'; END IF;
 -- Delivering does not duplicate, change completion rank or auto-apply coupon.
 UPDATE "Order" SET status='DELIVERED' WHERE id='v2-first';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=pid AND pending=0 AND confirmed=6 AND completion_rank=rank_before) THEN RAISE EXCEPTION 'Delivery changed completion'; END IF;
 PERFORM promo_deliver_prize(pid,prize);
 -- Coupon automatically applies to NEXT creation, never the sixth-pack order.
 INSERT INTO "Order"(id,"customerId",product,"productId",quantity,"totalAmount","createdAt",whatsapp)
 VALUES('v2-discount','v2-6','Test','v2-product',2,200,clock_timestamp(),'test-phone-6');
 IF NOT EXISTS(SELECT 1 FROM "Order" WHERE id='v2-discount' AND "totalAmount"=180 AND "promoDiscountPercent"=10) THEN RAISE EXCEPTION 'Automatic discount missing'; END IF;
 IF (SELECT "totalAmount" FROM "Order" WHERE id='v2-order-6')<>600 THEN RAISE EXCEPTION 'Qualifying order discounted'; END IF;
 UPDATE "Order" SET quantity=3,"totalAmount"=300 WHERE id='v2-discount';
 IF (SELECT "totalAmount" FROM "Order" WHERE id='v2-discount')<>270 THEN RAISE EXCEPTION 'Edit lost coupon'; END IF;
 -- Releasing first reservation skips the sixth who already consumed coupon.
 UPDATE "Order" SET status='CANCELLED' WHERE id='v2-order-2';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=sixth AND benefit='DISCOUNT' AND benefit_status='USED') THEN RAISE EXCEPTION 'Double benefit'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=seventh AND benefit='PRIZE') THEN RAISE EXCEPTION 'Waitlist did not skip used discount'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "PromoEvent" WHERE participant_id=seventh AND event='WAITLIST_PROMOTED') THEN RAISE EXCEPTION 'Missing notification trace'; END IF;
 -- Cancel discounted order: return coupon; reserve can upgrade with another free slot.
 UPDATE "Order" SET status='CANCELLED' WHERE id='v2-discount';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=sixth AND benefit_status='PENDING' AND used_order_id IS NULL) THEN RAISE EXCEPTION 'Coupon not restored'; END IF;
 UPDATE "Order" SET status='CANCELLED' WHERE id='v2-order-3';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=sixth AND benefit='PRIZE' AND used_order_id IS NULL) THEN RAISE EXCEPTION 'Returned coupon not promoted'; END IF;
 caught:=false;
 BEGIN UPDATE "Order" SET status='PENDING' WHERE id='v2-discount'; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Old coupon revived alongside prize'; END IF;
 -- Adjust quantities and customer, no duplicate contribution; inactive catalog preserves history.
 UPDATE "Order" SET quantity=5 WHERE id='v2-order-4';
 IF EXISTS(SELECT 1 FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-4' AND benefit IS NOT NULL) THEN RAISE EXCEPTION 'Insufficient packs retained prize'; END IF;
 UPDATE "Order" SET quantity=6 WHERE id='v2-order-4';
 UPDATE "Product" SET active=false WHERE id='v2-product';
 UPDATE "Order" SET "updatedAt"=clock_timestamp() WHERE id='v2-order-4';
 IF (SELECT pending FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-4')<>6 THEN RAISE EXCEPTION 'Inactive erased progress'; END IF;
 UPDATE "Product" SET active=true WHERE id='v2-product';
 -- A secured but uncollected prize also stays reserved for review after correction.
 UPDATE "Order" SET status='DELIVERED' WHERE id='v2-order-5';
 UPDATE "Order" SET status='CANCELLED' WHERE id='v2-order-5';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE campaign_id=cid AND customer_id='v2-5' AND benefit_status='REVIEW' AND prize_slot IS NOT NULL) THEN RAISE EXCEPTION 'Secured right was freed by delivered cancellation'; END IF;
 -- Fulfilled prize cancellation remains review and cannot issue a second benefit.
 UPDATE "Order" SET status='CANCELLED' WHERE id='v2-first';
 IF NOT EXISTS(SELECT 1 FROM "PromoParticipant" WHERE id=pid AND benefit_status='REVIEW' AND prize_slot IS NOT NULL) THEN RAISE EXCEPTION 'Fulfilled benefit silently reissued'; END IF;
 PERFORM promo_finish(cid);
 INSERT INTO "Order"(id,"customerId",product,"productId",quantity,"createdAt") VALUES('v2-after','v2-8','Test','v2-product',6,clock_timestamp());
 IF EXISTS(SELECT 1 FROM "PromoOrder" WHERE campaign_id=cid AND order_id='v2-after') THEN RAISE EXCEPTION 'Ended enrolled new order'; END IF;
 UPDATE "Order" SET status='DELIVERED' WHERE id='v2-order-7';
 IF (SELECT confirmed FROM "PromoParticipant" WHERE id=seventh)<>6 THEN RAISE EXCEPTION 'Ended blocked existing delivery'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF promo_order_status('not-an-order','wrong')<>'[]'::jsonb THEN RAISE EXCEPTION 'Anon exposed progress'; END IF;
END $$;
ROLLBACK;
