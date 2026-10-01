import {useEffect, useRef, useState} from 'react';
import {verificationUrl} from '../api/credentials';
export default function DocumentPreview({id, kind, label, previewUrl, formattedContent}) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let url;
    dialog.current.showModal();
    if (formattedContent) return () => controller.abort();
    fetch(previewUrl || `${verificationUrl(id, kind)}&preview=1`, {credentials:'include', cache:'no-store', signal:controller.signal})
      .then(async response => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || 'Unable to load this document. Please sign in again or retry.');
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        const type = blob.type.split(';')[0];
        const isText = type.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript'].includes(type);
        const text = isText ? await blob.text() : null;
        const bytes = !isText && !type.startsWith('image/') && !type.startsWith('audio/') && !type.startsWith('video/') && type !== 'application/pdf'
          ? Array.from(new Uint8Array(await blob.slice(0, 256).arrayBuffer())).map(byte => byte.toString(16).padStart(2, '0')).join(' ') : null;
        if (controller.signal.aborted) return;
        setPreview({url, type, text, bytes, size:blob.size, filename:response.headers.get('X-Document-Filename') || `${label}-document`});
      }).catch(reason => {if (!controller.signal.aborted && reason.name !== 'AbortError') setError(reason.message);});
    return () => {controller.abort(); if (url) URL.revokeObjectURL(url);};
  }, [open, id, kind, previewUrl, label, formattedContent]);
  const close = () => {dialog.current.close(); setOpen(false); setPreview(null); setError('');};
  const showFileDetails = () => setPreview(current => current && ({...current, type:'application/octet-stream'}));
  return <div className="verification-document-actions">
    <button type="button" onClick={() => setOpen(true)}>View {label}</button>
    <dialog ref={dialog} className="verification-preview-modal" aria-label={`${label} preview`} onCancel={event => {event.preventDefault(); event.stopPropagation(); close();}} onKeyDown={event => event.stopPropagation()}>
      <header><div><strong>{label}</strong><p>Document preview</p></div><button type="button" onClick={close} aria-label="Close document preview">Close ×</button></header>
      <div className="verification-preview-content">
        {formattedContent || (error ? <p role="alert">{error}</p> : !preview ? <p role="status">Loading document…</p>
          : preview.text !== null ? <pre className="document-text">{preview.text}</pre>
          : preview.type === 'application/pdf' ? <iframe title={`${label} document`} src={preview.url} sandbox="allow-same-origin"/>
          : preview.type.startsWith('image/') ? <img src={preview.url} alt={`${label} verification document`} onError={showFileDetails}/>
          : preview.type.startsWith('audio/') ? <audio controls src={preview.url} onError={showFileDetails}/>
          : preview.type.startsWith('video/') ? <video controls src={preview.url} onError={showFileDetails}/>
          : <div><p><strong>{preview.filename}</strong></p><p>{preview.size.toLocaleString()} bytes · {preview.type}</p><p>Download this file to view it in its application.</p>{preview.bytes && <details><summary>File contents (first 256 bytes)</summary><pre className="document-text">{preview.bytes}</pre></details>}</div>)}
      </div>
      <footer><button type="button" onClick={close}>Back to request</button>{preview && <a href={id ? verificationUrl(id, kind) : preview.url} download={preview.type === 'image/png' ? preview.filename.replace(/\.[^.]+$/, '.png') : preview.filename}>Download / open file</a>}</footer>
    </dialog>
  </div>;
}
