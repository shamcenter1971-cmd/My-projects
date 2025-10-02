import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReinforcementBank = ({ user, partner, onBack }) => {
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [myReinforcements, setMyReinforcements] = useState([]);
  const [partnerReinforcements, setPartnerReinforcements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, templatesRes, partnerReinforcementsRes] = await Promise.all([
        axios.get(`${API}/reinforcement-categories`),
        axios.get(`${API}/reinforcement-templates`),
        axios.get(`${API}/reinforcements/${partner.id}`)
      ]);

      setCategories(categoriesRes.data.categories);
      setTemplates(templatesRes.data.templates);
      setPartnerReinforcements(partnerReinforcementsRes.data);
    } catch (error) {
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const addToMyBank = async (template) => {
    try {
      await axios.post(`${API}/reinforcements?user_id=${user.id}`, {
        title: template.title,
        category: template.category,
        cost: template.cost
      });
      
      toast.success("تم إضافة التعزيز لبنكك الشخصي!");
      // Note: In a real app, we'd fetch updated personal reinforcements here
    } catch (error) {
      toast.error("حدث خطأ أثناء الإضافة");
    }
  };

  const redeemReinforcement = async (reinforcement) => {
    if (user.points < reinforcement.cost) {
      toast.error("ليس لديك نقاط كافية لاستبدال هذا التعزيز");
      return;
    }

    try {
      const response = await axios.post(`${API}/reinforcements/${reinforcement.id}/redeem?user_id=${user.id}`);
      toast.success(`تم استبدال: ${reinforcement.title}`);
      toast.success(`النقاط المتبقية: ${response.data.remaining_points}`);
      
      // Refresh data to update points
      window.location.reload(); // Simple refresh for demo
    } catch (error) {
      const message = error.response?.data?.detail || "حدث خطأ أثناء الاستبدال";
      toast.error(message);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getCategoryClass = (categoryId) => {
    const classMap = {
      "attention": "category-attention",
      "service": "category-service", 
      "affection": "category-affection",
      "time": "category-time",
      "recognition": "category-recognition"
    };
    return classMap[categoryId] || "status-neutral";
  };

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const filteredPartnerReinforcements = selectedCategory === "all"
    ? partnerReinforcements
    : partnerReinforcements.filter(r => r.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-emerald-600 arabic-text">جاري تحميل بنك التعزيز...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={onBack}
              variant="outline"
              className="arabic-text"
              data-testid="back-button"
            >
              ← العودة
            </Button>
            <div>
              <h1 className="text-3xl font-bold arabic-title text-emerald-800">
                بنك التعزيز الإيجابي
              </h1>
              <p className="text-emerald-600 arabic-text">
                اكسب واستبدل النقاط بما يسعد شريك حياتك
              </p>
            </div>
          </div>
          <Badge className="points-badge arabic-text" data-testid="current-points">
            {user.points} نقطة متاحة
          </Badge>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="arabic-text text-emerald-700 font-medium">تصفية حسب الفئة:</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px] arabic-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="available" className="arabic-text">
              متاح لك من {partner.name}
            </TabsTrigger>
            <TabsTrigger value="templates" className="arabic-text">إضافة لبنكك الشخصي</TabsTrigger>
          </TabsList>

          {/* Available Reinforcements */}
          <TabsContent value="available">
            <Card className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800">
                  التعزيزات المتاحة من {partner.name}
                </CardTitle>
                <CardDescription className="arabic-text">
                  يمكنك استبدال هذه التعزيزات بنقاطك المكتسبة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPartnerReinforcements.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredPartnerReinforcements.map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 border rounded-lg hover:bg-emerald-50 transition-colors"
                        data-testid={`reinforcement-${item.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium arabic-text text-emerald-800 flex-1 ml-2">
                            {item.title}
                          </h4>
                          <Badge className="points-badge">
                            {item.cost} نقطة
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Badge className={`px-2 py-1 text-xs arabic-text ${getCategoryClass(item.category)}`}>
                            {getCategoryName(item.category)}
                          </Badge>
                          
                          <Button
                            onClick={() => redeemReinforcement(item)}
                            disabled={user.points < item.cost}
                            className={`arabic-text ${
                              user.points >= item.cost 
                                ? 'btn-primary' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            data-testid={`redeem-${item.id}`}
                          >
                            {user.points >= item.cost ? 'استبدال' : 'نقاط غير كافية'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎁</span>
                    </div>
                    <p className="text-emerald-600 arabic-text mb-2">
                      لم يقم {partner.name} بإضافة تعزيزات لبنكه الشخصي بعد
                    </p>
                    <p className="text-sm text-emerald-500 arabic-text">
                      انتظر حتى يقوم شريكك بإضافة التعزيزات المفضلة له
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Reinforcements */}
          <TabsContent value="templates">
            <Card className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800">
                  قوالب التعزيز المتاحة
                </CardTitle>
                <CardDescription className="arabic-text">
                  اختر التعزيزات التي تفضل إضافتها لبنكك الشخصي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template, index) => (
                    <div 
                      key={index}
                      className="p-4 border rounded-lg hover:bg-emerald-50 transition-colors"
                      data-testid={`template-${index}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium arabic-text text-emerald-800 flex-1 ml-2">
                          {template.title}
                        </h4>
                        <Badge className="points-badge">
                          {template.cost} نقطة
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Badge className={`px-2 py-1 text-xs arabic-text ${getCategoryClass(template.category)}`}>
                          {getCategoryName(template.category)}
                        </Badge>
                        
                        <Button
                          onClick={() => addToMyBank(template)}
                          className="btn-secondary arabic-text"
                          data-testid={`add-${index}`}
                        >
                          إضافة لبنكي
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        <Card className="glass border-emerald-200 mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold arabic-title text-emerald-800 mb-4 text-center">
              كيفية استخدام بنك التعزيز:
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">1</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  اكسب نقاط من خلال السلوكيات الإيجابية
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">2</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  أضف التعزيزات المفضلة لبنكك الشخصي
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">3</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  استبدل نقاطك بتعزيزات شريكك المضافة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReinforcementBank;