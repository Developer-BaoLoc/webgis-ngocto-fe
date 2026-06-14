export interface LayerIconUpload {
  attachmentId: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AttachmentRef {
  attachmentId: string;
  url?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface FieldAssetUpload extends AttachmentRef {}

export interface FieldAssetBatchUpload {
  items: FieldAssetUpload[];
  count: number;
}
