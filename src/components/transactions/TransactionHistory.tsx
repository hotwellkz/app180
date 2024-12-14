import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Trash2, FileText } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CategoryCardType } from '../../types';
import { formatTime } from '../../utils/dateUtils';
import { formatAmount } from '../../utils/formatUtils';
import { useSwipeable } from 'react-swipeable';
import { showErrorNotification, showSuccessNotification } from '../../utils/notifications';
import { PasswordPrompt } from '../PasswordPrompt';
import { ExpenseWaybill } from '../warehouse/ExpenseWaybill';
import { IncomeWaybill } from '../warehouse/IncomeWaybill';
import { Skeleton } from '../common/Skeleton';

interface Transaction {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: any;
  type: 'income' | 'expense';
  categoryId: string;
  isSalary?: boolean;
  isCashless?: boolean;
  waybillNumber?: string;
  waybillData?: any;
}

interface TransactionHistoryProps {
  category: CategoryCardType;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  category,
  isOpen,
  onClose
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [swipedTransactionId, setSwipedTransactionId] = useState<string | null>(null);
  const [showWaybill, setShowWaybill] = useState(false);
  const [isHistoryPasswordPromptOpen, setIsHistoryPasswordPromptOpen] = useState(
    category.title === 'ЗП Сот.'
  );

  // Используем кэш для быстрой начальной загрузки
  useEffect(() => {
    if (!isOpen) return;
    
    const cacheKey = `transactions_${category.id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Используем кэш если он не старше 5 минут
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setTransactions(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }
  }, [category.id, isOpen]);

  // Сохраняем результаты в кэш
  useEffect(() => {
    if (transactions.length > 0) {
      const cacheKey = `transactions_${category.id}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: transactions,
        timestamp: Date.now()
      }));
    }
  }, [transactions, category.id]);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'transactions'),
      where('categoryId', '==', category.id),
      orderBy('date', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category.id, isOpen]);

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const transactionElement = element.closest('[data-transaction-id]');
      if (transactionElement) {
        const transactionId = transactionElement.getAttribute('data-transaction-id');
        if (transactionId) {
          setSwipedTransactionId(transactionId === swipedTransactionId ? null : transactionId);
        }
      }
    },
    onSwipedRight: () => {
      setSwipedTransactionId(null);
    },
    trackMouse: true,
    delta: 10
  });

  const handleDelete = async (isAuthenticated: boolean) => {
    if (!isAuthenticated || !selectedTransaction) {
      setShowPasswordPrompt(false);
      setSelectedTransaction(null);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Delete the transaction
      const transactionRef = doc(db, 'transactions', selectedTransaction.id);
      batch.delete(transactionRef);

      // Find and delete the related transaction
      const relatedTransactionsQuery = query(
        collection(db, 'transactions'),
        where('relatedTransactionId', '==', selectedTransaction.id)
      );
      
      const relatedTransactionsSnapshot = await getDocs(relatedTransactionsQuery);
      relatedTransactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      showSuccessNotification('Операция успешно удалена');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showErrorNotification('Ошибка при удалении операции');
    } finally {
      setShowPasswordPrompt(false);
      setSelectedTransaction(null);
      setSwipedTransactionId(null);
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowPasswordPrompt(true);
  };

  const handleWaybillClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowWaybill(true);
  };

  if (!isOpen) return null;

  if (isHistoryPasswordPromptOpen) {
    return (
      <PasswordPrompt
        isOpen={true}
        onClose={onClose}
        onSuccess={() => setIsHistoryPasswordPromptOpen(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4" style={{ maxHeight: '90vh' }}>
        <div className="sticky top-0 bg-white rounded-t-lg border-b z-10">
          <div className="flex justify-between items-center p-4">
            <div>
              <h2 className="text-xl font-semibold">{category.title}</h2>
              <p className="text-sm text-gray-500">История операций</p>
            </div>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto space-y-6" style={{ maxHeight: 'calc(90vh - 85px)' }}>
          {loading && transactions.length === 0 ? (
            <Skeleton className="h-24 mb-4" count={3} />
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">История операций пуста</h3>
              <p className="text-gray-500">Здесь будут отображаться все операции</p>
            </div>
          ) : (
            <div className="space-y-4" {...handlers}>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  data-transaction-id={transaction.id}
                  className={`relative overflow-hidden ${
                    transaction.isSalary ? 'bg-emerald-50' :
                    transaction.isCashless ? 'bg-purple-50' :
                    'bg-white'
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center transition-opacity duration-200 ${
                      swipedTransactionId === transaction.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <button
                      onClick={() => handleDeleteClick(transaction)}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div
                    className={`p-4 transition-transform ${
                      swipedTransactionId === transaction.id ? '-translate-x-16' : 'translate-x-0'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className={`w-5 h-5 ${
                              transaction.isSalary ? 'text-emerald-600' :
                              transaction.isCashless ? 'text-purple-600' :
                              'text-emerald-500'
                            }`} />
                          ) : (
                            <ArrowDownRight className={`w-5 h-5 ${
                              transaction.isSalary ? 'text-emerald-600' :
                              transaction.isCashless ? 'text-purple-600' :
                              'text-red-500'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{transaction.fromUser}</div>
                          <div className="text-sm text-gray-500">{transaction.toUser}</div>
                          {transaction.waybillNumber && (
                            <button
                              onClick={() => handleWaybillClick(transaction)}
                              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              Накладная №{transaction.waybillNumber}
                            </button>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTime(transaction.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          transaction.isSalary ? 'text-emerald-600' :
                          transaction.isCashless ? 'text-purple-600' :
                          transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {transaction.description}
                        </div>
                        <div className="flex gap-1 mt-1 justify-end">
                          {transaction.isSalary && (
                            <div className="text-xs text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-50 rounded">
                              ЗП
                            </div>
                          )}
                          {transaction.isCashless && (
                            <div className="text-xs text-purple-600 font-medium px-1.5 py-0.5 bg-purple-50 rounded">
                              Безнал
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && transactions.length > 0 && (
                <div className="flex justify-center py-4">
                  <Skeleton className="h-8 w-32" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showPasswordPrompt && (
        <PasswordPrompt
          isOpen={showPasswordPrompt}
          onClose={() => {
            setShowPasswordPrompt(false);
            setSelectedTransaction(null);
          }}
          onSuccess={() => handleDelete(true)}
        />
      )}

      {showWaybill && selectedTransaction?.waybillData && (
        selectedTransaction.type === 'expense' ? (
          <ExpenseWaybill
            isOpen={showWaybill}
            onClose={() => {
              setShowWaybill(false);
              setSelectedTransaction(null);
            }}
            data={selectedTransaction.waybillData}
          />
        ) : (
          <IncomeWaybill
            isOpen={showWaybill}
            onClose={() => {
              setShowWaybill(false);
              setSelectedTransaction(null);
            }}
            data={selectedTransaction.waybillData}
          />
        )
      )}
    </div>
  );
};