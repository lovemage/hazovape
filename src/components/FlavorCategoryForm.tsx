import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { flavorCategoryAPI } from '../services/api';
import { toast } from 'sonner';
import { FlavorCategory } from '../types';

interface FlavorCategoryFormProps {
  category?: FlavorCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FlavorCategoryForm: React.FC<FlavorCategoryFormProps> = ({
  category,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        sort_order: category.sort_order || 0,
        is_active: category.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true
      });
    }
  }, [category, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('請輸入類別名稱');
      return;
    }

    setLoading(true);
    
    try {
      if (category?.id) {
        await flavorCategoryAPI.update(category.id, formData);
        toast.success('類別更新成功');
      } else {
        await flavorCategoryAPI.create(formData);
        toast.success('類別創建成功');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('保存類別失敗:', error);
      const errorMessage = error.response?.data?.message || '保存類別失敗';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {category ? '編輯類別' : '新增類別'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 類別名稱 */}
          <div>
            <Label htmlFor="name">類別名稱 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="請輸入類別名稱"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              例如：茶葉系列、咖啡系列、奶茶系列等
            </p>
          </div>

          {/* 類別描述 */}
          <div>
            <Label htmlFor="description">類別描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="請輸入類別描述（可選）"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              簡短描述這個類別包含的口味類型
            </p>
          </div>

          {/* 排序順序 */}
          <div>
            <Label htmlFor="sort_order">排序順序</Label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-gray-500 mt-1">
              數字越小排序越前面，控制類別在列表中的顯示順序
            </p>
          </div>

          {/* 啟用狀態 */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_active">啟用狀態</Label>
              <p className="text-sm text-gray-500">
                停用後此類別將不會在前端顯示
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>

          {/* 表單按鈕 */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : (category ? '更新類別' : '創建類別')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
