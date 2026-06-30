import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichTerminverwaltung } from '@/lib/enrich';
import type { EnrichedTerminverwaltung } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDateTime } from '@/lib/formatters';
import { lookupKey } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconCalendar, IconAlertTriangle, IconClock, IconUser, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { de } from 'date-fns/locale';
import { format, parseISO, isToday, isBefore, startOfToday, startOfTomorrow, isTomorrow } from 'date-fns';
import {
  CalendarWidget,
  type CalendarEvent,
} from '@/components/widgets/CalendarWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { TerminverwaltungDialog } from '@/components/dialogs/TerminverwaltungDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a43dc2b5d179e3e5df98bb2';
const REPAIR_ENDPOINT = '/claude/build/repair';

function toneForTermin(t: EnrichedTerminverwaltung): CalendarEvent['tone'] {
  const key = lookupKey(t.fields.auftragsart);
  const status = lookupKey(t.fields.status);
  if (status === 'erledigt') return 'success';
  if (key === 'notdienst') return 'destructive';
  if (t.fields.termin_datum && isBefore(parseISO(t.fields.termin_datum), startOfToday()) && status !== 'erledigt') return 'warning';
  if (key === 'reparatur') return 'warning';
  return 'primary';
}

export default function DashboardOverview() {
  const {
    kundenstamm, setKundenstamm, monteure, terminverwaltung, setTerminverwaltung,
    kundenstammMap, monteureMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<{ type: string; id: string }>();

  const [filter, setFilter] = useState<'all' | 'offen' | 'notdienst' | 'heute'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Partial<EnrichedTerminverwaltung['fields']> | undefined>();
  const [editRecord, setEditRecord] = useState<EnrichedTerminverwaltung | null>(null);

  const enrichedTermine = useMemo(
    () => enrichTerminverwaltung(terminverwaltung, { kundenstammMap, monteureMap }),
    [terminverwaltung, kundenstammMap, monteureMap]
  );

  const today = format(clock, 'yyyy-MM-dd');

  const offeneTermine = useMemo(
    () => enrichedTermine.filter(t => lookupKey(t.fields.status) !== 'erledigt' && lookupKey(t.fields.status) !== 'verschoben'),
    [enrichedTermine]
  );

  const ueberfaellige = useMemo(
    () => enrichedTermine.filter(t => {
      if (!t.fields.termin_datum) return false;
      const status = lookupKey(t.fields.status);
      return isBefore(parseISO(t.fields.termin_datum), startOfToday()) && status !== 'erledigt';
    }),
    [enrichedTermine, today]
  );

  const heutigeTermine = useMemo(
    () => enrichedTermine.filter(t => {
      if (!t.fields.termin_datum) return false;
      return isToday(parseISO(t.fields.termin_datum));
    }),
    [enrichedTermine, today]
  );

  const notdienste = useMemo(
    () => enrichedTermine.filter(t => lookupKey(t.fields.auftragsart) === 'notdienst' && lookupKey(t.fields.status) !== 'erledigt'),
    [enrichedTermine]
  );

  const morgigeTermine = useMemo(
    () => enrichedTermine.filter(t => {
      if (!t.fields.termin_datum) return false;
      return isTomorrow(parseISO(t.fields.termin_datum));
    }),
    [enrichedTermine, today]
  );

  const markErledigt = useCallback(async (termin: EnrichedTerminverwaltung) => {
    const prev = [...terminverwaltung];
    const erledigtVal: import('@/types/app').LookupValue = { key: 'erledigt', label: 'Erledigt' };
    const offenVal: import('@/types/app').LookupValue = { key: 'offen', label: 'Offen' };
    setTerminverwaltung(prev.map(t =>
      t.record_id === termin.record_id
        ? { ...t, fields: { ...t.fields, status: erledigtVal } }
        : t
    ));
    undoToast(`${termin.kundeName || 'Termin'} als erledigt markiert`, () => {
      setTerminverwaltung(prev.map(t =>
        t.record_id === termin.record_id
          ? { ...t, fields: { ...t.fields, status: offenVal } }
          : t
      ));
      void LivingAppsService.updateTerminverwaltungEntry(termin.record_id, { status: 'offen' }).catch(() => fetchAll());
    });
    try {
      await LivingAppsService.updateTerminverwaltungEntry(termin.record_id, { status: 'erledigt' });
    } catch {
      setTerminverwaltung(prev);
      fetchAll();
    }
  }, [terminverwaltung, setTerminverwaltung, fetchAll]);

  const filteredEvents = useMemo((): CalendarEvent[] => {
    const source = filter === 'all' ? enrichedTermine
      : filter === 'offen' ? offeneTermine
      : filter === 'notdienst' ? notdienste
      : heutigeTermine;

    return source
      .filter(t => !!t.fields.termin_datum)
      .map(t => ({
        id: `termin:${t.record_id}`,
        start: t.fields.termin_datum!,
        title: t.kundeName || 'Kein Kunde',
        subtitle: t.fields.auftragsart?.label,
        tone: toneForTermin(t),
      }));
  }, [enrichedTermine, offeneTermine, notdienste, heutigeTermine, filter]);

  const currentRecord = useMemo(() => {
    if (!overlay.top) return null;
    return enrichedTermine.find(t => t.record_id === overlay.top!.id) ?? null;
  }, [overlay.top, enrichedTermine]);

  const contextLine = useMemo(() => {
    if (heutigeTermine.length === 0 && ueberfaellige.length === 0) {
      return 'Heute sind keine Termine geplant.';
    }
    const parts: string[] = [];
    if (heutigeTermine.length > 0) {
      const kundenNamen = heutigeTermine.map(t => t.kundeName).filter(Boolean) as string[];
      parts.push(`Heute: ${namen(kundenNamen)}`);
    }
    if (ueberfaellige.length > 0) {
      const ueNamen = ueberfaellige.map(t => t.kundeName).filter(Boolean) as string[];
      parts.push(`${ueberfaellige.length} überfällig (${namen(ueNamen)})`);
    }
    return parts.join(' · ');
  }, [heutigeTermine, ueberfaellige]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const heroTermin = ueberfaellige.length > 0 ? ueberfaellige[0] : null;
  const heroNamen = namen(ueberfaellige.map(t => t.kundeName).filter(Boolean) as string[]);

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground truncate max-w-lg">{contextLine}</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setCreateDefaults(undefined); setCreateOpen(true); }}
          className="shrink-0"
        >
          <IconPlus size={16} className="mr-1 shrink-0" />
          Neuer Termin
        </Button>
      </div>

      <DashboardGrid
        hero={
          heroTermin && ueberfaellige.length > 0 ? (
            <HeroBanner
              tone="destructive"
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: 'Als erledigt markieren',
                onClick: () => markErledigt(heroTermin),
              }}
            >
              <b>{heroNamen}</b> {ueberfaellige.length === 1 ? 'hat einen überfälligen Termin' : `und ${ueberfaellige.length - 1} weitere haben überfällige Termine`} — bitte jetzt abarbeiten.
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatCardRow>
            <StatCard
              title="Offen"
              value={offeneTermine.length}
              description={offeneTermine.length === 0 ? 'Alles erledigt' : 'Ausstehende Termine'}
              icon={<IconCalendar size={18} className="text-muted-foreground" />}
              tone={offeneTermine.length > 0 ? 'primary' : 'default'}
              onClick={() => setFilter(f => f === 'offen' ? 'all' : 'offen')}
              active={filter === 'offen'}
            />
            <StatCard
              title="Heute"
              value={heutigeTermine.length}
              description={heutigeTermine.length === 0 ? 'Keine Termine heute' : 'Termine für heute'}
              icon={<IconClock size={18} className="text-muted-foreground" />}
              tone={heutigeTermine.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilter(f => f === 'heute' ? 'all' : 'heute')}
              active={filter === 'heute'}
            />
            <StatCard
              title="Notdienste"
              value={notdienste.length}
              description={notdienste.length === 0 ? 'Kein Notdienst aktiv' : 'Dringend bearbeiten'}
              icon={<IconTool size={18} className="text-muted-foreground" />}
              tone={notdienste.length > 0 ? 'destructive' : 'default'}
              onClick={() => setFilter(f => f === 'notdienst' ? 'all' : 'notdienst')}
              active={filter === 'notdienst'}
            />
            <StatCard
              title="Monteure"
              value={monteure.length}
              description={monteure.length === 0 ? 'Noch keine Monteure' : 'Im Team'}
              icon={<IconUser size={18} className="text-muted-foreground" />}
              tone="default"
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title="Heute & Überfällige"
              icon={<IconAlertCircle size={14} />}
              items={[...ueberfaellige, ...heutigeTermine.filter(t => !ueberfaellige.find(u => u.record_id === t.record_id))]
                .sort((a, b) => {
                  const da = a.fields.termin_datum ?? '';
                  const db = b.fields.termin_datum ?? '';
                  return da.localeCompare(db);
                })
                .map(t => {
                  const isUeberfaellig = ueberfaellige.some(u => u.record_id === t.record_id);
                  return {
                    id: t.record_id,
                    title: t.kundeName || 'Kein Kunde',
                    secondLine: (
                      <>
                        {isUeberfaellig
                          ? <span className="font-medium text-destructive">Überfällig</span>
                          : <span className="font-medium text-amber-600">Heute</span>}
                        {' · '}
                        <span className="text-muted-foreground">{t.fields.auftragsart?.label ?? '—'}</span>
                        {t.monteurName ? <> · <span className="text-muted-foreground">{t.monteurName}</span></> : null}
                      </>
                    ),
                    action: lookupKey(t.fields.status) !== 'erledigt' ? {
                      label: '✓ Erledigt',
                      onClick: () => markErledigt(t),
                    } : undefined,
                  };
                })
              }
              onItemClick={id => overlay.replace({ type: 'termin', id })}
              empty={{
                text: morgigeTermine.length > 0
                  ? `Nächste Termine morgen: ${namen(morgigeTermine.map(t => t.kundeName).filter(Boolean) as string[])}`
                  : 'Keine überfälligen oder heutigen Termine.',
                action: { label: 'Neuer Termin', onClick: () => { setCreateDefaults(undefined); setCreateOpen(true); } },
              }}
            />

            <WorkList
              title="Morgen"
              icon={<IconCalendar size={14} />}
              items={morgigeTermine.map(t => ({
                id: t.record_id,
                title: t.kundeName || 'Kein Kunde',
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{t.fields.termin_datum ? format(parseISO(t.fields.termin_datum), 'HH:mm') : '—'}</span>
                    {' · '}
                    <span className="text-muted-foreground">{t.fields.auftragsart?.label ?? '—'}</span>
                  </>
                ),
              }))}
              onItemClick={id => overlay.replace({ type: 'termin', id })}
              empty={{
                text: enrichedTermine.length === 0 ? 'Noch keine Termine erfasst.' : 'Morgen sind keine Termine geplant.',
                action: { label: 'Termin anlegen', onClick: () => { setCreateDefaults(undefined); setCreateOpen(true); } },
              }}
            />
          </>
        }
        primary={
          <CalendarWidget
            events={filteredEvents}
            locale={de}
            defaultView="week"
            weekDays={5}
            dayStartHour={7}
            dayEndHour={19}
            onEventClick={ev => {
              const id = ev.id.split(':')[1] ?? '';
              overlay.replace({ type: 'termin', id });
            }}
            onEventDrop={async (eventId, newStart) => {
              const id = eventId.split(':')[1] ?? '';
              const termin = terminverwaltung.find(t => t.record_id === id);
              if (!termin) return;
              const prevTermin = { ...termin };
              setTerminverwaltung(prev =>
                prev.map(t =>
                  t.record_id === id
                    ? { ...t, fields: { ...t.fields, termin_datum: newStart.slice(0, 16) } }
                    : t
                )
              );
              undoToast('Termin verschoben', () => {
                setTerminverwaltung(prev =>
                  prev.map(t =>
                    t.record_id === id
                      ? { ...t, fields: { ...t.fields, termin_datum: prevTermin.fields.termin_datum } }
                      : t
                  )
                );
                void LivingAppsService.updateTerminverwaltungEntry(id, { termin_datum: prevTermin.fields.termin_datum }).catch(() => fetchAll());
              });
              try {
                await LivingAppsService.updateTerminverwaltungEntry(id, { termin_datum: newStart.slice(0, 16) });
              } catch {
                setTerminverwaltung(prev =>
                  prev.map(t =>
                    t.record_id === id
                      ? { ...t, fields: { ...t.fields, termin_datum: prevTermin.fields.termin_datum } }
                      : t
                  )
                );
                fetchAll();
              }
            }}
            onEmptyClick={date => {
              setCreateDefaults({ termin_datum: format(date, "yyyy-MM-dd'T'HH:mm") });
              setCreateOpen(true);
            }}
          />
        }
      />

      {/* Detail-Overlay */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onEdit={currentRecord ? () => {
          setEditRecord(currentRecord);
          overlay.close();
        } : undefined}
        ariaLabel="Termin"
        footer={
          currentRecord && lookupKey(currentRecord.fields.status) !== 'erledigt' ? (
            <Button
              size="sm"
              onClick={() => { markErledigt(currentRecord); overlay.close(); }}
            >
              <IconCheck size={14} className="mr-1" />
              Als erledigt markieren
            </Button>
          ) : undefined
        }
      >
        {currentRecord && (
          <>
            <RecordHeader
              title={currentRecord.kundeName || 'Kein Kunde'}
              subtitle={currentRecord.fields.auftragsart?.label}
              meta={formatDateTime(currentRecord.fields.termin_datum)}
              badges={currentRecord.fields.status ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  lookupKey(currentRecord.fields.status) === 'erledigt' ? 'bg-green-100 text-green-800' :
                  lookupKey(currentRecord.fields.status) === 'verschoben' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>{currentRecord.fields.status.label}</span>
              ) : undefined}
            />
            <RecordSection title="Termin-Details" cols={2}>
              <RecordField label="Datum & Uhrzeit" value={currentRecord.fields.termin_datum} format="datetime" />
              <RecordField label="Auftragsart" value={currentRecord.fields.auftragsart?.label} />
              <RecordField label="Monteur" value={currentRecord.monteurName || '—'} />
              <RecordField label="Status" value={currentRecord.fields.status?.label} />
            </RecordSection>
            {currentRecord.fields.beschreibung && (
              <RecordSection title="Beschreibung">
                <RecordField label="Aufgabe" value={currentRecord.fields.beschreibung} format="longtext" />
              </RecordSection>
            )}
            {currentRecord.fields.bemerkungen && (
              <RecordSection title="Bemerkungen">
                <RecordField label="Bemerkungen" value={currentRecord.fields.bemerkungen} format="longtext" />
              </RecordSection>
            )}
            <RecordAttachments appId={APP_IDS.TERMINVERWALTUNG} recordId={currentRecord.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Create Dialog */}
      <TerminverwaltungDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateDefaults(undefined); }}
        onSubmit={async fields => {
          await LivingAppsService.createTerminverwaltungEntry(fields);
          fetchAll();
        }}
        defaultValues={createDefaults}
        kundenstammList={kundenstamm}
        monteureList={monteure}
        enablePhotoScan={AI_PHOTO_SCAN['Terminverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Terminverwaltung']}
      />

      {/* Edit Dialog */}
      {editRecord && (
        <TerminverwaltungDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={async fields => {
            await LivingAppsService.updateTerminverwaltungEntry(editRecord.record_id, fields);
            fetchAll();
          }}
          defaultValues={editRecord.fields}
          recordId={editRecord.record_id}
          kundenstammList={kundenstamm}
          monteureList={monteure}
          enablePhotoScan={AI_PHOTO_SCAN['Terminverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Terminverwaltung']}
        />
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
