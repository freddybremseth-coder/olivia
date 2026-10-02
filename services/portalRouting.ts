export type PortalMode = 'b2b' | 'olivia';
export function portalForPath(path: string): PortalMode | null {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/b2b') return 'b2b';
  if (normalized === '/olivia' || normalized === '/app') return 'olivia';
  return null;
}
export function resolvePortalNavigation(target: string, role: string, currentPortal: PortalMode) {
  const internal = role === 'farmer' || role === 'super_admin';
  const portal: PortalMode = !internal || target === 'b2b_portal'
    ? 'b2b' : target === 'settings' ? currentPortal : 'olivia';
  const tab = portal === 'b2b' ? (target === 'settings' ? 'settings' : 'b2b_portal')
    : target === 'admin' && role !== 'super_admin' ? 'dashboard' : target;
  return { tab, portal, path: portal === 'b2b' ? '/b2b' : '/olivia' };
}
