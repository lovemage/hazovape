import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { AdminLayout } from '../../components/AdminLayout';
import { ProductForm } from '../../components/ProductForm';
import { productAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { toast } from 'sonner';
import { Product } from '../../types';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAllAdmin();
      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setError('載入產品失敗');
      }
    } catch (error) {
      console.error('載入產品失敗:', error);
      setError('載入產品失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await productAPI.delete(id);
        toast.success('產品已停用');
      } else {
        await productAPI.restore(id);
        toast.success('產品已啟用');
      }
      await loadProducts();
    } catch (error) {
      console.error('更新產品狀態失敗:', error);
      toast.error('更新產品狀態失敗');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`確定要永久刪除產品「${name}」嗎？此操作會同時刪除所有相關規格，無法撤銷。`)) {
      return;
    }

    try {
      await productAPI.permanentDelete(id);
      toast.success('產品及相關規格已永久刪除');
      await loadProducts();
    } catch (error) {
      console.error('刪除產品失敗:', error);
      toast.error('刪除產品失敗');
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  const handleFormSuccess = () => {
    loadProducts();
  };

  const getDiscountText = (multiDiscount: any) => {
    if (!multiDiscount) return '無';
    try {
      const discounts = typeof multiDiscount === 'string' 
        ? JSON.parse(multiDiscount) 
        : multiDiscount;
      
      return Object.entries(discounts)
        .map(([qty, discount]: [string, any]) => `${qty}件${((1 - discount) * 100).toFixed(0)}%折`)
        .join(', ');
    } catch {
      return '無';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadProducts}>重試</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="h-8 w-8" />
              商品管理
            </h1>
            <p className="text-gray-600 mt-2">管理商品信息、價格和庫存</p>
          </div>
          <Button onClick={handleAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            新增商品
          </Button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總商品數</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">啟用商品</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">停用商品</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => !p.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總庫存</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 商品列表 */}
        <Card>
          <CardHeader>
            <CardTitle>商品列表</CardTitle>
            <CardDescription>管理所有商品的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無商品數據
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        {(() => {
                          const images = Array.isArray(product.images)
                            ? product.images
                            : (product.images ? JSON.parse(product.images) : []);

                          return images && images.length > 0 ? (
                            <img
                              src={getImageUrl(images[0])}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          );
                        })()}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>價格: NT$ {Math.round(product.price).toLocaleString()}</span>
                          <span>庫存: {product.stock}</span>
                          <span>優惠: {getDiscountText(product.multi_discount)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? '啟用' : '停用'}
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStatus(product.id, product.is_active)}
                        >
                          {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          title="永久刪除產品"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 產品表單 */}
      <ProductForm
        product={editingProduct}
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </AdminLayout>
  );
};
