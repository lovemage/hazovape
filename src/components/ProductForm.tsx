import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { productAPI } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';
import { toast } from 'sonner';
import { Product } from '../types';

interface ProductFormProps {
  product?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    is_active: true,
    multi_discount: {} as Record<number, number>
  });
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || 0,
        stock: product.stock || 0,
        description: product.description || '',
        is_active: product.is_active ?? true,
        multi_discount: typeof product.multi_discount === 'string' 
          ? JSON.parse(product.multi_discount || '{}')
          : product.multi_discount || {}
      });
      // 分離文件路徑和 URL
      const productImages = Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []);
      const fileImages = productImages.filter(img => img.startsWith('products/'));
      const urlImages = productImages.filter(img => !img.startsWith('products/'));

      setExistingImages(fileImages);
      setImageUrls(urlImages);
    } else {
      setFormData({
        name: '',
        price: 0,
        stock: 0,
        description: '',
        is_active: true,
        multi_discount: {}
      });
      setExistingImages([]);
      setImageUrls([]);
    }
    setImages([]);
    setNewImageUrl('');
  }, [product, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('📁 文件選擇事件:', files.length, '個文件');
    console.log('📁 文件詳情:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    const totalImages = files.length + images.length + existingImages.length + imageUrls.length;
    if (totalImages > 5) {
      toast.error('最多只能上傳5張圖片');
      return;
    }

    setImages(prev => {
      const newImages = [...prev, ...files];
      console.log('📁 更新圖片狀態:', newImages.map(f => f.name));
      return newImages;
    });
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) {
      toast.error('請輸入圖片 URL');
      return;
    }

    const totalImages = images.length + existingImages.length + imageUrls.length + 1;
    if (totalImages > 5) {
      toast.error('最多只能添加5張圖片');
      return;
    }

    setImageUrls(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const addDiscountRule = () => {
    const discountType = prompt('請選擇折扣類型:\n1. 數量折扣 (例如: 2件9折)\n2. 單件減額 (例如: 第3件減50元)\n請輸入 1 或 2:');

    if (discountType === '1') {
      // 原有的數量折扣
      const quantity = prompt('請輸入數量:');
      const discount = prompt('請輸入折扣 (例如: 0.9 表示9折):');

      if (quantity && discount) {
        const qty = parseInt(quantity);
        const disc = parseFloat(discount);

        if (qty > 0 && disc > 0 && disc <= 1) {
          setFormData(prev => ({
            ...prev,
            multi_discount: {
              ...prev.multi_discount,
              [qty]: disc
            }
          }));
        } else {
          toast.error('請輸入有效的數量和折扣');
        }
      }
    } else if (discountType === '2') {
      // 新的單件減額
      const quantity = prompt('請輸入第幾件開始減額:');
      const amount = prompt('請輸入減額金額 (例如: 50):');

      if (quantity && amount) {
        const qty = parseInt(quantity);
        const amt = parseInt(amount);

        if (qty > 0 && amt > 0) {
          setFormData(prev => ({
            ...prev,
            multi_discount: {
              ...prev.multi_discount,
              [`item_${qty}`]: amt
            }
          }));
        } else {
          toast.error('請輸入有效的數量和減額金額');
        }
      }
    } else {
      toast.error('請選擇有效的折扣類型');
    }
  };

  const removeDiscountRule = (key: number | string) => {
    setFormData(prev => {
      const newDiscount = { ...prev.multi_discount };
      delete newDiscount[key];
      return {
        ...prev,
        multi_discount: newDiscount
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.price <= 0) {
      toast.error('請填寫完整的商品信息');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('price', formData.price.toString());
      submitData.append('stock', formData.stock.toString());
      submitData.append('description', formData.description);
      submitData.append('is_active', formData.is_active.toString());
      submitData.append('multi_discount', JSON.stringify(formData.multi_discount));
      
      console.log('🖼️  現有圖片:', existingImages);
      console.log('🔗 圖片 URLs:', imageUrls);
      console.log('📤 新上傳圖片:', images.map(img => img.name));
      console.log('📊 圖片狀態統計:', {
        existingImages: existingImages.length,
        imageUrls: imageUrls.length,
        newImages: images.length,
        total: existingImages.length + imageUrls.length + images.length
      });

      // 合併所有圖片（現有文件 + URL）
      const allExistingImages = [...existingImages, ...imageUrls];
      console.log('📋 合併後的現有圖片:', allExistingImages);

      if (allExistingImages.length > 0) {
        submitData.append('existing_images', JSON.stringify(allExistingImages));
        console.log('✅ 添加 existing_images 到 FormData');
      } else {
        console.log('⚠️  沒有現有圖片要發送');
      }

      console.log('📤 準備添加新圖片文件到 FormData...');
      images.forEach((image, index) => {
        console.log(`📤 添加文件 ${index + 1}:`, image.name, image.size, 'bytes');
        submitData.append('images', image);
      });

      console.log('📦 FormData 準備完成，包含:', {
        hasExistingImages: allExistingImages.length > 0,
        newImageFiles: images.length,
        formDataKeys: Array.from(submitData.keys())
      });

      console.log('🚀 準備發送請求...');
      console.log('📋 請求類型:', product?.id ? '更新' : '創建');
      console.log('🆔 商品 ID:', product?.id);

      // 檢查 FormData 內容
      console.log('📦 FormData 檢查:');
      for (let [key, value] of submitData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      let response;
      if (product?.id) {
        console.log('🔄 發送更新請求...');
        response = await productAPI.update(product.id, submitData);
        toast.success('商品更新成功');
      } else {
        console.log('🆕 發送創建請求...');
        response = await productAPI.create(submitData);
        toast.success('商品創建成功');
      }

      console.log('📦 商品提交響應:', response.data);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('保存商品失敗:', error);
      toast.error('保存商品失敗');
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
            {product ? '編輯商品' : '新增商品'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">商品名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="請輸入商品名稱"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">價格 *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">庫存</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">商品描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="請輸入商品描述"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">啟用商品</Label>
              </div>
            </CardContent>
          </Card>

          {/* 商品圖片 */}
          <Card>
            <CardHeader>
              <CardTitle>商品圖片 (最多5張)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 圖片 URL 輸入 */}
              <div>
                <Label htmlFor="imageUrl">圖片 URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="imageUrl"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="請輸入圖片 URL (例如: https://example.com/image.jpg)"
                    className="flex-1"
                  />
                  <Button type="button" onClick={addImageUrl} variant="outline">
                    添加
                  </Button>
                </div>
              </div>

              {/* 文件上傳 */}
              <div>
                <Label htmlFor="images">或上傳圖片文件</Label>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-1"
                />
              </div>

              {/* 現有圖片文件 */}
              {existingImages.length > 0 && (
                <div>
                  <Label>現有圖片文件</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={getImageUrl(image)}
                          alt={`商品圖片 ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeExistingImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 圖片 URL */}
              {imageUrls.length > 0 && (
                <div>
                  <Label>圖片 URL</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`圖片 URL ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeImageUrl(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 新上傳的圖片 */}
              {images.length > 0 && (
                <div>
                  <Label>新上傳圖片</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`新圖片 ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 多件優惠 */}
          <Card>
            <CardHeader>
              <CardTitle>多件優惠設置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" variant="outline" onClick={addDiscountRule}>
                添加優惠規則
              </Button>
              
              {Object.keys(formData.multi_discount).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(formData.multi_discount).map(([key, value]) => {
                    const isItemDiscount = key.startsWith('item_');
                    const displayText = isItemDiscount
                      ? `第 ${key.replace('item_', '')} 件起每件減 ${value} 元`
                      : `${key} 件以上 - ${((1 - Number(value)) * 100).toFixed(0)}% 折扣`;

                    return (
                      <div key={key} className="flex items-center justify-between p-2 border rounded">
                        <span className={isItemDiscount ? 'text-green-700' : 'text-blue-700'}>
                          {displayText}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDiscountRule(isItemDiscount ? key : Number(key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 提交按鈕 */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : (product ? '更新商品' : '創建商品')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
