import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Share2, Eye, Trash2, FileText, Image as ImageIcon, FileArchive, FilePlus } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { shareContent } from '../utils/shareUtils';
import { Client } from '../types/client';
import { uploadFile, deleteFile, getFileSize } from '../utils/storageUtils';
import { showErrorNotification, showSuccessNotification } from '../utils/notifications';

export const ClientFiles: React.FC = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return;
      
      try {
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (clientDoc.exists()) {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;
          setClient(clientData);
          setFiles(clientData.files || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading client:', error);
        showErrorNotification('Ошибка при загрузке данных клиента');
        setLoading(false);
      }
    };

    loadClient();
  }, [clientId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length || !client) return;

    handleFileUpload(droppedFiles);
  }, [client]);

  const handleFileUpload = async (uploadFiles: File[]) => {
    if (!client) return;

    try {
      const uploadPromises = uploadFiles.map(async (file) => {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `clients/${client.id}/files/${timestamp}-${safeName}`;
          
          const url = await uploadFile(file, filePath);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          return {
            name: file.name,
            url,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            path: filePath
          };
        } catch (error) {
          showErrorNotification(`Ошибка при загрузке файла ${file.name}`);
          throw error;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        files: arrayUnion(...uploadedFiles),
        updatedAt: serverTimestamp()
      });

      setFiles(prev => [...prev, ...uploadedFiles]);
      showSuccessNotification('Файлы успешно загружены');
    } catch (error) {
      console.error('Error uploading files:', error);
      showErrorNotification('Ошибка при загрузке файлов');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FileArchive className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    return getFileSize(bytes);
  };

  const handleFileDelete = async (file: any) => {
    if (!client || !window.confirm('Вы уверены, что хотите удалить этот файл?')) return;

    try {
      await deleteFile(file.path);

      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        files: arrayRemove(file),
        updatedAt: serverTimestamp()
      });

      setFiles(prev => prev.filter(f => f.path !== file.path));
      showSuccessNotification('Файл успешно удален');
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorNotification('Ошибка при удалении файла');
    }
  };

  const handleFileShare = async (file: any) => {
    if (!client) return;

    const shareText = `
Файл: ${file.name}
Клиент: ${client.lastName} ${client.firstName}
Ссылка: ${file.url}
    `;

    await shareContent('Поделиться файлом', shareText);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Клиент не найден</h2>
          <button
            onClick={() => navigate('/clients')}
            className="mt-4 text-emerald-600 hover:text-emerald-700"
          >
            Вернуться к списку клиентов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => navigate(`/clients/${client.id}`)} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Файлы клиента</h1>
                <p className="text-sm text-gray-500">{client.lastName} {client.firstName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Зона загрузки */}
        <div 
          className={`mb-6 border-2 border-dashed rounded-lg transition-colors ${
            isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="block w-full cursor-pointer">
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">
                Перетащите файлы сюда
              </p>
              <p className="text-sm text-gray-500">
                или нажмите для выбора файлов
              </p>
            </div>
          </label>
        </div>

        {/* Список файлов */}
        <div className="bg-white rounded-lg shadow">
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FilePlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Нет файлов</h3>
              <p className="text-gray-500">Загрузите первый файл</p>
            </div>
          ) : (
            <div className="divide-y">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-0.5">{file.name}</h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(file.url, '_blank')}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                        title="Просмотреть"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <a
                        href={file.url}
                        download={file.name}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                        title="Скачать"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleFileShare(file)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                        title="Поделиться"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleFileDelete(file)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};