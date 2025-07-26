import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RotateCcw, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { AdminLayout } from '../../components/AdminLayout';
import { FlavorCategoryForm } from '../../components/FlavorCategoryForm';
import { flavorCategoryAPI } from '../../services/api';
import { toast } from 'sonner';
import { FlavorCategory } from '../../types';

export const AdminFlavorCategories: React.FC = () => {
  const [categories, setCategories] = useState<FlavorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FlavorCategory | undefined>();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await flavorCategoryAPI.getAllAdmin();
      if (response.data.success) {
        setCategories(response.data.data || []);
      } else {
        toast.error('載入類別失敗');
      }
    } catch (error) {
      console.error('載入類別失敗:', error);
      toast.error('載入類別失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: FlavorCategory) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: FlavorCategory) => {
    if (!confirm(`確定要停用類別「${category.name}」嗎？`)) {
      return;
    }

    try {
      await flavorCategoryAPI.delete(category.id);
      toast.success('類別已停用');
      loadCategories();
    } catch (error: any) {
      console.error('停用類別失敗:', error);
      const errorMessage = error.response?.data?.message || '停用類別失敗';
      toast.error(errorMessage);
    }
  };

  const handleRestore = async (category: FlavorCategory) => {
    try {
      await flavorCategoryAPI.restore(category.id);
      toast.success('類別已啟用');
      loadCategories();
    } catch (error: any) {
      console.error('啟用類別失敗:', error);
      const errorMessage = error.response?.data?.message || '啟用類別失敗';
      toast.error(errorMessage);
    }
  };

  const handleFormSuccess = () => {
    loadCategories();
    setShowForm(false);
    setEditingCategory(undefined);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(undefined);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
          <span className="ml-2 text-gray-600">載入中...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">規格類別管理</h1>
          <p className="text-gray-600 mt-2">管理規格分類，組織不同類型的規格選項</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新增類別
        </Button>
      </div>

      {/* 搜索欄 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索類別名稱或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          共 {filteredCategories.length} 個類別
        </div>
      </div>

      {/* 類別列表 */}
      <div className="bg-white rounded-lg shadow">
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? '沒有找到符合條件的類別' : '還沒有任何類別'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <div key={category.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {category.name}
                      </h3>
                      <Badge 
                        variant={category.is_active ? "default" : "secondary"}
                        className={category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {category.is_active ? '啟用' : '停用'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        排序: {category.sort_order}
                      </span>
                    </div>
                    
                    {category.description && (
                      <p className="text-gray-600 mt-2">{category.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                      <span>ID: {category.id}</span>
                      <span>創建時間: {new Date(category.created_at).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      編輯
                    </Button>
                    
                    {category.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        停用
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(category)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:border-green-300"
                      >
                        <RotateCcw className="h-3 w-3" />
                        啟用
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 類別表單 */}
      <FlavorCategoryForm
        category={editingCategory}
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
      </div>
    </AdminLayout>
  );
};
