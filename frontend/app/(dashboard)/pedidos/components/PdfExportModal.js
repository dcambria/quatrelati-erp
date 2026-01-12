// =====================================================
// Modal de Exportação PDF
// v1.0.0 - Seleção de vendedor para exportar PDF
// =====================================================

'use client';

import { Download, Printer } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

export default function PdfExportModal({
  isOpen,
  onClose,
  pdfMode,
  pdfVendedorId,
  setPdfVendedorId,
  usuarios,
  onConfirm,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pdfMode === 'download' ? 'Exportar PDF' : 'Imprimir Relatório'}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Selecione o vendedor para gerar o relatório ou deixe em branco para incluir todos os vendedores.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendedor
          </label>
          <select
            value={pdfVendedorId}
            onChange={(e) => setPdfVendedorId(e.target.value)}
            className="input-glass w-full"
          >
            <option value="">Todos os vendedores</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.nivel})
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            {pdfMode === 'download' ? (
              <>
                <Download className="w-4 h-4" />
                Baixar PDF
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Imprimir
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
