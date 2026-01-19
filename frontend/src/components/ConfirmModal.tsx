interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj"
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: '#666', marginBottom: 25 }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button 
            onClick={onCancel} 
            className="secondary" 
            style={{ width: 'auto', marginTop: 0 }}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm} 
            // Używamy domyślnego stylu (niebieski) lub danger jeśli potrzeba, 
            // tutaj dla wylogowania wystarczy zwykły przycisk.
            style={{ width: 'auto', marginTop: 0 }} 
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};