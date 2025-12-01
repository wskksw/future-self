export type CardEditIntent = {
  field: string;
  suggestion: string;
  severity?: string;
  summary: string;
  body: string;
  modalCopy?: string;
};
