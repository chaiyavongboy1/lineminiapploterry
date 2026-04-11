// ==========================================
// LINE Mini App — Lottery Purchase Types
// ==========================================

// ---- User ----
export interface User {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status_message: string | null;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
  // Relations
  user_profile?: UserProfile;
}

// ---- Lottery Type ----
export interface LotteryType {
  id: string;
  name: string;
  description: string | null;
  price_per_line: number;
  service_fee: number;
  max_number: number;
  max_special_number: number | null;
  numbers_to_pick: number;
  special_numbers_to_pick: number;
  draw_days: string[];
  next_draw_date: string | null;
  estimated_jackpot: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

// ---- Order ----
export type OrderStatus =
  | 'pending_payment'
  | 'pending_slip'
  | 'pending_review'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  lottery_type_id: string;
  draw_date: string;
  total_lines: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  status: OrderStatus;
  admin_note: string | null;
  ticket_image: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  purchased_at: string | null;  // วันเวลาที่ซื้อสำเร็จ (status = completed)
  created_at: string;
  updated_at: string;
  // Relations (optional, populated by join)
  lottery_type?: LotteryType;
  order_lines?: OrderLine[];
  payment_slips?: PaymentSlip[];
  ticket_images?: TicketImage[];
  prize_transfer_slips?: PrizeTransferSlip[];
  user?: User;
}

// ---- Order Line ----
export interface OrderLine {
  id: string;
  order_id: string;
  line_number: number;
  numbers: number[];
  special_number: number | null;
  is_quick_pick: boolean;
  created_at: string;
}

// ---- Payment Slip ----
export interface PaymentSlip {
  id: string;
  order_id: string;
  slip_image_url: string;
  amount: number | null;
  transfer_date: string | null;
  bank_name: string | null;
  uploaded_at: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
}

// ---- Draw Result ----
export interface DrawResult {
  id: string;
  lottery_type_id: string;
  draw_date: string;
  winning_numbers: number[];
  special_number: number | null;
  jackpot_amount: string | null;
  is_manual: boolean;
  created_at: string;
  lottery_type?: LotteryType;
}

// ---- Prize Tier ----
export interface PrizeTier {
  id: string;
  lottery_type_id: string;
  match_count: number;
  match_special: boolean;
  prize_name: string;
  prize_amount: number | null;
  tier_order: number;
}

// ---- User Profile (Banking) ----
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  promptpay_number: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Ticket Image (Multi-image) ----
export interface TicketImage {
  id: string;
  order_id: string;
  image_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

// ---- Prize Transfer Slip ----
export interface PrizeTransferSlip {
  id: string;
  order_id: string;
  draw_result_id: string | null;
  image_url: string;
  transfer_amount: number | null;
  transfer_note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

// ---- Order Line Result ----
export interface OrderLineResult {
  id: string;
  order_line_id: string;
  draw_result_id: string;
  matched_numbers: number[];
  matched_special: boolean;
  match_count: number;
  prize_tier_id: string | null;
  prize_amount: number;
  is_winner: boolean;
  checked_at: string;
  // Relations
  order_line?: OrderLine;
  draw_result?: DrawResult;
  prize_tier?: PrizeTier;
}

// ---- LINE Profile ----
export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// ---- API Response ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Cart / Selection State ----
export interface NumberSelection {
  lineNumber: number;
  numbers: number[];
  specialNumber: number | null;
  isQuickPick: boolean;
}

export interface CartItem {
  lotteryType: LotteryType;
  selections: NumberSelection[];
  drawDate: string;
}

// ---- Order Status Labels ----
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'รอชำระเงิน',
  pending_slip: 'รอแนบสลิป',
  pending_review: 'รอตรวจสอบ',
  approved: 'ยืนยันการจ่าย',
  completed: 'ซื้อสินค้าแล้ว',
  rejected: 'ปฏิเสธการจ่าย',
  cancelled: 'ยกเลิก',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#f59e0b',
  pending_slip: '#3b82f6',
  pending_review: '#8b5cf6',
  approved: '#2563eb',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
};
