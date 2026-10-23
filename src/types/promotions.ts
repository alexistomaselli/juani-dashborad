export interface Promotion {
  id: string; name: string; status: 'DRAFT' | 'ACTIVE' | 'ENDED'; starts_on: string; ends_on: string | null;
  closed_at: string | null; target: number; prize_limit: number; discount_percent: number;
}
export interface PromotionOrder {
  order_id: string; order_number: number | null; product_name: string; quantity: number;
  confirmed: number; pending: number; order_status: string; ordered_at: string; historical: boolean;
}
export interface Participant {
  id: string; customer_id: string; customer_name: string; confirmed: number; pending: number;
  completed_at: string | null; completion_rank: number | null; benefit: 'PRIZE' | 'DISCOUNT' | null;
  benefit_status: 'PENDING' | 'USED' | 'REVIEW' | null; prize_slot: number | null;
  used_order_id: string | null; used_at: string | null; keychain_delivered_at: string | null;
  pieces_delivered: number; orders: PromotionOrder[];
}
export interface Prize {
  id: string; name: string; position: number; image_url: string | null; participant_id: string | null;
  delivered_at: string | null; customer_name: string | null;
}
export interface PromotionDashboard { campaign: Promotion; participants: Participant[]; prizes: Prize[]; events: { id: number; event: string; created_at: string }[] }
export interface PromotionPreview {
  snapshot: string; orders: number; confirmed: number; pending: number; unlinked: number;
  participants: { customer_id: string | null; customer_name: string | null; confirmed: number; pending: number; orders: Pick<PromotionOrder, 'order_number' | 'product_name' | 'quantity' | 'order_status'>[] }[];
}
