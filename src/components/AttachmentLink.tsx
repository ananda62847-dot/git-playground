import React, { useState } from 'react';
import MediaPreviewModal from './MediaPreviewModal';

interface Props {
  url: string;
  filename?: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

/** Renders children as a button that opens the in-app MediaPreviewModal. */
const AttachmentLink: React.FC<Props> = ({ url, filename, className, children, title }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className}
        title={title || filename}
      >
        {children}
      </button>
      {open && <MediaPreviewModal url={url} filename={filename} onClose={() => setOpen(false)} />}
    </>
  );
};

export default AttachmentLink;