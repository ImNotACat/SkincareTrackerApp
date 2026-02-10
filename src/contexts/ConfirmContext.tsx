import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmDialog, type ConfirmOptions } from '../components/ConfirmDialog';

interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {options && (
        <ConfirmDialog
          visible={visible}
          title={options.title}
          message={options.message}
          buttons={options.buttons}
          onRequestClose={handleClose}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
