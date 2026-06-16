import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FileItem, StorageInfo } from '../../services/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './files.html',
  styleUrl: './files.css',
})
export class FilesComponent implements OnInit {
  files: FileItem[] = [];
  storageUsed = 0;
  storageAvailable = 0;
  storageLimit = 2 * 1024 * 1024 * 1024;
  loading = false;
  uploading = false;
  error = '';
  success = '';
  phone = '';
  dragOver = false;

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const data: StorageInfo = await this.api.getFiles();
      this.files = data.files;
      this.storageUsed = data.storage_used;
      this.storageAvailable = data.storage_available;
      this.storageLimit = data.storage_limit;
    } catch {
      this.error = 'Error al cargar archivos';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get usedPercent(): number {
    return Math.min(100, (this.storageUsed / this.storageLimit) * 100);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile(input.files[0]);
      input.value = '';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave() {
    this.dragOver = false;
  }

  async uploadFile(file: File) {
    this.uploading = true;
    this.error = '';
    this.success = '';
    try {
      await this.api.uploadFile(file, this.phone);
      this.success = `"${file.name}" subido correctamente`;
      await this.load();
    } catch (err: any) {
      this.error = err?.error?.detail || 'Error al subir el archivo';
    } finally {
      this.uploading = false;
    }
  }

  async download(filename: string) {
    this.error = '';
    this.success = '';
    try {
      const res = await this.api.getDownloadUrl(filename);
      const a = document.createElement('a');
      a.href = res.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    } catch {
      this.error = 'Error al obtener enlace de descarga';
    }
  }

  getExt(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return ext.length > 4 ? ext.slice(0, 4) : ext;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async deleteFile(filename: string) {
    if (!confirm(`¿Eliminar "${filename}"?`)) return;
    this.error = '';
    this.success = '';
    try {
      await this.api.deleteFile(filename);
      this.success = `"${filename}" eliminado`;
      await this.load();
    } catch {
      this.error = 'Error al eliminar el archivo';
      this.cdr.detectChanges();
    }
  }
}
