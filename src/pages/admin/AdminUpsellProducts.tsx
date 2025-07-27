import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/AdminLayout';
import { toast } from 'sonner';

interface UpsellProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  images: string[];
  is_active: boolean;
  created_at: string;
}

interface UpsellProductForm {
  name: string;
  price: string;
  stock: string;
  description: string;
}

const AdminUpsellProducts: React.FC = () => {
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UpsellProduct | null>(null);
  const [formData, setFormData] = useState<UpsellProductForm>({
    name: '',
    price: '',
    stock: '',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/upsell-products/admin/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data.products);
      } else {
        toast.error('獲取加購商品失敗');
      }
    } catch (error) {
      console.error('獲取加購商品失敗:', error);
      toast.error('獲取加購商品失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock) {
      toast.error('請填寫完整的商品信息');
      return;
    }

    try {
      const url = editingProduct 
        ? `/api/upsell-products/admin/${editingProduct.id}`
        : '/api/upsell-products/admin';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          description: formData.description,
          is_active: true
        })
      });

      if (response.ok) {
        toast.success(editingProduct ? '加購商品更新成功' : '加購商品創建成功');
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', stock: '', description: '' });
        fetchProducts();
      } else {
        toast.error(editingProduct ? '更新失敗' : '創建失敗');
      }
    } catch (error) {
      console.error('操作失敗:', error);
      toast.error('操作失敗');
    }
  };

  const handleEdit = (product: UpsellProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這個加購商品嗎？')) return;

    try {
      const response = await fetch(`/api/upsell-products/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        toast.success('加購商品刪除成功');
        fetchProducts();
      } else {
        toast.error('刪除失敗');
      }
    } catch (error) {
      console.error('刪除失敗:', error);
      toast.error('刪除失敗');
    }
  };

  const toggleActive = async (product: UpsellProduct) => {
    try {
      const response = await fetch(`/api/upsell-products/admin/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...product,
          is_active: !product.is_active
        })
      });

      if (response.ok) {
        toast.success(product.is_active ? '商品已停用' : '商品已啟用');
        fetchProducts();
      } else {
        toast.error('操作失敗');
      }
    } catch (error) {
      console.error('操作失敗:', error);
      toast.error('操作失敗');
    }
  };

  const handleImageUpload = async (productId: number, files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(`/api/upsell-products/admin/${productId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('圖片上傳成功');
        fetchProducts();
        // 如果正在編輯這個商品，更新編輯狀態
        if (editingProduct && editingProduct.id === productId) {
          setEditingProduct(prev => prev ? { ...prev, images: result.data.all_images } : null);
        }
      } else {
        toast.error('圖片上傳失敗');
      }
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      toast.error('圖片上傳失敗');
    }
  };

  const handleImageDelete = async (productId: number, imageName: string) => {
    if (!confirm('確定要刪除這張圖片嗎？')) return;

    try {
      const response = await fetch(`/api/upsell-products/admin/${productId}/images/${imageName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        toast.success('圖片刪除成功');
        fetchProducts();
        // 如果正在編輯這個商品，更新編輯狀態
        if (editingProduct && editingProduct.id === productId) {
          const updatedImages = editingProduct.images.filter(img => img !== imageName);
          setEditingProduct(prev => prev ? { ...prev, images: updatedImages } : null);
        }
      } else {
        toast.error('圖片刪除失敗');
      }
    } catch (error) {
      console.error('圖片刪除失敗:', error);
      toast.error('圖片刪除失敗');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">載入中...</div>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">加購商品管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增加購商品
        </Button>
      </div>

      {/* 商品表單 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? '編輯' : '新增'}加購商品</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">商品名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="請輸入商品名稱"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">加購價格 *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="請輸入價格"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">庫存數量 *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="請輸入庫存"
                    required
                  />
                </div>

              </div>
              <div>
                <Label htmlFor="description">商品描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="請輸入商品描述"
                  rows={3}
                />
              </div>

              {/* 圖片上傳區域 */}
              {editingProduct && (
                <div>
                  <Label>商品圖片</Label>
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          上傳圖片
                        </span>
                      </Button>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleImageUpload(editingProduct.id, e.target.files)}
                      />
                    </label>

                    {/* 顯示已上傳的圖片 */}
                    {editingProduct.images && editingProduct.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {editingProduct.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={`/uploads/upsell/${image}`}
                              alt={`商品圖片 ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.errorHandled) {
                                  target.dataset.errorHandled = 'true';
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePiTwvdGV4dD48L3N2Zz4=';
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 w-6 h-6 p-0"
                              onClick={() => handleImageDelete(editingProduct.id, image)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    💡 提示：圖片只能在編輯模式下上傳。請先創建商品，然後編輯商品來上傳圖片。
                  </div>
                </div>
              )}

              {!editingProduct && (
                <div>
                  <Label>商品圖片</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">請先創建商品，然後編輯商品來上傳圖片</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit">
                  {editingProduct ? '更新' : '創建'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    setFormData({ name: '', price: '', stock: '', description: '' });
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 商品列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg">{product.name}</h3>
                  <div className="flex gap-1">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? '啟用' : '停用'}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>價格: NT$ {product.price}</p>
                  <p>庫存: {product.stock}</p>
                  <p>創建時間: {new Date(product.created_at).toLocaleDateString()}</p>
                </div>
                
                {product.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                )}

                {/* 圖片預覽 */}
                {product.images.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {product.images.slice(0, 3).map((image, index) => (
                      <img
                        key={index}
                        src={`/uploads/upsell/${image}`}
                        alt={`${product.name} 圖片 ${index + 1}`}
                        className="w-12 h-12 object-cover rounded border flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.errorHandled) {
                            target.dataset.errorHandled = 'true';
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePiTwvdGV4dD48L3N2Zz4=';
                          }
                        }}
                      />
                    ))}
                    {product.images.length > 3 && (
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                        +{product.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => toggleActive(product)}
                  >
                    {product.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          還沒有加購商品，點擊上方按鈕新增第一個商品
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default AdminUpsellProducts;
