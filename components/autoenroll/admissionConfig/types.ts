import * as DocumentPicker from "expo-document-picker";

// Per-row editable state in the Admission Config apply table.
export interface AdmissionRowState {
  selected: boolean;
  file: DocumentPicker.DocumentPickerAsset | null;
  startDate?: Date;
  endDate?: Date;
  /** Roll Start toggle: true = AUTO (no manual roll), false = manual number. */
  rollAuto: boolean;
  rollStart: string;
  /** Custom Student ID toggle: false = OFF (auto), true = ON (manual prefix). */
  customStudentId: boolean;
  studentIdPrefix: string;
  studentIdStart: string;
  examEnabled: boolean;
  examDate?: Date;
}
