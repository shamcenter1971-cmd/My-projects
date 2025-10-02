import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, partner, onLogout, onRefresh }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/${user.id}`);
      setDashboardData(response.data);
    } catch (error) {
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (points, description) => {
    try {
      await axios.post(`${API}/points/award?user_id=${user.id}`, {
        partner_id: partner.id,
        points: points,
        transaction_type: "earned",
        description: description
      });
      
      toast.success(`تم منح ${points} نقطة لشريكك!`);
      await fetchDashboardData();
      onRefresh();
    } catch (error) {
      toast.error("حدث خطأ أثناء منح النقاط");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-emerald-600 arabic-text">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-center md:text-right">
            <h1 className="text-3xl font-bold arabic-title text-emerald-800">
              لوحة التحكم
            </h1>
            <p className="text-emerald-600 arabic-text">
              مرحباً {user.name} - مربوط مع {partner.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="points-badge arabic-text" data-testid="user-points">
              {user.points} نقطة
            </Badge>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="arabic-text"
              data-testid="logout-button"
            >
              تسجيل خروج
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card 
            className="glass border-emerald-200 card-hover cursor-pointer"
            onClick={() => navigate('/behavior-analyzer')}
            data-testid="behavior-analyzer-card"
          >
            <CardHeader>
              <CardTitle className="arabic-title text-emerald-800 flex items-center gap-3">
                <span className="text-2xl">📊</span>
                محلل السلوك A-B-C
              </CardTitle>
              <CardDescription className="arabic-text">
                سجل وحلل أنماط السلوك الإيجابي والسلبي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-600 arabic-text">
                اكتشف الأسباب والنتائج وحسن طريقة تفاعلك
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass border-emerald-200 card-hover cursor-pointer"
            onClick={() => navigate('/reinforcement-bank')}
            data-testid="reinforcement-bank-card"
          >
            <CardHeader>
              <CardTitle className="arabic-title text-emerald-800 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                بنك التعزيز الإيجابي
              </CardTitle>
              <CardDescription className="arabic-text">
                استبدل نقاطك بما يسعد شريك حياتك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-600 arabic-text">
                اختر من مكافآت شريكك المفضلة واستبدلها بنقاطك
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {dashboardData?.recent_behaviors?.length > 0 && (
          <Card className="glass border-emerald-200 mb-6">
            <CardHeader>
              <CardTitle className="arabic-title text-emerald-800">آخر السلوكيات المسجلة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.recent_behaviors.map((behavior, index) => (
                <div 
                  key={behavior.id} 
                  className={`p-3 rounded-lg ${behavior.behavior_type === 'positive' ? 'status-positive' : 'status-negative'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="arabic-text">
                      {behavior.behavior_type === 'positive' ? 'إيجابي' : 'سلبي'}
                    </Badge>
                    <span className="text-xs text-gray-500 arabic-text">
                      {new Date(behavior.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <p className="font-medium arabic-text mb-1">السلوك: {behavior.behavior}</p>
                  <p className="text-sm arabic-text opacity-80">السبب: {behavior.antecedent}</p>
                  <p className="text-sm arabic-text opacity-80">النتيجة: {behavior.consequence}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Point Awards */}
        <Card className="glass border-emerald-200">
          <CardHeader>
            <CardTitle className="arabic-title text-emerald-800">منح نقاط سريعة لشريكك</CardTitle>
            <CardDescription className="arabic-text">
              امنح نقاط لشريكك عندما تلاحظ سلوكاً إيجابياً
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => awardPoints(1, "سلوك إيجابي ممتاز")}
              className="btn-primary arabic-text"
              data-testid="award-1-point"
            >
              +1 نقطة
            </Button>
            <Button
              onClick={() => awardPoints(2, "تطبيق مهارة جديدة")}
              className="btn-primary arabic-text"
              data-testid="award-2-points"
            >
              +2 نقطة
            </Button>
            <Button
              onClick={() => awardPoints(3, "تحسن ملحوظ في التواصل")}
              className="btn-primary arabic-text"
              data-testid="award-3-points"
            >
              +3 نقطة
            </Button>
            <Button
              onClick={() => awardPoints(5, "إنجاز استثنائي")}
              className="btn-primary arabic-text"
              data-testid="award-5-points"
            >
              +5 نقطة
            </Button>
          </CardContent>
        </Card>

        {/* Available Reinforcements Preview */}
        {dashboardData?.available_reinforcements?.length > 0 && (
          <Card className="glass border-emerald-200">
            <CardHeader>
              <CardTitle className="arabic-title text-emerald-800">
                مكافآت متاحة من بنك {partner.name}
              </CardTitle>
              <CardDescription className="arabic-text">
                يمكنك استبدال هذه المكافآت بنقاطك
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {dashboardData.available_reinforcements.slice(0, 4).map((item) => (
                <div 
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium arabic-text text-emerald-800">
                      {item.title}
                    </h4>
                    <Badge className="points-badge">
                      {item.cost} نقطة
                    </Badge>
                  </div>
                  <p className="text-sm text-emerald-600 arabic-text mt-1">
                    {getCategoryName(item.category)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const getCategoryName = (category) => {
  const categories = {
    "attention": "الاهتمام والتواصل",
    "service": "الخدمة والدعم العملي",
    "affection": "الحميمية والمودة",
    "time": "التضحية بالوقت الخاص",
    "recognition": "التقدير العلني"
  };
  return categories[category] || category;
};

export default Dashboard;