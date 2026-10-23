"""Use only a disposable database with promotions_schema + stock + both promotion migrations."""
import concurrent.futures, json, os, subprocess
if not os.environ.get('PGDATABASE','').startswith('juani_promos_'):
    raise SystemExit('Set PGDATABASE to a disposable juani_promos_* test database.')
psql=[os.environ.get('PSQL','psql'),'-X','-q','-At','-v','ON_ERROR_STOP=1']
claims=json.dumps({'sub':'00000000-0000-0000-0000-000000000001','email':'test@example.invalid'})
def sql(q):
    return subprocess.run(psql,input=f"SET request.jwt.claims='{claims}';\n"+q,text=True,capture_output=True)
def ok(q):
    r=sql(q)
    assert r.returncode==0,r.stderr
    return r.stdout.strip()
cid=ok("SELECT public.promo_create('Concurrent test',current_date,NULL,6,5,10);")
ok(f"SELECT public.promo_activate('{cid}',(public.promo_preview('{cid}')->>'snapshot'));")
ok("INSERT INTO \"Customer\"(id,name) SELECT 'race-client-'||n,'Race '||n FROM generate_series(1,6)n; INSERT INTO \"Product\"(id,name,stock) SELECT 'race-product-'||n,'Test',100 FROM generate_series(1,6)n;")
def complete(i):
    return sql(f"INSERT INTO \"Order\"(id,\"customerId\",product,\"productId\",quantity,status,\"totalAmount\",\"createdAt\") VALUES('race-order-{i}','race-client-{i}','Test','race-product-{i}',6,'PENDING',600,clock_timestamp());")
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results=list(pool.map(complete,range(1,7)))
assert all(r.returncode==0 for r in results),[r.stderr for r in results]
assert ok(f"SELECT count(*) FILTER(WHERE benefit='PRIZE'),count(*) FILTER(WHERE benefit='DISCOUNT') FROM \"PromoParticipant\" WHERE campaign_id='{cid}';")=='5|1'
ok("UPDATE \"Order\" SET status='DELIVERED' WHERE id LIKE 'race-order-%';")
people=ok(f"SELECT id FROM \"PromoParticipant\" WHERE campaign_id='{cid}' AND benefit='PRIZE' ORDER BY completion_rank LIMIT 2;").splitlines()
prize=ok(f"SELECT id FROM \"PromoPrize\" WHERE campaign_id='{cid}' ORDER BY position LIMIT 1;")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(lambda pid:sql(f"SELECT public.promo_deliver_prize('{pid}','{prize}');"),people))
assert sum(r.returncode==0 for r in results)==1,[r.stderr for r in results]
pid,customer=ok(f"SELECT id,customer_id FROM \"PromoParticipant\" WHERE campaign_id='{cid}' AND benefit='DISCOUNT';").split('|')
product=customer.replace('client','product')
def next_order(i):
    return sql(f"INSERT INTO \"Order\"(id,\"customerId\",product,\"productId\",quantity,\"totalAmount\",\"createdAt\") VALUES('race-discount-{i}','{customer}','Test','{product}',2,200,clock_timestamp());")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(next_order,range(2)))
assert all(r.returncode==0 for r in results),[r.stderr for r in results]
assert ok("SELECT count(*) FILTER(WHERE \"promoDiscountPercent\"=10),sum(\"totalAmount\") FROM \"Order\" WHERE id LIKE 'race-discount-%';")=='1|380'
print('PASS: six simultaneous pending completions reserve five prizes; one prize cannot be delivered twice; two simultaneous purchases consume one coupon.')
