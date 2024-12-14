import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CategoryCardType } from '../../types';
import { transferFunds } from '../../lib/firebase/transactions';
import { uploadFile } from '../../utils/storageUtils';
import { useNavigate } from 'react-router-dom';

interface TransferModalProps {
  sourceCategory: CategoryCardType;
  targetCategory: CategoryCardType;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  sourceCategory,
  targetCategory,
  isOpen,
  onClose
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSalary, setIsSalary] = useState(false);
  const [isCashless, setIsCashless] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const isEmployeeSource = sourceCategory.row === 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const uploadedPhotos = [];

    try {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Сумма перевода должна быть больше нуля');
      }

      if (!description.trim()) {
        throw new Error('Необходимо указать комментарий к переводу');
      }

      for (const file of selectedFiles) {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const path = `transactions/${sourceCategory.id}/${timestamp}-${safeName}`;
          
          const url = await uploadFile(file, path, (progress) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          });
          
          uploadedPhotos.push({
            name: file.name,
            url,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            path
          });
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          throw new Error(`Ошибка при загрузке файла ${file.name}`);
        }
      }

      const transferAmount = Math.abs(parseFloat(amount));

      await transferFunds(
        sourceCategory,
        targetCategory,
        transferAmount,
        description.trim(),
        uploadedPhotos,
        isEmployeeSource ? {
          isSalary,
          isCashless
        } : undefined
      );
      onClose();
    } catch (error) {
      console.error('Ошибка при переводе средств:', error);
      setError(error instanceof Error ? error.message : 'Не удалось выполнить перевод средств');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Перевод средств</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>От: {sourceCategory.title}</span>
            <span>Кому: {targetCategory.title}</span>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Текущий баланс: {sourceCategory.amount}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сумма перевода
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите сумму"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий к переводу
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Укажите назначение перевода"
              required
            />
          </div>

          {isEmployeeSource && (
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSalary}
                  onChange={(e) => setIsSalary(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">ЗП</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isCashless}
                  onChange={(e) => setIsCashless(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Безнал</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Прикрепить фотографии
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Выбрано файлов: {selectedFiles.length}
              </div>
            )}
          </div>
          
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="mt-2">
              <div className="text-xs text-gray-500">{fileName}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? 'Выполняется перевод...' : 'Выполнить перевод'}
          </button>
        </form>
      </div>
    </div>
  );
};