import type { Terminverwaltung, Kundenstamm, Monteure } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface TerminverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Terminverwaltung | null;
  onEdit: (record: Terminverwaltung) => void;
  kundenstammList: Kundenstamm[];
  monteureList: Monteure[];
}

export function TerminverwaltungViewDialog({ open, onClose, record, onEdit, kundenstammList, monteureList }: TerminverwaltungViewDialogProps) {
  function getKundenstammDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenstammList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getMonteureDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return monteureList.find(r => r.record_id === id)?.fields.monteur_vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terminverwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum und Uhrzeit</Label>
            <p className="text-sm">{formatDate(record.fields.termin_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auftragsart</Label>
            <Badge variant="secondary">{record.fields.auftragsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung der Aufgabe</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenstammDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Monteur</Label>
            <p className="text-sm">{getMonteureDisplayName(record.fields.monteur)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.TERMINVERWALTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}