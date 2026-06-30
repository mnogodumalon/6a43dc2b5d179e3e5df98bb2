import type { EnrichedTerminverwaltung } from '@/types/enriched';
import type { Kundenstamm, Monteure, Terminverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface TerminverwaltungMaps {
  kundenstammMap: Map<string, Kundenstamm>;
  monteureMap: Map<string, Monteure>;
}

export function enrichTerminverwaltung(
  terminverwaltung: Terminverwaltung[],
  maps: TerminverwaltungMaps
): EnrichedTerminverwaltung[] {
  return terminverwaltung.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenstammMap, 'vorname', 'nachname'),
    monteurName: resolveDisplay(r.fields.monteur, maps.monteureMap, 'monteur_vorname'),
  }));
}
