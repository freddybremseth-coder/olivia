import { isSupabaseConfigured, supabase } from './supabaseClient';

export type CommerceAttention = {
  id: string;
  event_type: 'order_process'|'order_ready_to_ship'|'invoice_overdue'|'invoice_due_soon'|string;
  title: string;
  body: string;
  severity: 'info'|'warning'|'critical'|string;
  status: string;
  related_order_id?: string;
  related_customer_id?: string;
  payload?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
};

export async function fetchCommerceAttention(): Promise<CommerceAttention[]> {
  if (!isSupabaseConfigured) return [];
  const { error: refreshError } = await supabase.rpc('refresh_commerce_attention');
  if (refreshError) console.warn('[commerceAttention] refresh failed', refreshError);

  const { data, error } = await supabase
    .from('commerce_notifications')
    .select('id,event_type,title,body,severity,status,related_order_id,related_customer_id,payload,created_at,read_at')
    .in('event_type',['order_process','order_ready_to_ship','invoice_overdue','invoice_due_soon'])
    .in('status',['new','read'])
    .order('created_at',{ascending:false})
    .limit(30);
  if (error) throw error;
  return (data||[]) as CommerceAttention[];
}

export async function markCommerceAttentionRead(id:string){
  if(!isSupabaseConfigured)return;
  const {error}=await supabase.from('commerce_notifications').update({status:'read',read_at:new Date().toISOString()}).eq('id',id);
  if(error)throw error;
}
