import React, { useState, useEffect } from 'react';
import {
  Coffee, Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown,
  Search, ChevronDown, ChevronRight, Package, Grid3X3, Layers, PlusCircle,
  FileText, Upload, Download, AlertCircle, CheckCircle, BoxSelect, BarChart3, ToggleLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AdminLayout } from '../../components/AdminLayout';
import { FlavorForm } from '../../components/FlavorForm';
import { BatchFlavorForm } from '../../components/BatchFlavorForm';
import { flavorAPI, productAPI } from '../../services/api';
import { toast } from 'sonner';
import { Flavor, Product } from '../../types';

interface ProductWithFlavors extends Product {
  flavors: Flavor[];
}

interface BatchImportResult {
  totalGroups: number;
  successful: number;
  failed: number;
  totalFlavors: number;
  errors: string[];
}

export const AdminFlavors: React.FC = () => {
  const [products, setProducts] = useState<ProductWithFlavors[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [showBatchStock, setShowBatchStock] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  
  // 批量導入相關狀態
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  // 批量修改庫存相關狀態
  const [selectedFlavors, setSelectedFlavors] = useState<Set<number>>(new Set());
  const [batchStockValue, setBatchStockValue] = useState('');
  const [stockUpdateMode, setStockUpdateMode] = useState<'set' | 'add' | 'subtract'>('set');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [flavorSearchTerm, setFlavorSearchTerm] = useState('');

  // 批量狀態更新相關狀態
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [selectedStatusFlavors, setSelectedStatusFlavors] = useState<Set<number>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadProductsWithFlavors();
  }, []);

  const loadProductsWithFlavors = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📦 載入商品和規格數據...');

      // 同時載入商品和規格
      const [productsResponse, flavorsResponse] = await Promise.all([
        productAPI.getAllAdmin(),
        flavorAPI.getAllAdmin()
      ]);

      if (productsResponse.data.success && flavorsResponse.data.success) {
        const productsData = productsResponse.data.data || [];
        const flavorsData = flavorsResponse.data.data || [];

        // 將規格按商品分組
        const productsWithFlavors: ProductWithFlavors[] = productsData.map((product: Product) => ({
          ...product,
          flavors: flavorsData.filter((flavor: Flavor) => flavor.product_id === product.id)
        }));

        setProducts(productsWithFlavors);

        // 預設所有商品都收合
        setExpandedProducts(new Set());

        console.log('✅ 載入完成，共', productsWithFlavors.length, '個商品');
      } else {
        setError('載入數據失敗');
      }
    } catch (error) {
      console.error('❌ 載入失敗:', error);
      setError('載入數據失敗');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductExpansion = (productId: number) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddFlavor = (productId: number) => {
    setSelectedProductId(productId);
    setEditingFlavor(undefined);
    setShowForm(true);
  };

  const handleEditFlavor = (flavor: Flavor) => {
    setSelectedProductId(flavor.product_id);
    setEditingFlavor(flavor);
    setShowForm(true);
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await flavorAPI.delete(id);
        toast.success('規格已停用（可透過啟用按鈕恢復）');
      } else {
        await flavorAPI.restore(id);
        toast.success('規格已啟用');
      }
      await loadProductsWithFlavors();
    } catch (error) {
      console.error('更新規格狀態失敗:', error);
      toast.error('更新規格狀態失敗');
    }
  };

  const handleDeleteFlavor = async (flavor: Flavor) => {
    if (!confirm(`⚠️ 危險操作：確定要永久刪除規格「${flavor.name}」嗎？\n\n此操作將從數據庫中完全移除此規格，無法恢復！\n\n如果只是暫時不需要，建議使用"停用"功能。`)) {
      return;
    }

    try {
      await flavorAPI.permanentDelete(flavor.id);
      toast.success('規格已永久刪除');
      await loadProductsWithFlavors();
    } catch (error) {
      console.error('刪除規格失敗:', error);
      toast.error('刪除規格失敗');
    }
  };



  const handleFormClose = () => {
    setShowForm(false);
    setShowBatchForm(false);
    setEditingFlavor(undefined);
    setSelectedProductId(undefined);
  };

  const handleFormSuccess = () => {
    loadProductsWithFlavors();
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

      const response = await flavorAPI.batchImport(formData);
      
      if (response.data.success) {
        setImportResult(response.data.data);
        toast.success(`批量導入完成！成功: ${response.data.data.successful}, 失敗: ${response.data.data.failed}, 總規格數: ${response.data.data.totalFlavors}`);
        loadProductsWithFlavors(); // 重新載入數據
      } else {
        toast.error(response.data.message || '批量導入失敗');
        setImportResult({
          totalGroups: 0,
          successful: 0,
          failed: 1,
          totalFlavors: 0,
          errors: [response.data.message || '批量導入失敗']
        });
      }
    } catch (error) {
      console.error('批量導入失敗:', error);
      toast.error('批量導入失敗');
      setImportResult({
        totalGroups: 0,
        successful: 0,
        failed: 1,
        totalFlavors: 0,
        errors: ['網路錯誤或服務器問題']
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/flavors/admin/batch-import/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flavor_import_template.txt';
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

  // 批量修改庫存相關函數
  const handleBatchStockUpdate = async () => {
    if (selectedFlavors.size === 0) {
      toast.error('請選擇要修改的規格');
      return;
    }

    if (!batchStockValue.trim()) {
      toast.error('請輸入庫存數量');
      return;
    }

    const stockValue = parseInt(batchStockValue);
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('請輸入有效的庫存數量');
      return;
    }

    try {
      setUpdatingStock(true);
      
      const response = await flavorAPI.batchUpdateStock({
        flavorIds: Array.from(selectedFlavors),
        mode: stockUpdateMode,
        value: stockValue
      });
      
      if (response.data.success) {
        toast.success(`成功更新 ${selectedFlavors.size} 個規格的庫存`);
        loadProductsWithFlavors(); // 重新載入數據
        resetBatchStock();
      } else {
        toast.error(response.data.message || '批量修改庫存失敗');
      }
    } catch (error) {
      console.error('批量修改庫存失敗:', error);
      toast.error('批量修改庫存失敗');
    } finally {
      setUpdatingStock(false);
    }
  };

  const resetBatchStock = () => {
    setSelectedFlavors(new Set());
    setBatchStockValue('');
    setStockUpdateMode('set');
    setFlavorSearchTerm('');
    setShowBatchStock(false);
  };

  const toggleSelectAllFlavors = () => {
    const allFlavors = products.flatMap(product => product.flavors.map(flavor => flavor.id));
    if (selectedFlavors.size === allFlavors.length) {
      setSelectedFlavors(new Set());
    } else {
      setSelectedFlavors(new Set(allFlavors));
    }
  };

  // 批量狀態更新相關函數
  const handleBatchStatusUpdate = async (action: 'enable' | 'disable') => {
    if (selectedStatusFlavors.size === 0) {
      toast.error('請選擇要操作的規格');
      return;
    }

    try {
      setUpdatingStatus(true);
      
      const response = await flavorAPI.batchUpdateStatus({
        flavorIds: Array.from(selectedStatusFlavors),
        action
      });
      
      if (response.data.success) {
        const actionText = action === 'enable' ? '啟用' : '停用';
        toast.success(`成功${actionText} ${selectedStatusFlavors.size} 個規格`);
        loadProductsWithFlavors(); // 重新載入數據
        resetBatchStatus();
      } else {
        toast.error(response.data.message || '批量更新狀態失敗');
      }
    } catch (error) {
      console.error('批量更新狀態失敗:', error);
      toast.error('批量更新狀態失敗');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetBatchStatus = () => {
    setSelectedStatusFlavors(new Set());
    setShowBatchStatus(false);
  };

  const toggleSelectAllStatusFlavors = () => {
    const allFlavors = products.flatMap(product => product.flavors.map(flavor => flavor.id));
    if (selectedStatusFlavors.size === allFlavors.length) {
      setSelectedStatusFlavors(new Set());
    } else {
      setSelectedStatusFlavors(new Set(allFlavors));
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
          <Button onClick={loadProductsWithFlavors}>重試</Button>
        </div>
      </AdminLayout>
    );
  }

  // 過濾和統計數據
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.flavors.some(flavor =>
      flavor.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalFlavors = products.reduce((sum, product) => sum + product.flavors.length, 0);
  const activeFlavors = products.reduce((sum, product) =>
    sum + product.flavors.filter(f => f.is_active).length, 0
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題和統計 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Grid3X3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">規格管理</h1>
              <p className="text-gray-600">
                按商品分類管理規格，共 {totalFlavors} 個規格（{activeFlavors} 個啟用）
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>下載模板</span>
            </Button>
            <Button
              onClick={() => setShowBatchImport(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>批量導入</span>
            </Button>
            <Button
              onClick={() => setShowBatchStock(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>批量修改庫存</span>
            </Button>
            <Button
              onClick={() => setShowBatchStatus(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ToggleLeft className="w-4 h-4" />
              <span>批量啟用/停用</span>
            </Button>
            <Button
              onClick={() => setShowBatchForm(true)}
              className="flex items-center space-x-2"
              variant="outline"
            >
              <Layers className="w-4 h-4" />
              <span>批量新增</span>
            </Button>
            <Button
              onClick={() => {
                setSelectedProductId(undefined);
                setEditingFlavor(undefined);
                setShowForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>新增規格</span>
            </Button>
          </div>
        </div>

        {/* 搜索和過濾 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索商品或規格名稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const allProductIds = new Set(products.map(p => p.id));
                  setExpandedProducts(
                    expandedProducts.size === products.length ? new Set() : allProductIds
                  );
                }}
              >
                {expandedProducts.size === products.length ? '全部收合' : '全部展開'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 商品分組列表 */}
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleProductExpansion(product.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedProducts.has(product.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <Package className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {product.flavors.length} 個規格
                        {product.flavors.filter(f => f.is_active).length !== product.flavors.length && (
                          <span className="text-orange-600">
                            （{product.flavors.filter(f => f.is_active).length} 個啟用）
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? '啟用' : '停用'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFlavor(product.id);
                      }}
                      className="flex items-center space-x-1"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>新增規格</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedProducts.has(product.id) && (
                <CardContent className="pt-0">
                  {product.flavors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>此商品尚無規格</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddFlavor(product.id)}
                        className="mt-3"
                      >
                        新增第一個規格
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {product.flavors.map((flavor) => (
                        <div
                          key={flavor.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <Coffee className="w-4 h-4 text-gray-600" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{flavor.name}</span>
                                {!flavor.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    已停用
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-500">
                                <span>庫存: {flavor.stock}</span>
                                <span>分類: {flavor.category_name || '未分類'}</span>
                                {/* 顯示價格信息 */}
                                <span className="font-medium text-blue-600">
                                  {flavor.price !== null && flavor.price !== undefined ? (
                                    <>NT$ {Math.round(flavor.price).toLocaleString()}</>
                                  ) : (
                                    <>NT$ {Math.round(flavor.product_base_price || 0).toLocaleString()}</>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditFlavor(flavor)}
                              title="編輯規格"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(flavor.id, flavor.is_active)}
                              title={flavor.is_active ? "停用規格" : "啟用規格"}
                              className={flavor.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            >
                              {flavor.is_active ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            {!flavor.is_active && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFlavor(flavor)}
                                title="永久刪除規格（僅限已停用的規格）"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到相關商品或規格</h3>
              <p className="text-gray-600">請嘗試調整搜索條件</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 規格表單 */}
      {showForm && (
        <FlavorForm
          flavor={editingFlavor}
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* 批量新增表單 */}
      {showBatchForm && (
        <BatchFlavorForm
          onSubmit={loadProductsWithFlavors}
          onCancel={() => setShowBatchForm(false)}
        />
      )}

      {/* 批量導入對話框 */}
      <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              批量導入規格
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 格式說明 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">📄 文件格式說明：</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div>
                  <h5 className="font-medium mb-1">基本要求：</h5>
                  <ul className="space-y-1 ml-4">
                    <li>• 使用 .txt 文件，UTF-8 編碼</li>
                    <li>• 每個產品組用 "---" 分隔或空行分隔</li>
                    <li>• 產品名稱必須是系統中已存在的產品</li>
                    <li>• 每行一個規格名稱</li>
                  </ul>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <details className="text-sm">
                    <summary className="font-medium text-blue-900 cursor-pointer hover:text-blue-700">
                      📝 範例格式 (點擊展開)
                    </summary>
                    <pre className="mt-2 p-3 bg-blue-100 rounded text-xs overflow-x-auto">
{`產品名稱: OXVA NEXLIM 大蠻牛
規格:
西瓜
蘋果
葡萄
榴蓮
芒果
---
產品名稱: OXVA XLIM PRO 2
分類: 煙油口味
規格:
香草
巧克力
咖啡
抹茶`}
                    </pre>
                  </details>
                </div>
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
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-gray-700">{importResult.totalGroups}</div>
                    <div className="text-gray-600">產品組</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-green-700 flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {importResult.successful}
                    </div>
                    <div className="text-green-600">成功</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-red-700 flex items-center justify-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {importResult.failed}
                    </div>
                    <div className="text-red-600">失敗</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-700">{importResult.totalFlavors}</div>
                    <div className="text-purple-600">總規格</div>
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

      {/* 批量修改庫存對話框 */}
      <Dialog open={showBatchStock} onOpenChange={resetBatchStock}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              批量修改庫存
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 選擇統計和操作 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-blue-700">
                  已選擇 {selectedFlavors.size} 個規格
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedFlavors(new Set())}
                    className="text-xs"
                    disabled={selectedFlavors.size === 0}
                  >
                    清除選擇
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // 只選擇啟用的規格
                      const activeFlavors = products.flatMap(p => p.flavors.filter(f => f.is_active).map(f => f.id));
                      setSelectedFlavors(new Set(activeFlavors));
                    }}
                    className="text-xs"
                  >
                    選擇啟用規格
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectAllFlavors}
                    className="text-xs"
                  >
                    {selectedFlavors.size === products.flatMap(p => p.flavors).length ? '取消全選' : '全選'}
                  </Button>
                </div>
              </div>
              
              {/* 已選擇規格明細列表移除，保留勾選與操作，避免頁面過長 */}
            </div>

            {/* 規格選擇區域 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    選擇要修改的規格
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 可以選擇不同商品的規格進行批量修改，點擊商品名稱展開規格列表
                  </p>
                </div>
                <div className="flex-1 max-w-sm ml-4">
                  <Input
                    placeholder="搜索商品或規格..."
                    value={flavorSearchTerm}
                    onChange={(e) => setFlavorSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {products.filter(product => {
                  if (!flavorSearchTerm) return true;
                  const searchLower = flavorSearchTerm.toLowerCase();
                  return product.name.toLowerCase().includes(searchLower) ||
                         product.flavors.some(flavor => flavor.name.toLowerCase().includes(searchLower));
                }).map(product => {
                  const filteredFlavors = product.flavors.filter(flavor => {
                    if (!flavorSearchTerm) return true;
                    const searchLower = flavorSearchTerm.toLowerCase();
                    return product.name.toLowerCase().includes(searchLower) ||
                           flavor.name.toLowerCase().includes(searchLower);
                  });
                  
                  if (filteredFlavors.length === 0) return null;
                  
                  return (
                  <div key={product.id} className="border-b last:border-b-0">
                    <div 
                      className="p-2 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => {
                        const expanded = new Set(expandedProducts);
                        if (expanded.has(product.id)) {
                          expanded.delete(product.id);
                        } else {
                          expanded.add(product.id);
                        }
                        setExpandedProducts(expanded);
                      }}
                    >
                      <span className="font-medium text-sm">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 選擇/取消選擇該商品的所有規格
                            const productFlavorIds = filteredFlavors.map(f => f.id);
                            const allSelected = productFlavorIds.every(id => selectedFlavors.has(id));
                            const newSelected = new Set(selectedFlavors);
                            
                            if (allSelected) {
                              // 取消選擇該商品所有規格
                              productFlavorIds.forEach(id => newSelected.delete(id));
                            } else {
                              // 選擇該商品所有規格
                              productFlavorIds.forEach(id => newSelected.add(id));
                            }
                            setSelectedFlavors(newSelected);
                          }}
                          className="text-xs px-2 py-1 h-6"
                        >
                          {filteredFlavors.every(f => selectedFlavors.has(f.id)) ? '取消全選' : '全選此商品'}
                        </Button>
                        <span className="text-xs text-gray-500">
                          {filteredFlavors.length} 個規格
                        </span>
                        {expandedProducts.has(product.id) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </div>
                    </div>
                    
                    {expandedProducts.has(product.id) && (
                      <div className="p-1 space-y-0.5">
                        {filteredFlavors.map(flavor => (
                          <div key={flavor.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded text-sm">
                            <Checkbox
                              checked={selectedFlavors.has(flavor.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedFlavors);
                                if (checked) {
                                  newSelected.add(flavor.id);
                                } else {
                                  newSelected.delete(flavor.id);
                                }
                                setSelectedFlavors(newSelected);
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{flavor.name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>庫存: {flavor.stock}</span>
                                  {!flavor.is_active && (
                                    <Badge variant="secondary" className="text-xs py-0 px-1 h-4">已停用</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* 修改模式選擇 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                修改模式
              </label>
              <Select value={stockUpdateMode} onValueChange={(value) => setStockUpdateMode(value as 'set' | 'add' | 'subtract')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">設定為指定數量</SelectItem>
                  <SelectItem value="add">增加指定數量</SelectItem>
                  <SelectItem value="subtract">減少指定數量</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 庫存數量輸入 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                {stockUpdateMode === 'set' ? '設定庫存數量' : 
                 stockUpdateMode === 'add' ? '增加庫存數量' : '減少庫存數量'}
              </label>
              <Input
                type="number"
                value={batchStockValue}
                onChange={(e) => setBatchStockValue(e.target.value)}
                placeholder="請輸入數量"
                min="0"
              />
            </div>

            {/* 預覽效果 */}
            {batchStockValue && selectedFlavors.size > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  預覽：{selectedFlavors.size} 個規格的庫存將
                  {stockUpdateMode === 'set' ? `設定為 ${batchStockValue}` :
                   stockUpdateMode === 'add' ? `增加 ${batchStockValue}` :
                   `減少 ${batchStockValue}`}
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={resetBatchStock}
                variant="outline"
              >
                取消
              </Button>
              <Button
                onClick={handleBatchStockUpdate}
                disabled={!batchStockValue || selectedFlavors.size === 0 || updatingStock}
                className="flex items-center gap-2"
              >
                {updatingStock ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    更新中...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    確認修改
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量啟用/停用對話框 */}
      <Dialog open={showBatchStatus} onOpenChange={resetBatchStatus}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ToggleLeft className="w-5 h-5" />
              批量啟用/停用規格
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 選擇統計和操作 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-blue-700">
                  已選擇 {selectedStatusFlavors.size} 個規格
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStatusFlavors(new Set())}
                    className="text-xs"
                    disabled={selectedStatusFlavors.size === 0}
                  >
                    清除選擇
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // 只選擇啟用的規格
                      const activeFlavors = products.flatMap(p => p.flavors.filter(f => f.is_active).map(f => f.id));
                      setSelectedStatusFlavors(new Set(activeFlavors));
                    }}
                    className="text-xs"
                  >
                    選擇啟用規格
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // 只選擇停用的規格
                      const inactiveFlavors = products.flatMap(p => p.flavors.filter(f => !f.is_active).map(f => f.id));
                      setSelectedStatusFlavors(new Set(inactiveFlavors));
                    }}
                    className="text-xs"
                  >
                    選擇停用規格
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectAllStatusFlavors}
                    className="text-xs"
                  >
                    {selectedStatusFlavors.size === products.flatMap(p => p.flavors).length ? '取消全選' : '全選'}
                  </Button>
                </div>
              </div>
            </div>

            {/* 規格選擇區域 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    選擇要操作的規格
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 可以選擇不同商品的規格進行批量啟用或停用操作
                  </p>
                </div>
                <div className="flex-1 max-w-sm ml-4">
                  <Input
                    placeholder="搜索商品或規格..."
                    value={flavorSearchTerm}
                    onChange={(e) => setFlavorSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {products.filter(product => {
                  if (!flavorSearchTerm) return true;
                  const searchLower = flavorSearchTerm.toLowerCase();
                  return product.name.toLowerCase().includes(searchLower) ||
                         product.flavors.some(flavor => flavor.name.toLowerCase().includes(searchLower));
                }).map(product => {
                  const filteredFlavors = product.flavors.filter(flavor => {
                    if (!flavorSearchTerm) return true;
                    const searchLower = flavorSearchTerm.toLowerCase();
                    return product.name.toLowerCase().includes(searchLower) ||
                           flavor.name.toLowerCase().includes(searchLower);
                  });
                  
                  if (filteredFlavors.length === 0) return null;
                  
                  return (
                  <div key={product.id} className="border-b last:border-b-0">
                    <div 
                      className="p-2 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => {
                        const expanded = new Set(expandedProducts);
                        if (expanded.has(product.id)) {
                          expanded.delete(product.id);
                        } else {
                          expanded.add(product.id);
                        }
                        setExpandedProducts(expanded);
                      }}
                    >
                      <span className="font-medium text-sm">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 選擇/取消選擇該商品的所有規格
                            const productFlavorIds = filteredFlavors.map(f => f.id);
                            const allSelected = productFlavorIds.every(id => selectedStatusFlavors.has(id));
                            const newSelected = new Set(selectedStatusFlavors);
                            
                            if (allSelected) {
                              // 取消選擇該商品所有規格
                              productFlavorIds.forEach(id => newSelected.delete(id));
                            } else {
                              // 選擇該商品所有規格
                              productFlavorIds.forEach(id => newSelected.add(id));
                            }
                            setSelectedStatusFlavors(newSelected);
                          }}
                          className="text-xs px-2 py-1 h-6"
                        >
                          {filteredFlavors.every(f => selectedStatusFlavors.has(f.id)) ? '取消全選' : '全選此商品'}
                        </Button>
                        <span className="text-xs text-gray-500">
                          {filteredFlavors.length} 個規格
                        </span>
                        {expandedProducts.has(product.id) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </div>
                    </div>
                    
                    {expandedProducts.has(product.id) && (
                      <div className="p-1 space-y-0.5">
                        {filteredFlavors.map(flavor => (
                          <div key={flavor.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded text-sm">
                            <Checkbox
                              checked={selectedStatusFlavors.has(flavor.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedStatusFlavors);
                                if (checked) {
                                  newSelected.add(flavor.id);
                                } else {
                                  newSelected.delete(flavor.id);
                                }
                                setSelectedStatusFlavors(newSelected);
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{flavor.name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Badge 
                                    variant={flavor.is_active ? "default" : "secondary"}
                                    className="text-xs py-0 px-1 h-4"
                                  >
                                    {flavor.is_active ? '啟用' : '停用'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* 預覽效果 */}
            {selectedStatusFlavors.size > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  已選擇 {selectedStatusFlavors.size} 個規格，可執行以下操作：
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBatchStatusUpdate('enable')}
                    disabled={updatingStatus}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                  >
                    {updatingStatus ? '處理中...' : '批量啟用'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBatchStatusUpdate('disable')}
                    disabled={updatingStatus}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1"
                  >
                    {updatingStatus ? '處理中...' : '批量停用'}
                  </Button>
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={resetBatchStatus}
                variant="outline"
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};
