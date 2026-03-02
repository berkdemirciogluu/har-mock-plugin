/** Storage inject kaydı — localStorage veya sessionStorage'a yazılacak key-value çifti */
export interface StorageEntry {
  readonly key: string;
  readonly value: string;
  readonly type: 'localStorage' | 'sessionStorage';
}
