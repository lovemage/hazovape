import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Upload, Download, AlertCircle, CheckCircle, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ProductForm } from '../../components/ProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

import { AdminLayout } from '../../components/AdminLayout';
import { toast } from 'sonner';
import { productAPI, adminAPI } from '../../services/api';
import { getProductImageUrl } from '../../utils/imageUtils';

interface Product {
  id: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  stock?: number;
  multi_discount?: string;
  images?: string[];
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

interface BatchImportResult {
  totalParsed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const [supportsSorting, setSupportsSorting] = useState(true); // 假設支持，實際檢測後更新
  
  // 批量導入相關狀態
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAllAdmin();
      if (response.data.success) {
        const productsData = response.data.data || [];
        
        // 檢測數據庫是否支持排序功能
        if (productsData.length > 0) {
          // 檢查sort_order是否是真實的數據庫字段
          // 如果sort_order都是連續的1,2,3...那很可能是後端動態添加的
          const sortOrders = productsData.map(p => p.sort_order).filter(order => order !== undefined);
          const isSequential = sortOrders.length === productsData.length && 
            sortOrders.every((order, index) => order === index + 1);
          
          // 如果是連續的1,2,3...則認為是動態添加的，數據庫不支持排序
          const isRealSortOrder = !isSequential;
          setSupportsSorting(isRealSortOrder);
          
          if (!isRealSortOrder) {
            console.log('⚠️ 檢測到數據庫尚未支持產品排序功能 - 將顯示升級按鈕');
            console.log('💡 sort_order值:', sortOrders, '判定為動態添加');
          } else {
            console.log('✅ 數據庫已支持產品排序功能');
            console.log('💡 sort_order值:', sortOrders, '判定為真實字段');
          }
        } else {
          // 如果沒有產品，預設不支持排序，顯示升級按鈕
          setSupportsSorting(false);
          console.log('ℹ️ 暫無產品，預設顯示升級按鈕');
        }
        
        // 對產品進行排序：啟用產品按sort_order排序在前，停用產品在後
        const activeProducts = productsData.filter(p => p.is_active);
        const inactiveProducts = productsData.filter(p => !p.is_active);
        
        // 啟用產品按sort_order排序
        activeProducts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        // 停用產品可以按名稱排序
        inactiveProducts.sort((a, b) => a.name.localeCompare(b.name));
        
        // 設置排序後的產品列表
        setProducts([...activeProducts, ...inactiveProducts]);
      }
    } catch (error) {
      console.error('載入產品失敗:', error);
      toast.error('載入產品失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      if (product.is_active) {
        await productAPI.delete(product.id);
        toast.success('產品已停用（可透過啟用按鈕恢復）');
      } else {
        await productAPI.restore(product.id);
        toast.success('產品已啟用');
      }
      loadProducts();
    } catch (error) {
      console.error('更新產品狀態失敗:', error);
      toast.error('更新產品狀態失敗');
    }
  };

  const handlePermanentDelete = async (product: Product) => {
    if (!confirm(`⚠️ 危險操作：確定要永久刪除產品「${product.name}」嗎？\n\n此操作將從數據庫中完全移除此產品及其所有規格，無法恢復！\n\n如果只是暫時不需要，建議使用"停用"功能。`)) {
      return;
    }

    try {
      const response = await productAPI.permanentDelete(product.id);
      if (response.data.success) {
        toast.success('產品已永久刪除');
        loadProducts();
      } else {
        toast.error(response.data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除產品失敗:', error);
      toast.error('刪除產品失敗');
    }
  };



  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    loadProducts();
  };

  // 處理拖拽排序
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !supportsSorting) return;

    // 只對所有產品進行排序（不受搜索過濾影響）
    const activeProducts = products.filter(p => p.is_active);
    const items = Array.from(activeProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新排序順序（保持10的倍數間隔）
    const updatedProducts = items.map((product, index) => ({
      ...product,
      sort_order: (index + 1) * 10  // 10, 20, 30, 40... 保持非連續值
    }));

    // 立即更新本地狀態 - 重新排序整個產品數組
    setProducts(prevProducts => {
      const newProducts = [...prevProducts];
      
      // 先更新啟用產品的sort_order
      updatedProducts.forEach(updatedProduct => {
        const index = newProducts.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) {
          newProducts[index] = updatedProduct;
        }
      });
      
      // 重新排序：啟用產品按sort_order排序，停用產品保持原位置
      const activeProductsNew = newProducts.filter(p => p.is_active);
      const inactiveProductsNew = newProducts.filter(p => !p.is_active);
      
      // 按sort_order排序啟用產品
      activeProductsNew.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      // 合併：啟用產品在前，停用產品在後
      return [...activeProductsNew, ...inactiveProductsNew];
    });

    try {
      // 發送到後端更新
      const sortData = updatedProducts.map(product => ({
        id: product.id,
        sort_order: product.sort_order!
      }));

      const response = await productAPI.updateSortOrder(sortData);
      if (response.data.success) {
        toast.success('產品排序已更新');
      } else {
        throw new Error(response.data.message || '更新失敗');
      }
    } catch (error: any) {
      console.error('更新排序失敗:', error);
      if (error.response?.data?.message?.includes('尚未支持產品排序功能')) {
        setSupportsSorting(false);
        setIsReordering(false);
        toast.error('數據庫尚未支持排序功能，請聯繫技術人員升級');
      } else {
        toast.error('更新排序失敗');
      }
      // 重新載入以恢復原始順序
      loadProducts();
    }
  };

  // 批量導入處理
  const handleBatchImport = async () => {
    if (!importFile) {
      toast.error('請選擇要上傳的txt文件');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('txtFile', importFile);

      const response = await productAPI.batchImport(formData);
      
      if (response.data.success) {
        setImportResult(response.data.data);
        toast.success(`批量導入完成！成功: ${response.data.data.successful}, 失敗: ${response.data.data.failed}`);
        loadProducts(); // 重新載入產品列表
      } else {
        toast.error(response.data.message || '批量導入失敗');
        setImportResult({
          totalParsed: 0,
          successful: 0,
          failed: 1,
          errors: [response.data.message || '批量導入失敗']
        });
      }
    } catch (error) {
      console.error('批量導入失敗:', error);
      toast.error('批量導入失敗');
      setImportResult({
        totalParsed: 0,
        successful: 0,
        failed: 1,
        errors: ['網路錯誤或服務器問題']
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/products/admin/batch-import/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.txt';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('模板文件已下載');
    } catch (error) {
      console.error('下載模板失敗:', error);
      toast.error('下載模板失敗');
    }
  };

  const resetBatchImport = () => {
    setImportFile(null);
    setImportResult(null);
    setShowBatchImport(false);
  };

  // 運行數據庫遷移
  const handleMigration = async () => {
    if (!confirm('確定要運行數據庫遷移嗎？\n\n這將為產品表添加排序功能，操作不可逆。')) {
      return;
    }

    try {
      console.log('🚀 開始執行數據庫遷移...');
      const response = await adminAPI.migrate();
      console.log('📦 遷移 API 響應:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
        console.log('✅ 遷移成功，重新載入產品列表...');
        
        // 等待一秒讓數據庫操作完成
        setTimeout(async () => {
          await loadProducts();
          console.log('🔄 產品列表已重新載入');
        }, 1000);
      } else {
        console.error('❌ 遷移API返回失敗:', response.data);
        toast.error(response.data.message || '遷移失敗');
      }
    } catch (error: any) {
      console.error('❌ 數據庫遷移失敗:', error);
      toast.error(error.response?.data?.message || '數據庫遷移失敗');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">產品管理</h1>
          <div className="flex gap-3">
            {supportsSorting && (
              <Button
                onClick={() => setIsReordering(!isReordering)}
                variant="outline"
                className={`flex items-center gap-2 ${isReordering ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <GripVertical className="w-4 h-4" />
                {isReordering ? '完成排序' : '調整順序'}
              </Button>
            )}
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下載模板
            </Button>
            <Button
              onClick={() => setShowBatchImport(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              批量導入
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增產品
            </Button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索產品名稱或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 產品列表 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>產品列表 ({filteredProducts.length})</CardTitle>
              {isReordering && supportsSorting && (
                <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">
                  🔄 拖拽產品卡片可調整顯示順序 (僅顯示啟用的產品)
                </div>
              )}
              {!supportsSorting && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-amber-600 bg-amber-100 px-3 py-1 rounded-lg">
                    ⚠️ 數據庫尚未支持產品排序功能
                  </div>
                  <Button
                    onClick={handleMigration}
                    variant="outline"
                    size="sm"
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    升級數據庫
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">載入中...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? '沒有找到符合條件的產品' : '暫無產品'}
              </div>
            ) : isReordering && supportsSorting ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="products" direction="vertical">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {/* 排序模式下只顯示啟用的產品 */}
                      {products.filter(p => p.is_active).map((product, index) => (
                        <Draggable key={product.id} draggableId={String(product.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`
                                flex items-center gap-4 p-4 border rounded-lg bg-white 
                                ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'}
                                transition-all duration-200
                              `}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="flex items-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={getProductImageUrl(product)}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-semibold truncate ${product.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {product.name}
                                  </h3>
                                  {!product.is_active && (
                                    <Badge variant="secondary" className="text-xs">
                                      已停用
                                    </Badge>
                                  )}
                                </div>
                                {product.category && (
                                  <Badge variant="outline" className="text-xs mb-1">
                                    {product.category}
                                  </Badge>
                                )}
                                <div className="text-sm text-gray-600">
                                  NT$ {Math.round(product.price).toLocaleString()}
                                  {product.description && (
                                    <span className="ml-2 text-gray-500 truncate">
                                      {product.description.substring(0, 50)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>第 {index + 1} 位</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className={`font-semibold line-clamp-2 ${product.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                              {product.name}
                            </h3>
                            {!product.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                已停用
                              </Badge>
                            )}
                          </div>
                          {product.category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleToggleStatus(product)}
                            variant="ghost"
                            size="sm"
                            title={product.is_active ? "停用產品" : "啟用產品"}
                            className={`p-1 ${product.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          {!product.is_active && (
                            <Button
                              onClick={() => handlePermanentDelete(product)}
                              variant="ghost"
                              size="sm"
                              title="永久刪除產品（僅限已停用的產品）"
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 產品圖片 */}
                      <div className={`aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden ${!product.is_active ? 'opacity-50' : ''}`}>
                        <img
                          src={getProductImageUrl(product)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-600">
                            NT$ {Math.round(product.price).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500">
                            庫存: {product.stock || 0}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="flex justify-start items-center pt-2">
                          <Button
                            onClick={() => handleEdit(product)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            編輯
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 批量導入對話框 */}
        <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                批量導入產品
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* 格式說明 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">📄 文件格式說明：</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <h5 className="font-medium mb-2">基本要求：</h5>
                    <ul className="space-y-1">
                      <li>• 使用 .txt 文件，UTF-8 編碼</li>
                      <li>• 每個產品用 "---" 分隔</li>
                      <li>• 格式：字段名: 值（冒號後要空格）</li>
                      <li>• 檔案大小建議不超過 10MB</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">字段說明：</h5>
                    <ul className="space-y-1">
                      <li>• <span className="font-medium text-red-700">必填</span>：名稱、價格</li>
                      <li>• <span className="font-medium text-green-700">可選</span>：庫存、分類、描述</li>
                      <li>• <span className="font-medium text-purple-700">進階</span>：多件優惠、是否啟用</li>
                      <li>• 多件優惠格式：{`{"2": 0.9, "5": 0.8}`}</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-2">🏷️ 可用分類：</h5>
                  <div className="flex flex-wrap gap-2">
                    {['一次性拋棄式電子煙', '注油式主機與耗材', '拋棄式通用煙蛋系列', '小煙油系列', '其他產品'].map(category => (
                      <span key={category} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-blue-200">
                  <details className="text-sm">
                    <summary className="font-medium text-blue-900 cursor-pointer hover:text-blue-700">
                      📝 範例格式 (點擊展開)
                    </summary>
                    <pre className="mt-2 p-3 bg-blue-100 rounded text-xs overflow-x-auto">
{`名稱: OXVA NEXLIM 大蠻牛
價格: 300
庫存: 100
分類: 一次性拋棄式電子煙
描述: 高品質電子煙設備...
多件優惠: {"2": 0.9, "5": 0.8}
是否啟用: true
---
名稱: 另一個產品
價格: 250
庫存: 50
分類: 注油式主機與耗材
描述: 產品描述...
是否啟用: true`}
                    </pre>
                  </details>
                </div>
              </div>

              {/* 文件上傳 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    選擇 txt 文件：
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>

                {importFile && (
                  <div className="text-sm text-gray-600">
                    已選擇文件: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* 導入結果 */}
              {importResult && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">導入結果：</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-gray-700">{importResult.totalParsed}</div>
                      <div className="text-sm text-gray-600">解析總數</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-green-700 flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {importResult.successful}
                      </div>
                      <div className="text-sm text-green-600">成功</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-red-700 flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {importResult.failed}
                      </div>
                      <div className="text-sm text-red-600">失敗</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <h5 className="font-medium text-red-900 mb-2">錯誤詳情：</h5>
                      <div className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex justify-between">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下載模板
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    onClick={resetBatchImport}
                    variant="outline"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleBatchImport}
                    disabled={!importFile || importing}
                    className="flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        導入中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        開始導入
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 產品表單對話框 */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? '編輯產品' : '新增產品'}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>


      </div>
    </AdminLayout>
  );
};
