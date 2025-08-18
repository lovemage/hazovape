import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Coffee, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { productAPI, flavorAPI } from '../services/api';
import { Product } from '../types';
import { toast } from 'sonner';

interface BatchFlavorFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

interface FlavorTemplate {
  name: string;
  sortOrder: number;
  stockQuantity: number;
}

export const BatchFlavorForm: React.FC<BatchFlavorFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [flavorTemplates, setFlavorTemplates] = useState<FlavorTemplate[]>([
    { name: '', sortOrder: 1, stockQuantity: 99 }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productAPI.getAllAdmin();
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('載入商品失敗:', error);
      toast.error('載入商品失敗');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const addFlavorTemplate = () => {
    setFlavorTemplates(prev => [
      ...prev,
      { 
        name: '', 
        sortOrder: prev.length + 1, 
        stockQuantity: 99 
      }
    ]);
  };

  const removeFlavorTemplate = (index: number) => {
    if (flavorTemplates.length > 1) {
      setFlavorTemplates(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateFlavorTemplate = (index: number, field: keyof FlavorTemplate, value: string | number) => {
    setFlavorTemplates(prev => prev.map((template, i) => 
      i === index ? { ...template, [field]: value } : template
    ));
  };

  const validateForm = () => {
    if (selectedProducts.size === 0) {
      toast.error('請至少選擇一個商品');
      return false;
    }

    const validTemplates = flavorTemplates.filter(t => t.name.trim());
    if (validTemplates.length === 0) {
      toast.error('請至少添加一個規格');
      return false;
    }

    // 檢查規格名稱是否重複
    const names = validTemplates.map(t => t.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      toast.error('規格名稱不能重複');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const validTemplates = flavorTemplates.filter(t => t.name.trim());
      const selectedProductIds = Array.from(selectedProducts);

      console.log('🔄 開始批量新增規格...');
      console.log('選中商品:', selectedProductIds);
      console.log('規格模板:', validTemplates);

      let successCount = 0;
      let errorCount = 0;

      // 為每個選中的商品添加所有規格
      for (const productId of selectedProductIds) {
        for (const template of validTemplates) {
          try {
            const flavorData = {
              product_id: productId,
              name: template.name.trim(),
              sort_order: template.sortOrder,
              stock: template.stockQuantity,
              is_active: true
            };

            console.log(`🔄 為商品 ${productId} 創建規格:`, flavorData);

            const response = await flavorAPI.create(flavorData);

            if (response.data.success) {
              console.log(`✅ 成功創建規格: ${template.name} (商品 ${productId})`);
              successCount++;
            } else {
              console.error(`❌ 創建規格失敗: ${response.data.message}`);
              errorCount++;
            }
          } catch (error: any) {
            console.error(`❌ 為商品 ${productId} 添加規格 ${template.name} 失敗:`, error);
            console.error('錯誤詳情:', error.response?.data || error.message);
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`成功新增 ${successCount} 個規格${errorCount > 0 ? `，${errorCount} 個失敗` : ''}`);
        onSubmit();
      } else {
        toast.error('批量新增失敗');
      }
    } catch (error) {
      console.error('批量新增規格失敗:', error);
      toast.error('批量新增失敗');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>載入商品中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 標題 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Coffee className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">批量新增規格</h2>
              <p className="text-sm text-gray-600">為多個商品同時添加相同的規格</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 選擇商品 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>選擇商品</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllProducts}
                >
                  {selectedProducts.size === products.length ? '取消全選' : '全選'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">NT$ {product.price}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                已選擇 {selectedProducts.size} / {products.length} 個商品
              </div>
            </CardContent>
          </Card>

          {/* 規格模板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Coffee className="w-5 h-5" />
                  <span>規格模板</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFlavorTemplate}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  新增規格
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flavorTemplates.map((template, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`name-${index}`}>規格名稱 *</Label>
                        <Input
                          id={`name-${index}`}
                          value={template.name}
                          onChange={(e) => updateFlavorTemplate(index, 'name', e.target.value)}
                          placeholder="例：大杯、中杯、小杯"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`sort-${index}`}>排序</Label>
                        <Input
                          id={`sort-${index}`}
                          type="number"
                          value={template.sortOrder}
                          onChange={(e) => updateFlavorTemplate(index, 'sortOrder', parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`stock-${index}`}>庫存數量</Label>
                        <Input
                          id={`stock-${index}`}
                          type="number"
                          value={template.stockQuantity}
                          onChange={(e) => updateFlavorTemplate(index, 'stockQuantity', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                    {flavorTemplates.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFlavorTemplate(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 預覽 */}
          {selectedProducts.size > 0 && flavorTemplates.some(t => t.name.trim()) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span>新增預覽</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">
                  將為 {selectedProducts.size} 個商品各新增 {flavorTemplates.filter(t => t.name.trim()).length} 個規格，
                  總共新增 {selectedProducts.size * flavorTemplates.filter(t => t.name.trim()).length} 個規格項目
                </div>
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {Array.from(selectedProducts).slice(0, 3).map(productId => {
                    const product = products.find(p => p.id === productId);
                    return (
                      <div key={productId} className="text-sm">
                        <span className="font-medium">{product?.name}</span>
                        <span className="text-gray-600">
                          : {flavorTemplates.filter(t => t.name.trim()).map(t => t.name).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                  {selectedProducts.size > 3 && (
                    <div className="text-sm text-gray-500">
                      ... 還有 {selectedProducts.size - 3} 個商品
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '新增中...' : '確定新增'}
          </Button>
        </div>
      </div>
    </div>
  );
};
