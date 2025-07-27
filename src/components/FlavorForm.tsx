import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { productAPI, flavorAPI } from '../services/api';
import { toast } from 'sonner';
import { Flavor, Product } from '../types';

interface FlavorFormProps {
  flavor?: Flavor | undefined;
  productId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FlavorCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export const FlavorForm: React.FC<FlavorFormProps> = ({
  flavor,
  productId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    product_id: productId || 0,
    category_id: 1,
    stock: 0,
    sort_order: 0,
    price: '', // 新增價格字段
    is_active: true
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<FlavorCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 載入基礎數據
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // 設定表單數據
  useEffect(() => {
    if (flavor) {
      setFormData({
        name: flavor.name || '',
        product_id: flavor.product_id || productId || 0,
        category_id: flavor.category_id || 1,
        stock: flavor.stock || 0,
        sort_order: flavor.sort_order || 0,
        price: flavor.price?.toString() || '', // 規格獨立價格
        is_active: flavor.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        product_id: productId || 0,
        category_id: 1,
        stock: 0,
        sort_order: 0,
        price: '', // 新規格預設為空（使用產品基礎價格）
        is_active: true
      });
    }
  }, [flavor, productId]);

  // 載入選中產品信息
  useEffect(() => {
    if (formData.product_id && products.length > 0) {
      const product = products.find(p => p.id === formData.product_id);
      setSelectedProduct(product || null);
    }
  }, [formData.product_id, products]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      const [productsResponse, categoriesResponse] = await Promise.all([
        productAPI.getAllAdmin(),
        // 這裡應該有 flavorCategoryAPI，暫時用 flavorAPI 替代
        fetch('/api/flavor-categories').then(res => res.json()).catch(() => ({ data: { data: [] } }))
      ]);

      if (productsResponse.data.success) {
        setProducts(productsResponse.data.data || []);
      }

      if (categoriesResponse.success || categoriesResponse.data?.success) {
        const categoriesData = categoriesResponse.data?.data || categoriesResponse.data || [];
        setCategories(categoriesData);
      } else {
        // 設定默認分類
        setCategories([
          { id: 1, name: '規格', description: '產品規格', sort_order: 1, is_active: true }
        ]);
      }

    } catch (error) {
      console.error('載入數據失敗:', error);
      toast.error('載入數據失敗');
      // 設定默認值
      setCategories([
        { id: 1, name: '規格', description: '產品規格', sort_order: 1, is_active: true }
      ]);
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

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null // 處理價格：空值轉為null
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
    } catch (error) {
      console.error('保存規格失敗:', error);
      toast.error('保存規格失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {flavor ? '編輯規格' : '新增規格'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">規格名稱 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="例如：西瓜、蘋果、藍莓"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="product">所屬商品 *</Label>
                    <Select
                      value={formData.product_id.toString()}
                      onValueChange={(value) => handleInputChange('product_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇商品" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">規格分類</Label>
                    <Select
                      value={formData.category_id.toString()}
                      onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 定價與庫存 */}
              <Card>
                <CardHeader>
                  <CardTitle>定價與庫存</CardTitle>
                  <CardDescription>
                    設定此規格的獨立價格和庫存數量
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 價格設定 */}
                  <div>
                    <Label htmlFor="price">規格價格</Label>
                    <div className="space-y-2">
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="留空使用產品基礎價格"
                      />
                      {selectedProduct && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          產品基礎價格：NT$ {Math.round(selectedProduct.price).toLocaleString()}
                          {formData.price ? 
                            ` → 規格價格：NT$ ${Math.round(parseFloat(formData.price) || 0).toLocaleString()}` :
                            ' (當前使用基礎價格)'
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                    </div>

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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 狀態設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>狀態設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>是否啟用</Label>
                      <p className="text-sm text-gray-500">停用後用戶將無法選擇此規格</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 提交按鈕 */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {flavor ? '更新中...' : '創建中...'}
                    </>
                  ) : (
                    flavor ? '更新規格' : '創建規格'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
