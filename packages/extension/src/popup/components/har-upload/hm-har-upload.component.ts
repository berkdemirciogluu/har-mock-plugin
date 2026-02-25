import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { parseHar, parameterize, HarParseError } from '@har-mock/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type { MessageResponse } from '../../../shared/messaging.types';
import type { LoadHarPayload } from '../../../shared/payload.types';

@Component({
  selector: 'hm-har-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hm-har-upload.component.html',
  imports: [CommonModule],
})
export class HarUploadComponent {
  private readonly messaging = inject(ExtensionMessagingService);

  readonly isDragOver = signal(false);
  readonly isLoading = signal(false);
  readonly loadedFileName = signal<string | null>(null);
  readonly endpointCount = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly onEndpointLoaded = output<number>();

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (related && (event.currentTarget as Node)?.contains(related)) {
      return;
    }
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    if (!file.name.endsWith('.har')) {
      this.errorMessage.set('Sadece .har uzantılı dosyalar desteklenir.');
      return;
    }
    this.processFile(file);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.har')) {
      this.errorMessage.set('Sadece .har uzantılı dosyalar desteklenir.');
      return;
    }
    this.processFile(file);
    input.value = '';
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  private processFile(file: File): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    void file
      .text()
      .then((raw) => {
        const harFile = parseHar(raw);
        const patterns = parameterize(harFile.entries);
        const payload: LoadHarPayload = {
          entries: harFile.entries,
          patterns,
          fileName: file.name,
        };
        return this.messaging.sendMessage(MessageType.LOAD_HAR, payload, crypto.randomUUID());
      })
      .then((response: MessageResponse) => {
        if (response.success) {
          this.loadedFileName.set(file.name);
          const count = (response.data as { patternCount: number } | undefined)?.patternCount ?? 0;
          this.endpointCount.set(count);
          this.onEndpointLoaded.emit(count);
        } else {
          this.errorMessage.set(response.error?.message ?? 'Bilinmeyen hata');
        }
      })
      .catch((err: unknown) => {
        if (err instanceof HarParseError) {
          this.errorMessage.set(`${err.type}: ${err.rootCause} \u2014 ${err.suggestedAction}`);
        } else {
          this.errorMessage.set('HAR dosyası işlenirken beklenmeyen hata oluştu.');
        }
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }
}
