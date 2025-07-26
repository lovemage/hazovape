import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { flavorAPI, productAPI } from '../services/api';
import { toast } from 'sonner';
import { Flavor, Product } from '../types';

interface FlavorFormProps {
  flavor?: Flavor;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FlavorForm: React.FC<FlavorFormProps> = ({
  flavor,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    category_id: '1', // 固定使用默認類別
    sort_order: 0,
    stock: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // 載入商品數據
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // 設置表單數據
  useEffect(() => {
    if (flavor) {
      setFormData({
        name: flavor.name || '',
        product_id: flavor.product_id?.toString() || '',
        category_id: flavor.category_id?.toString() || '1',
        sort_order: flavor.sort_order || 0,
        stock: flavor.stock || 0,
        is_active: flavor.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        product_id: '',
        category_id: '1',
        sort_order: 0,
        stock: 0,
        is_active: true
      });
    }
  }, [flavor, isOpen]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const productsRes = await productAPI.getAllAdmin();

      if (productsRes.data.success) {
        setProducts(productsRes.data.data || []);
      }
    } catch (error) {
      console.error('載入數據失敗:', error);
      toast.error('載入數據失敗');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('請輸入規格名稱');
      return;
    }

    if (!formData.product_id) {
      toast.error('請選擇商品');
      return;
    }



    setLoading(true);

    try {
      const submitData = {
        ...formData,
        product_id: parseInt(formData.product_id),
        category_id: parseInt(formData.category_id)
      };

      if (flavor?.id) {
        await flavorAPI.update(flavor.id, submitData);
        toast.success('規格更新成功');
      } else {
        await flavorAPI.create(submitData);
        toast.success('規格創建成功');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('保存規格失敗:', error);
      const errorMessage = error.response?.data?.message || '保存規格失敗';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {flavor ? '編輯規格' : '新增規格'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">載入數據中...</span>
            </div>
          ) : (
            <>
              {/* 1. 選擇商品 */}
              <div>
                <Label htmlFor="product_id">選擇商品 *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => handleInputChange('product_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇商品" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.is_active).map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  規格將依附在此商品下
                </p>
              </div>

              {/* 2. 規格名稱 */}
              <div>
                <Label htmlFor="name">規格名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="請輸入規格名稱"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  例如：原味、微糖、半糖等
                </p>
              </div>
            </>
          )}

          {!loadingData && (
            <>
              {/* 3. 排序順序 */}
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
                  數字越小排序越前面，控制規格在列表中的顯示順序
                </p>
              </div>

              {/* 4. 庫存數量 */}
              <div>
                <Label htmlFor="stock">庫存數量</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  設置此規格的庫存數量，用戶下單時會扣減庫存
                </p>
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">啟用規格</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading ? '保存中...' : (flavor ? '更新規格' : '創建規格')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
