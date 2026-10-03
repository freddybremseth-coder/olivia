import { isSupabaseConfigured, supabase } from './supabaseClient';

export type CommerceContentTemplate = {
  id: string;
  name: string;
  template_type: string;
  subject?: string;
  body: string;
  locale: string;
  channel: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export async function fetchCommerceTemplates(): Promise<CommerceContentTemplate[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('commerce_content_templates')
    .select('id,name,template_type,subject,body,locale,channel,status,created_at,updated_at')
    .order('template_type')
    .order('locale');
  if (error) throw error;
  return (data || []) as CommerceContentTemplate[];
}

export async function saveCommerceTemplate(template: CommerceContentTemplate): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { error } = await supabase
    .from('commerce_content_templates')
    .update({
      name: template.name.trim(),
      subject: template.subject?.trim() || null,
      body: template.body,
      locale: template.locale,
      channel: template.channel,
      status: template.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', template.id);
  if (error) throw error;
}
