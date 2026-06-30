import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Terminverwaltung, Kundenstamm, Monteure } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { TerminverwaltungDialog } from '@/components/dialogs/TerminverwaltungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Terminverwaltung';
import { evalComputed } from '@/config/form-enhancements/types';

export default function TerminverwaltungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Terminverwaltung | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kundenstammList, setKundenstammList] = useState<Kundenstamm[]>([]);
  const [monteureList, setMonteureList] = useState<Monteure[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kundenstammData, monteureData] = await Promise.all([
        LivingAppsService.getTerminverwaltung(),
        LivingAppsService.getKundenstamm(),
        LivingAppsService.getMonteure(),
      ]);
      setKundenstammList(kundenstammData);
      setMonteureList(monteureData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Terminverwaltung['fields']) {
    if (!record) return;
    await LivingAppsService.updateTerminverwaltungEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteTerminverwaltungEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/terminverwaltung');
  }

  function getKundenstammDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenstammList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  function getMonteureDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return monteureList.find(r => r.record_id === refId)?.fields.monteur_vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/terminverwaltung')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/terminverwaltung')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={'Terminverwaltung'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kunde: kundenstammList,
          monteur: monteureList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Datum und Uhrzeit" value={record.fields.termin_datum} format="datetime" />
        <RecordField label="Auftragsart" value={record.fields.auftragsart} format="pill" />
        <RecordField label="Beschreibung der Aufgabe" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Kunde" value={getKundenstammDisplayName(record.fields.kunde)} format="text" />
        <RecordField label="Monteur" value={getMonteureDisplayName(record.fields.monteur)} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.TERMINVERWALTUNG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <TerminverwaltungDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kundenstammList={kundenstammList}
        monteureList={monteureList}
        enablePhotoScan={AI_PHOTO_SCAN['Terminverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Terminverwaltung']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Terminverwaltung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
