import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationCenter = ({ user, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications/${user.id}`);
      setNotifications(response.data);
    } catch (error) {
      toast.error("حدث خطأ في تحميل التنبيهات");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? {...notif, is_read: true} : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to the appropriate section
    onClose();
    navigate(notification.action_url);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "negative_behavior_offender":
        return "⚠️";
      case "negative_behavior_recipient":
        return "🛡️";
      default:
        return "📢";
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case "negative_behavior_offender":
        return "border-orange-300 bg-orange-50";
      case "negative_behavior_recipient":
        return "border-blue-300 bg-blue-50";
      default:
        return "border-emerald-300 bg-emerald-50";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <p className="text-emerald-600 arabic-text">لا توجد تنبيهات جديدة</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`cursor-pointer transition-all hover:shadow-md ${getNotificationStyle(notification.type)} ${
              !notification.is_read ? 'border-l-4' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
            data-testid={`notification-${notification.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold arabic-text text-emerald-800">
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <Badge className="bg-red-500 text-white text-xs">جديد</Badge>
                    )}
                  </div>
                  <p className="text-sm arabic-text text-gray-700 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500 arabic-text">
                      {new Date(notification.created_at).toLocaleDateString('ar-SA')}
                    </span>
                    <Button
                      size="sm"
                      className="btn-primary arabic-text text-xs px-3 py-1"
                    >
                      انتقل للأدوات
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default NotificationCenter;