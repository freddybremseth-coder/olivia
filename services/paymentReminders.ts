import { isSupabaseConfigured, supabase } from './supabaseClient';

export type PaymentReminder = {
  id: string;
  invoice_id: string;
  order_id?: string;
  customer_id?: string;
  stage: 'due_soon'|'overdue'|'manual';
  channel: 'portal'|'email'|'external';
  recipient_email?: string;
  subject: string;
  body: string;
  status: 'draft'|'approved'|'sent'|'cancelled';
  amount: number;
  currency: string;
  due_date?: string;
  generated_at: string;
  approved_at?: string;
  sent_at?: string;
  sent_message_id?: string;
  created_at: string;
  updated_at: string;
  invoice?: {
    invoice_number?: string;
    status?: string;
    payment_status?: string;
  };
  customer?: {
    company?: string;
    contact_name?: string;
    email?: string;
  };
};

export async function fetchPaymentReminders(): Promise<PaymentReminder[]> {
  if (!isSupabaseConfigured) return [];
  const { error: refreshError } = await supabase.rpc('refresh_payment_reminder_drafts');
  if (refreshError) console.warn('[paymentReminders] refresh failed', refreshError);

  const { data, error } = await supabase
    .from('commerce_payment_reminders')
    .select('*,commerce_invoices(invoice_number,status,payment_status),commerce_customers(company,contact_name,email)')
    .order('created_at',{ascending:false})
    .limit(100);
  if (error) throw error;

  return (data||[]).map((row:any)=>({
    ...row,
    amount:Number(row.amount||0),
    invoice:Array.isArray(row.commerce_invoices)?row.commerce_invoices[0]:row.commerce_invoices,
    customer:Array.isArray(row.commerce_customers)?row.commerce_customers[0]:row.commerce_customers,
  })) as PaymentReminder[];
}

export async function savePaymentReminderDraft(id:string,subject:string,body:string,recipientEmail?:string){
  if(!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const {data,error}=await supabase
    .from('commerce_payment_reminders')
    .update({
      subject:subject.trim(),
      body:body.trim(),
      recipient_email:recipientEmail?.trim()||null,
      updated_at:new Date().toISOString(),
    })
    .eq('id',id)
    .eq('status','draft')
    .select('id')
    .maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('Bare utkast kan redigeres.');
}

export async function approvePaymentReminder(id:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.rpc('approve_payment_reminder',{p_reminder_id:id});
  if(error)throw error;
}

export async function sendPaymentReminderToPortal(id:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {data,error}=await supabase.rpc('send_payment_reminder_to_portal',{p_reminder_id:id});
  if(error)throw error;
  return String(data||'');
}

export async function markPaymentReminderExternalSent(id:string,channel:'email'|'external'='email'){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.rpc('mark_payment_reminder_external_sent',{p_reminder_id:id,p_channel:channel});
  if(error)throw error;
}

export async function cancelPaymentReminder(id:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {data,error}=await supabase
    .from('commerce_payment_reminders')
    .update({status:'cancelled',updated_at:new Date().toISOString()})
    .eq('id',id)
    .in('status',['draft','approved'])
    .select('id')
    .maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('Denne påminnelsen kan ikke avbrytes.');
}
