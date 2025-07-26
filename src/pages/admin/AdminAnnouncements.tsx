import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { AdminLayout } from '../../components/AdminLayout';
import { AnnouncementForm } from '../../components/AnnouncementForm';
import { announcementAPI } from '../../services/api';
import { toast } from 'sonner';

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAll();
      if (response.data.success) {
        setAnnouncements(response.data.data || []);
      } else {
        setError('載入公告失敗');
      }
    } catch (error) {
      console.error('載入公告失敗:', error);
      setError('載入公告失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // 停用公告 - 使用delete API（軟刪除）
        await announcementAPI.delete(id);
        toast.success('公告已停用');
      } else {
        // 啟用公告 - 使用restore API
        await announcementAPI.restore(id);
        toast.success('公告已啟用');
      }
      await loadAnnouncements();
    } catch (error) {
      console.error('更新公告狀態失敗:', error);
      toast.error('更新公告狀態失敗');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`確定要永久刪除公告「${title}」嗎？此操作無法撤銷。`)) {
      try {
        await announcementAPI.permanentDelete(id);
        toast.success('公告已永久刪除');
        await loadAnnouncements();
      } catch (error) {
        console.error('刪除公告失敗:', error);
        toast.error('刪除公告失敗');
      }
    }
  };

  const handleAddAnnouncement = () => {
    setEditingAnnouncement(undefined);
    setShowForm(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAnnouncement(undefined);
  };

  const handleFormSuccess = () => {
    loadAnnouncements();
  };

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getPriorityText = (priority: number) => {
    if (priority >= 8) return '高';
    if (priority >= 5) return '中';
    return '低';
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
          <Button onClick={loadAnnouncements}>重試</Button>
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
              <Megaphone className="h-8 w-8" />
              公告管理
            </h1>
            <p className="text-gray-600 mt-2">管理網站公告和通知信息</p>
          </div>
          <Button onClick={handleAddAnnouncement}>
            <Plus className="h-4 w-4 mr-2" />
            新增公告
          </Button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總公告數</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{announcements.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">啟用公告</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {announcements.filter(a => a.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">停用公告</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {announcements.filter(a => !a.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">高優先級</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {announcements.filter(a => a.priority >= 8).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 公告列表 */}
        <Card>
          <CardHeader>
            <CardTitle>公告列表</CardTitle>
            <CardDescription>管理所有公告信息和顯示狀態</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無公告數據
              </div>
            ) : (
              <div className="space-y-4">
                {announcements
                  .sort((a, b) => b.priority - a.priority || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((announcement) => (
                    <div key={announcement.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                            <Badge variant={announcement.is_active ? "default" : "secondary"}>
                              {announcement.is_active ? '啟用' : '停用'}
                            </Badge>
                            <Badge className={getPriorityBadgeColor(announcement.priority)}>
                              優先級: {getPriorityText(announcement.priority)}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {announcement.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>優先級: {announcement.priority}</span>
                            <span>創建時間: {new Date(announcement.created_at).toLocaleDateString('zh-TW')}</span>
                            <span>更新時間: {new Date(announcement.updated_at).toLocaleDateString('zh-TW')}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleStatus(announcement.id, announcement.is_active)}
                          >
                            {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(announcement.id, announcement.title)}
                            title="永久刪除公告"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {announcement.content.length > 100 && (
                        <div className="mt-3 pt-3 border-t">
                          <details className="cursor-pointer">
                            <summary className="text-sm text-blue-600 hover:text-blue-700">
                              查看完整內容
                            </summary>
                            <div className="mt-2 text-gray-600 whitespace-pre-wrap">
                              {announcement.content}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 公告表單 */}
      <AnnouncementForm
        announcement={editingAnnouncement}
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </AdminLayout>
  );
};
