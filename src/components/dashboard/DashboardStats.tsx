import React, { useEffect, useState } from 'react';
import { Package, DollarSign, AlertTriangle, Boxes } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useWarehouseStats } from '../../hooks/useWarehouseStats';

export const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    categoriesCount: 0
  });
  const { totalValue, loading: valueLoading } = useWarehouseStats();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Получаем все товары
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const products = productsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

        // Считаем товары с низким остатком
        const lowStockCount = products.filter(product => 
          product.quantity <= product.minQuantity).length;

        // Получаем количество категорий
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));

        setStats({
          totalProducts: products.length,
          lowStockCount,
          categoriesCount: categoriesSnapshot.size
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || valueLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded-full w-12 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-1.5 sm:p-2 rounded-full bg-emerald-100 mr-2 sm:mr-4">
            <Package className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-gray-500 text-xs sm:text-sm">Всего товаров</p>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-1.5 sm:p-2 rounded-full bg-amber-100 mr-2 sm:mr-4">
            <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-gray-500 text-xs sm:text-sm">Общая стоимость</p>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">{totalValue.toLocaleString()} ₸</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-1.5 sm:p-2 rounded-full bg-red-100 mr-2 sm:mr-4">
            <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
          </div>
          <div>
            <p className="text-gray-500 text-xs sm:text-sm">Мало на складе</p>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-1.5 sm:p-2 rounded-full bg-purple-100 mr-2 sm:mr-4">
            <Boxes className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-gray-500 text-xs sm:text-sm">Категорий</p>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.categoriesCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};