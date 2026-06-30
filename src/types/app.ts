// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kundenstamm {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    standort?: GeoLocation; // { lat, long, info }
    notizen?: string;
  };
}

export interface Monteure {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    monteur_vorname?: string;
    monteur_nachname?: string;
    monteur_telefon?: string;
    monteur_email?: string;
    monteur_notizen?: string;
  };
}

export interface Terminverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    termin_datum?: string; // Format: YYYY-MM-DD oder ISO String
    auftragsart?: LookupValue;
    beschreibung?: string;
    kunde?: string; // applookup -> URL zu 'Kundenstamm' Record
    monteur?: string; // applookup -> URL zu 'Monteure' Record
    status?: LookupValue;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  KUNDENSTAMM: '6a43dc0ccfb23aec5c0f285d',
  MONTEURE: '6a43dc0f0c642509c50578ea',
  TERMINVERWALTUNG: '6a43dc10e4117afe74f02ece',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'terminverwaltung': {
    auftragsart: [{ key: "wartung", label: "Wartung" }, { key: "reparatur", label: "Reparatur" }, { key: "notdienst", label: "Notdienst" }],
    status: [{ key: "offen", label: "Offen" }, { key: "erledigt", label: "Erledigt" }, { key: "verschoben", label: "Verschoben" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kundenstamm': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'standort': 'geo',
    'notizen': 'string/textarea',
  },
  'monteure': {
    'monteur_vorname': 'string/text',
    'monteur_nachname': 'string/text',
    'monteur_telefon': 'string/tel',
    'monteur_email': 'string/email',
    'monteur_notizen': 'string/textarea',
  },
  'terminverwaltung': {
    'termin_datum': 'date/datetimeminute',
    'auftragsart': 'lookup/radio',
    'beschreibung': 'string/textarea',
    'kunde': 'applookup/select',
    'monteur': 'applookup/select',
    'status': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKundenstamm = StripLookup<Kundenstamm['fields']>;
export type CreateMonteure = StripLookup<Monteure['fields']>;
export type CreateTerminverwaltung = StripLookup<Terminverwaltung['fields']>;