import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2, Plus, Layers } from 'lucide-react';
import { DocumentItem } from '../types/document';
import { apiService } from '../services/api';

interface PdfUploaderProps {
  onUploadSuccess?: (documents: DocumentItem[]) => void;
  onGuestUpload?: (files: File[], title?: string) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<DocumentItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    // 1. Check extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return `"${file.name}" is not a PDF. Please select valid PDF files.`;
    }
    // 2. Check MIME type if present
    if (file.type && file.type !== 'application/pdf') {
      return `"${file.name}" is not a valid PDF file.`;
    }
    // 3. Check file size
    if (file.size === 0) {
      return `"${file.name}" is empty (0 bytes). Please select a valid PDF.`;
    }
    if (file.size > 50 * 1024 * 1024) {
      return `"${file.name}" exceeds the 50MB file size limit.`;
    }
    return null;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    setErrorMessage(null);
    const filesToAdd = Array.from(newFiles);

    if (filesToAdd.length === 0) return;

    if (selectedFiles.length + filesToAdd.length > 3) {
      setErrorMessage('You can upload a maximum of 3 PDFs at a time.');
      return;
    }

    // Validate each file
    for (const file of filesToAdd) {
      const err = validateFile(file);
      if (err) {
        setErrorMessage(err);
        return;
      }
      // Check for duplicate in selectedFiles
      if (selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        setErrorMessage(`"${file.name}" is already selected.`);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...filesToAdd]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least 1 PDF file to upload.');
      return;
    }

    if (selectedFiles.length > 3) {
      setErrorMessage('You can upload a maximum of 3 PDFs at a time.');
      return;
    }

    setErrorMessage(null);
    setStatus('uploading');

    try {
      setTimeout(() => {
        setStatus((current) => (current === 'uploading' ? 'processing' : current));
      }, 500);

      const docs = await apiService.uploadDocuments(
        selectedFiles,
        customTitle.trim() || undefined
      );

      setUploadedDocs(docs);
      setStatus('success');
      if (onUploadSuccess) {
        onUploadSuccess(docs);
      }
    } catch (err: unknown) {
      setStatus('error');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(axiosErr.response?.data?.detail || 'PDF processing failed. Ensure all files contain extractable text.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please check your network connection.');
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetUploader = () => {
    setStatus('idle');
    setErrorMessage(null);
    setSelectedFiles([]);
    setUploadedDocs([]);
    setCustomTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalChunks = uploadedDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  return (
    <div style={{ width: '100%' }}>
      {status === 'success' && uploadedDocs.length > 0 ? (
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-success)', marginBottom: '16px' }}>
            <CheckCircle2 size={22} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-navy)', margin: 0 }}>
              {uploadedDocs.length === 1 ? '1 PDF Processed Successfully' : `${uploadedDocs.length} PDFs Processed Successfully`}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {uploadedDocs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-bg-subtle)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.9rem', display: 'block', wordBreak: 'break-all' }}>{doc.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{doc.filename}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                    {doc.chunk_count} chunks
                  </span>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 500 }}>
                    Indexed
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Total: <strong>{totalChunks} chunks</strong> indexed across {uploadedDocs.length} {uploadedDocs.length === 1 ? 'document' : 'documents'}
            </span>
            <button type="button" onClick={resetUploader} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
              Upload More PDFs
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label" htmlFor="custom-title-input">
              Session / Document Title (Optional)
            </label>
            <input
              id="custom-title-input"
              type="text"
              className="form-input"
              placeholder={
                selectedFiles.length > 1
                  ? 'e.g. Comparative Study or Multi-Document Analysis'
                  : 'e.g. Q3 Financial Report or Machine Learning Notes'
              }
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={status === 'uploading' || status === 'processing'}
            />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf,.pdf"
            multiple
            style={{ display: 'none' }}
          />

          {selectedFiles.length === 0 ? (
            <div
              className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (status !== 'uploading' && status !== 'processing') {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="upload-icon-box">
                {status === 'uploading' || status === 'processing' ? (
                  <div className="spinner spinner-blue" style={{ width: '24px', height: '24px' }} />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>

              {status === 'uploading' && (
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Uploading PDF(s)...</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Sending files to server...</p>
                </div>
              )}

              {status === 'processing' && (
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Processing PDF(s)...</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Extracting text and creating document embeddings...
                  </p>
                </div>
              )}

              {status !== 'uploading' && status !== 'processing' && (
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Upload 1 to 3 PDFs</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Drag &amp; drop 1–3 PDF files here, or click to browse
                  </p>
                  <span
                    className="btn-secondary"
                    style={{ pointerEvents: 'none', display: 'inline-flex', fontSize: '0.825rem', padding: '6px 14px' }}
                  >
                    <FileText size={14} />
                    <span>Choose 1–3 PDFs</span>
                  </span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginTop: '12px' }}>
                    Upload up to 3 text-based PDFs (max 50MB each) to query them simultaneously
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                    Selected PDFs ({selectedFiles.length} of 3 max)
                  </span>
                </div>
                {selectedFiles.length < 3 && status === 'idle' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', gap: '4px' }}
                  >
                    <Plus size={13} />
                    <span>Add PDF ({3 - selectedFiles.length} remaining)</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--color-bg-subtle)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <FileText size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'var(--color-navy)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>

                    {status === 'idle' && (
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="btn-secondary"
                        style={{ padding: '6px', color: 'var(--color-danger)', border: 'none', background: 'transparent' }}
                        title="Remove this file"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {status === 'uploading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div className="spinner spinner-blue" style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Uploading {selectedFiles.length} {selectedFiles.length === 1 ? 'PDF' : 'PDFs'}...
                  </span>
                </div>
              )}

              {status === 'processing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div className="spinner spinner-blue" style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Extracting text and indexing embeddings for {selectedFiles.length} {selectedFiles.length === 1 ? 'document' : 'documents'}...
                  </span>
                </div>
              )}

              {status === 'idle' && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={resetUploader}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem', width: 'auto' }}
                  >
                    <UploadCloud size={16} />
                    <span>
                      Upload &amp; Process {selectedFiles.length} {selectedFiles.length === 1 ? 'PDF' : 'PDFs'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="alert alert-error" style={{ marginTop: '16px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
