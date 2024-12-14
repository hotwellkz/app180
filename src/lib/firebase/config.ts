import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAICwewb9nIfENQH-gOJgkpQXZKBity9ck",
  authDomain: "accounting-c3c06.firebaseapp.com",
  projectId: "accounting-c3c06",
  storageBucket: "accounting-c3c06.appspot.com",
  messagingSenderId: "670119019137",
  appId: "1:670119019137:web:f5c57a1a6f5ef05c720380"
};

const app = initializeApp(firebaseConfig);
export { app };

// Инициализируем Firestore с настройками производительности
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: true
});

export const storage = getStorage(app);

// Включаем оффлайн персистентность
enableIndexedDbPersistence(db, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
}).catch((err: any) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.');
  }
});

// Настройка кэширования для Storage
const storageInstance = getStorage();
storageInstance.maxOperationRetryTime = 120000;
storageInstance.maxUploadRetryTime = 120000;

// Создаем необходимые индексы
const createRequiredIndexes = async () => {
  try {
    const indexes = [
      // Индекс для файлов клиентов
      {
        collectionGroup: 'clients',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'files', order: 'ASCENDING' },
          { fieldPath: 'updatedAt', order: 'DESCENDING' }
        ]
      },
      {
        collectionGroup: 'productMovements',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'productId', order: 'ASCENDING' },
          { fieldPath: 'date', order: 'DESCENDING' }
        ]
      },
      {
        collectionGroup: 'products',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'warehouse', order: 'ASCENDING' },
          { fieldPath: 'order', order: 'ASCENDING' },
          { fieldPath: '__name__', order: 'ASCENDING' }
        ]
      },
      {
        collectionGroup: 'products',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'warehouse', order: 'ASCENDING' },
          { fieldPath: 'quantity', order: 'ASCENDING' },
          { fieldPath: 'order', order: 'ASCENDING' },
          { fieldPath: '__name__', order: 'ASCENDING' }
        ]
      },
      {
        collectionGroup: 'notifications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'isRead', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      },
      {
        collectionGroup: 'clients',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      }
    ];

    console.log('Required indexes configuration:', indexes);
  } catch (error) {
    console.error('Error configuring indexes:', error);
  }
};

createRequiredIndexes();

export default db;