export interface CashbackEntry {
  id: string;
  bankName: string;
  category: string;
  percentage: number;
  originalText?: string;
}

export interface ProcessingStatus {
  total: number;
  processed: number;
  isProcessing: boolean;
  error?: string;
}

export enum ParseStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}