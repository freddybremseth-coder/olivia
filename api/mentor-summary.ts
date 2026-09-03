import type { IncomingMessage, ServerResponse } from 'http';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buildIrrigationAdvice } from '../services/irrigationAdvisor';
import type { IrrigationEvent, SensorAlert, SensorReading } from '../types/farmIoT';

function bearerToken(req: IncomingMessage): string {
  const auth = String(req.headers.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function unauthorized(res: ServerResponse) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

function severityRank(value: string | undefined): number {
  if (value === 'critical') return 4;
  if (value === 'warning') return 3;
  if (value === 'watch') return 2;
  return 1;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = String(process.env.OLIVIA_MENTOR_API_KEY || '').trim();
  const supplied = bearerToken(req);
  if (!apiKey || !supplied || !safeEqual(apiKey, supplied)) {
    unauthorized(res);
    return;
  }

  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = String(
    process.env.OLIVIA_MENTOR_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ).trim();
  if (!url || !serviceKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Olivia mentor summary is not configured' }));
    return;
  }

  try {
    const supabase = createClient(url, serviceKey, {
      db: { schema: 'olivia' },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [zonesRes, readingsRes, alertsRes, irrigationRes, observationsRes] = await Promise.all([
      supabase.from('farm_zones').select('id,name').order('name', { ascending: true }),
      supabase.from('sensor_readings').select('*').order('measured_at', { ascending: false }).limit(250),
      supabase.from('sensor_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false }).limit(50),
      supabase.from('irrigation_events').select('*').order('started_at', { ascending: false }).limit(50),
      supabase.from('farm_observations').select('id,zone_id,observation_type,severity,notes,observed_at').order('observed_at', { ascending: false }).limit(20),
    ]);

    const warnings: string[] = [];
    for (const [label, result] of [
      ['farm_zones', zonesRes],
      ['sensor_readings', readingsRes],
      ['sensor_alerts', alertsRes],
      ['irrigation_events', irrigationRes],
      ['farm_observations', observationsRes],
    ] as const) {
      if (result.error) warnings.push(`${label}: ${result.error.message}`);
    }

    const readings = (readingsRes.data || []) as SensorReading[];
    const alerts = (alertsRes.data || []) as SensorAlert[];
    const irrigationEvents = (irrigationRes.data || []) as IrrigationEvent[];
    const zoneNames = Object.fromEntries((zonesRes.data || []).map((row) => [String(row.id), String(row.name || row.id)]));
    const irrigationAdvice = buildIrrigationAdvice({ readings, irrigationEvents, zoneNames });
    const topAdvice = irrigationAdvice.slice(0, 5);
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical');
    const warningAlerts = alerts.filter((alert) => alert.severity === 'warning');

    const alertSeverity = criticalAlerts.length ? 'critical' : warningAlerts.length ? 'warning' : 'optimal';
    const adviceSeverity = topAdvice[0]?.severity || 'optimal';
    const topSeverity = severityRank(alertSeverity) >= severityRank(adviceSeverity) ? alertSeverity : adviceSeverity;
    const learningOpportunity = topAdvice.find((item) => item.action === 'check_salinity')
      ? 'salinity_management'
      : topAdvice.find((item) => item.action === 'irrigate_evening' || item.action === 'monitor')
        ? 'irrigation_and_water_balance'
        : null;

    res.statusCode = 200;
    res.end(JSON.stringify({
      source: 'olivia_farm_advisor',
      generatedAt: new Date().toISOString(),
      farmStatus: topSeverity,
      openAlerts: {
        total: alerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
      },
      irrigationAdvice: topAdvice,
      recentObservations: observationsRes.data || [],
      learningOpportunity,
      warnings,
      safety: {
        readOnly: true,
        persistAsPersonalMemory: false,
        outboundActions: false,
      },
    }));
  } catch (error) {
    console.error('[Olivia Mentor Summary]', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Mentor summary failed' }));
  }
}
