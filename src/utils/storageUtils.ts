import { ref, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { showErrorNotification, showSuccessNotification } from './notifications';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    if (!file || !path) {
      showErrorNotification('Файл и путь обязательны');
      throw new Error('Файл и путь обязательны');
    }

    // Проверяем размер файла (макс. 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB в байтах
    if (file.size > MAX_FILE_SIZE) {
      showErrorNotification('Файл слишком большой (максимум 100MB)');
      throw new Error('Файл слишком большой');
    }

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const storageRef = ref(storage, path);
        
        const metadata = {
          contentType: file.type,
          cacheControl: 'public,max-age=7200'
        };

        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        return new Promise((resolve, reject) => {
          let lastProgress = 0;
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              if (onProgress && Math.abs(progress - lastProgress) >= 1) {
                lastProgress = progress;
                onProgress(progress);
              }
            },
            async (error) => {
              console.error(`Upload attempt ${attempt + 1} failed:`, error);
              if (attempt < MAX_RETRIES - 1) {
                await wait(RETRY_DELAY * (attempt + 1));
                attempt++;
              } else {
                showErrorNotification(`Ошибка при загрузке файла ${file.name}`);
                reject(error);
              }
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                showSuccessNotification('Файл успешно загружен');
                resolve(downloadURL);
              } catch (error) {
                showErrorNotification('Ошибка при получении ссылки на файл');
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
          attempt++;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Превышено максимальное количество попыток загрузки');
  } catch (error) {
    console.error('Ошибка в uploadFile:', error);
    showErrorNotification('Ошибка при инициализации загрузки');
    throw error;
  }
};

export const uploadImage = async (file: File, path: string): Promise<string> => {
  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    showErrorNotification('Можно загружать только изображения');
    throw new Error('Invalid file type');
  }
  
  return uploadFile(file, path);
};

export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    showSuccessNotification('Файл успешно удален');
  } catch (error) {
    console.error('Error deleting file:', error);
    showErrorNotification('Ошибка при удалении файла');
    throw error;
  }
};

export const getFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};