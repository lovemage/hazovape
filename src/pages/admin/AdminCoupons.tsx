import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Search, Filter, Edit2, Trash2, Calendar, Users, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AdminLayout } from '../../components/AdminLayout';
import { couponAPI } from '../../services/api';
import { Coupon } from '../../types';
import { toast } from 'sonner';

interface CouponForm {
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  min_order_amount: number;
  max_discount?: number;
  usage_limit?: number;
  per_user_limit: number;
  valid_from: string;
  valid_until: string;
}

const defaultForm: CouponForm = {
  code: '',
  name: '',
  description: '',
  type: 'percentage',
  value: 0,
  min_order_amount: 0,
  per_user_limit: 1,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 30 days from now
};

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 表單相關狀態
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
  const [couponStats, setCouponStats] = useState<any>(null);
  const [formData, setFormData] = useState<CouponForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, [currentPage, searchTerm, statusFilter]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponAPI.getAllAdmin({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });

      if (response.data.success) {
        setCoupons(response.data.data.coupons);
        setTotalPages(response.data.data.pagination.total_pages);
      } else {
        toast.error('載入優惠券失敗');
      }
    } catch (error) {
      console.error('載入優惠券失敗:', error);
      toast.error('載入優惠券失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await couponAPI.create(formData);
      
      if (response.data.success) {
        toast.success('優惠券創建成功');
        setShowCreateDialog(false);
        setFormData(defaultForm);
        loadCoupons();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error('創建優惠券失敗:', error);
      toast.error(error.response?.data?.message || '創建優惠券失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!currentCoupon) return;
    
    try {
      setSubmitting(true);
      const response = await couponAPI.update(currentCoupon.id, formData);
      
      if (response.data.success) {
        toast.success('優惠券更新成功');
        setShowEditDialog(false);
        setCurrentCoupon(null);
        setFormData(defaultForm);
        loadCoupons();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error('更新優惠券失敗:', error);
      toast.error(error.response?.data?.message || '更新優惠券失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`確定要刪除優惠券「${coupon.name}」嗎？`)) return;

    try {
      const response = await couponAPI.delete(coupon.id);
      
      if (response.data.success) {
        toast.success(response.data.message);
        loadCoupons();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error('刪除優惠券失敗:', error);
      toast.error(error.response?.data?.message || '刪除優惠券失敗');
    }
  };

  const handleViewStats = async (coupon: Coupon) => {
    try {
      const response = await couponAPI.getStats(coupon.id);
      if (response.data.success) {
        setCouponStats(response.data.data);
        setCurrentCoupon(coupon);
        setShowStatsDialog(true);
      }
    } catch (error) {
      console.error('載入統計失敗:', error);
      toast.error('載入統計失敗');
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setCurrentCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount || undefined,
      usage_limit: coupon.usage_limit || undefined,
      per_user_limit: coupon.per_user_limit,
      valid_from: coupon.valid_from.slice(0, 16),
      valid_until: coupon.valid_until.slice(0, 16),
    });
    setShowEditDialog(true);
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'percentage': return '百分比折扣';
      case 'fixed_amount': return '固定金額';
      case 'free_shipping': return '免運券';
      default: return type;
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (!coupon.is_active) {
      return <Badge variant="secondary">已停用</Badge>;
    }
    
    if (now < validFrom) {
      return <Badge variant="outline">未開始</Badge>;
    }
    
    if (now > validUntil) {
      return <Badge variant="destructive">已過期</Badge>;
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return <Badge variant="destructive">已用完</Badge>;
    }
    
    return <Badge variant="default" className="bg-green-500">使用中</Badge>;
  };

  const formatValue = (coupon: Coupon) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}% 折扣`;
      case 'fixed_amount':
        return `減 NT$ ${coupon.value}`;
      case 'free_shipping':
        return '免運費';
      default:
        return coupon.value.toString();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">優惠券管理</h1>
            <p className="text-gray-500">管理商店的優惠券和促銷活動</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新增優惠券
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新增優惠券</DialogTitle>
                <DialogDescription>創建新的優惠券</DialogDescription>
              </DialogHeader>
              <CouponForm 
                formData={formData} 
                setFormData={setFormData}
                onSubmit={handleCreate}
                submitting={submitting}
                isEdit={false}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜索和篩選 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索優惠券代碼或名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="狀態篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="active">啟用中</SelectItem>
                  <SelectItem value="inactive">已停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 優惠券列表 */}
        <Card>
          <CardHeader>
            <CardTitle>優惠券列表</CardTitle>
            <CardDescription>目前共有 {coupons.length} 個優惠券</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">載入中...</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無優惠券
              </div>
            ) : (
              <div className="space-y-4">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Ticket className="w-5 h-5 text-blue-600" />
                          <h3 className="font-medium text-gray-900">{coupon.name}</h3>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {coupon.code}
                          </code>
                          {getStatusBadge(coupon)}
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">類型:</span> {getTypeText(coupon.type)}
                          </div>
                          <div>
                            <span className="font-medium">優惠:</span> {formatValue(coupon)}
                          </div>
                          <div>
                            <span className="font-medium">使用次數:</span> {coupon.used_count}
                            {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                          </div>
                          <div>
                            <span className="font-medium">有效期:</span> 
                            {new Date(coupon.valid_until).toLocaleDateString('zh-TW')}
                          </div>
                        </div>

                        {coupon.description && (
                          <p className="text-sm text-gray-500 mt-2">{coupon.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStats(coupon)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(coupon)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(coupon)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              上一頁
            </Button>
            <span className="flex items-center px-4">
              第 {currentPage} 頁，共 {totalPages} 頁
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              下一頁
            </Button>
          </div>
        )}
      </div>

      {/* 編輯對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯優惠券</DialogTitle>
            <DialogDescription>修改優惠券信息</DialogDescription>
          </DialogHeader>
          <CouponForm 
            formData={formData} 
            setFormData={setFormData}
            onSubmit={handleEdit}
            submitting={submitting}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* 統計對話框 */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>優惠券統計</DialogTitle>
            <DialogDescription>
              {currentCoupon?.name} ({currentCoupon?.code})
            </DialogDescription>
          </DialogHeader>
          
          {couponStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {couponStats.stats.total_uses}
                  </div>
                  <div className="text-sm text-blue-600">總使用次數</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {couponStats.stats.unique_users}
                  </div>
                  <div className="text-sm text-green-600">使用用戶數</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    NT$ {couponStats.stats.total_discount.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-600">總折扣金額</div>
                </div>
              </div>

              {couponStats.recent_usages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">最近使用記錄</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {couponStats.recent_usages.map((usage: any) => (
                      <div key={usage.id} className="text-sm border-b pb-1">
                        <div className="flex justify-between">
                          <span>{usage.customer_name}</span>
                          <span>-NT$ {usage.discount_amount}</span>
                        </div>
                        <div className="text-gray-500 text-xs">
                          {new Date(usage.used_at).toLocaleString('zh-TW')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

// 優惠券表單組件
interface CouponFormProps {
  formData: CouponForm;
  setFormData: (data: CouponForm) => void;
  onSubmit: () => void;
  submitting: boolean;
  isEdit: boolean;
}

const CouponForm: React.FC<CouponFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  submitting,
  isEdit 
}) => {
  const handleInputChange = (field: keyof CouponForm, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">優惠券代碼 *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
            placeholder="例: SAVE20"
            disabled={isEdit}
          />
        </div>
        
        <div>
          <Label htmlFor="type">類型 *</Label>
          <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">百分比折扣</SelectItem>
              <SelectItem value="fixed_amount">固定金額</SelectItem>
              <SelectItem value="free_shipping">免運券</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="name">優惠券名稱 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="例: 新用戶歡迎券"
        />
      </div>

      <div>
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="優惠券描述"
        />
      </div>

      {formData.type !== 'free_shipping' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="value">
              優惠值 * {formData.type === 'percentage' ? '(%)' : '(NT$)'}
            </Label>
            <Input
              id="value"
              type="number"
              value={formData.value}
              onChange={(e) => handleInputChange('value', Number(e.target.value))}
              min="0"
              max={formData.type === 'percentage' ? "100" : undefined}
            />
          </div>

          {formData.type === 'percentage' && (
            <div>
              <Label htmlFor="max_discount">最大折扣額 (NT$)</Label>
              <Input
                id="max_discount"
                type="number"
                value={formData.max_discount || ''}
                onChange={(e) => handleInputChange('max_discount', e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                placeholder="不限制"
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min_order_amount">最低訂單金額 (NT$)</Label>
          <Input
            id="min_order_amount"
            type="number"
            value={formData.min_order_amount}
            onChange={(e) => handleInputChange('min_order_amount', Number(e.target.value))}
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="per_user_limit">每人使用次數</Label>
          <Input
            id="per_user_limit"
            type="number"
            value={formData.per_user_limit}
            onChange={(e) => handleInputChange('per_user_limit', Number(e.target.value))}
            min="1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="usage_limit">總使用次數限制</Label>
        <Input
          id="usage_limit"
          type="number"
          value={formData.usage_limit || ''}
          onChange={(e) => handleInputChange('usage_limit', e.target.value ? Number(e.target.value) : undefined)}
          min="1"
          placeholder="不限制"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valid_from">開始時間 *</Label>
          <Input
            id="valid_from"
            type="datetime-local"
            value={formData.valid_from}
            onChange={(e) => handleInputChange('valid_from', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="valid_until">結束時間 *</Label>
          <Input
            id="valid_until"
            type="datetime-local"
            value={formData.valid_until}
            onChange={(e) => handleInputChange('valid_until', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? '處理中...' : (isEdit ? '更新優惠券' : '創建優惠券')}
        </Button>
      </div>
    </div>
  );
};
