import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { AdminLayout } from '../../components/AdminLayout';
import { toast } from 'sonner';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export const AdminProductCategories: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/product-categories/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCategories(result.data || []);
        }
      }
    } catch (error) {
      console.error('載入分類失敗:', error);
      toast.error('載入分類失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('請輸入分類名稱');
      return;
    }

    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory 
        ? `/api/product-categories/admin/${editingCategory.id}`
        : '/api/product-categories/admin';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || (editingCategory ? '分類更新成功' : '分類創建成功'));
        loadCategories();
        resetForm();
      } else {
        toast.error(result.message || '操作失敗');
      }
    } catch (error) {
      console.error('操作失敗:', error);
      toast.error('操作失敗');
    }
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order,
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (category: ProductCategory) => {
    if (!confirm(`確定要刪除分類 "${category.name}" 嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/product-categories/admin/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('分類刪除成功');
        loadCategories();
      } else {
        toast.error(result.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除失敗:', error);
      toast.error('刪除失敗');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sort_order: categories.length + 1,
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const updateSortOrder = async (categoryId: number, newSortOrder: number) => {
    try {
      const response = await fetch(`/api/product-categories/admin/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ sort_order: newSortOrder })
      });

      if (response.ok) {
        loadCategories();
      }
    } catch (error) {
      console.error('更新排序失敗:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">產品分類管理</h1>
            <p className="text-gray-600">管理商品分類，設定分類顯示順序</p>
          </div>
          <Button
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                sort_order: categories.length + 1,
                is_active: true
              });
              setEditingCategory(null);
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增分類
          </Button>
        </div>

        {/* 分類表單 */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingCategory ? '編輯分類' : '新增分類'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">分類名稱 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="請輸入分類名稱"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort_order">排序順序</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      placeholder="排序順序（數字越小越前面）"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">分類描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="請輸入分類描述"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">啟用分類</Label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingCategory ? '更新分類' : '創建分類'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 分類列表 */}
        <Card>
          <CardHeader>
            <CardTitle>分類列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">載入中...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暫無分類數據</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateSortOrder(category.id, category.sort_order - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateSortOrder(category.id, category.sort_order + 1)}
                          disabled={index === categories.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? '啟用' : '停用'}
                          </Badge>
                          <Badge variant="outline">
                            排序: {category.sort_order}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          創建時間: {new Date(category.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編輯
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}; 