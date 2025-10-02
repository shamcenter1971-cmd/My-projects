import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BehaviorAnalyzer = ({ user, partner, onBack }) => {
  const [formData, setFormData] = useState({
    antecedent: "",
    behavior: "",
    consequence: "",
    behavior_type: "positive"
  });
  const [behaviors, setBehaviors] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBehaviors, setLoadingBehaviors] = useState(true);

  useEffect(() => {
    fetchBehaviors();
    fetchPatterns();
  }, [user.id]);

  const fetchBehaviors = async () => {
    try {
      const response = await axios.get(`${API}/behaviors/${user.id}`);
      setBehaviors(response.data);
    } catch (error) {
      toast.error("حدث خطأ في تحميل السلوكيات");
    } finally {
      setLoadingBehaviors(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await axios.get(`${API}/behaviors/${user.id}/patterns`);
      setPatterns(response.data.patterns || []);
    } catch (error) {
      console.error("خطأ في تحميل الأنماط:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/behaviors?user_id=${user.id}`, formData);
      toast.success("تم تسجيل السلوك بنجاح!");
      
      // Reset form
      setFormData({
        antecedent: "",
        behavior: "",
        consequence: "",
        behavior_type: "positive"
      });
      
      // Refresh data
      await fetchBehaviors();
      await fetchPatterns();
      
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ السلوك");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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
              محلل السلوك A-B-C
            </h1>
            <p className="text-emerald-600 arabic-text">
              سجل وحلل أنماط السلوك لتحسين التفاعل مع شريك حياتك
            </p>
          </div>
        </div>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="add" className="arabic-text">إضافة سلوك</TabsTrigger>
            <TabsTrigger value="history" className="arabic-text">السجل</TabsTrigger>
            <TabsTrigger value="patterns" className="arabic-text">الأنماط</TabsTrigger>
          </TabsList>

          {/* Add Behavior Tab */}
          <TabsContent value="add">
            <Card className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800">
                  تسجيل سلوك جديد
                </CardTitle>
                <CardDescription className="arabic-text">
                  استخدم نموذج A-B-C لتحليل السلوك: السبب (A) ← السلوك (B) ← النتيجة (C)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Behavior Type */}
                  <div className="space-y-3">
                    <Label className="arabic-text text-emerald-700 font-medium">
                      نوع السلوك
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="behavior_type"
                          value="positive"
                          checked={formData.behavior_type === "positive"}
                          onChange={handleChange}
                          className="text-emerald-600"
                          data-testid="positive-behavior-radio"
                        />
                        <span className="status-positive px-3 py-1 rounded-full text-sm arabic-text font-medium">
                          إيجابي
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="behavior_type"
                          value="negative"
                          checked={formData.behavior_type === "negative"}
                          onChange={handleChange}
                          className="text-red-600"
                          data-testid="negative-behavior-radio"
                        />
                        <span className="status-negative px-3 py-1 rounded-full text-sm arabic-text font-medium">
                          سلبي
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Antecedent (A) */}
                  <div className="space-y-2">
                    <Label htmlFor="antecedent" className="arabic-text text-emerald-700 font-medium">
                      السبب المثير (A) - ماذا حدث قبل السلوك؟
                    </Label>
                    <Textarea
                      id="antecedent"
                      name="antecedent"
                      placeholder='مثال: "طلبت المساعدة في ترتيب المنزل" أو "تأخر شريكي عن الموعد"'
                      value={formData.antecedent}
                      onChange={handleChange}
                      required
                      className="form-input arabic-text min-h-[80px]"
                      data-testid="antecedent-input"
                    />
                  </div>

                  {/* Behavior (B) */}
                  <div className="space-y-2">
                    <Label htmlFor="behavior" className="arabic-text text-emerald-700 font-medium">
                      السلوك (B) - ما هو السلوك الذي حدث؟
                    </Label>
                    <Textarea
                      id="behavior"
                      name="behavior"
                      placeholder='مثال: "شكرني وساعدني فوراً" أو "غضبت ورفعت صوتي"'
                      value={formData.behavior}
                      onChange={handleChange}
                      required
                      className="form-input arabic-text min-h-[80px]"
                      data-testid="behavior-input"
                    />
                  </div>

                  {/* Consequence (C) */}
                  <div className="space-y-2">
                    <Label htmlFor="consequence" className="arabic-text text-emerald-700 font-medium">
                      النتيجة (C) - ماذا حدث بعد السلوك؟
                    </Label>
                    <Textarea
                      id="consequence"
                      name="consequence"
                      placeholder='مثال: "شعرت بالسعادة وتحسن الجو" أو "توتر الجو وانسحب شريكي"'
                      value={formData.consequence}
                      onChange={handleChange}
                      required
                      className="form-input arabic-text min-h-[80px]"
                      data-testid="consequence-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary arabic-text text-lg py-3"
                    data-testid="submit-behavior-button"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الحفظ...
                      </div>
                    ) : (
                      "حفظ السلوك"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800">
                  سجل السلوكيات
                </CardTitle>
                <CardDescription className="arabic-text">
                  جميع السلوكيات المسجلة مؤخراً
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBehaviors ? (
                  <div className="text-center py-8">
                    <div className="spinner mb-4"></div>
                    <p className="text-emerald-600 arabic-text">جاري تحميل السلوكيات...</p>
                  </div>
                ) : behaviors.length > 0 ? (
                  <div className="space-y-4">
                    {behaviors.map((behavior, index) => (
                      <div 
                        key={behavior.id} 
                        className={`p-4 rounded-lg ${behavior.behavior_type === 'positive' ? 'status-positive' : 'status-negative'}`}
                        data-testid={`behavior-${index}`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <Badge variant="outline" className="arabic-text">
                            {behavior.behavior_type === 'positive' ? 'إيجابي' : 'سلبي'}
                          </Badge>
                          <span className="text-xs text-gray-600 arabic-text">
                            {new Date(behavior.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-semibold text-sm arabic-text text-emerald-800 mb-1">
                              السبب المثير (A):
                            </h4>
                            <p className="text-sm arabic-text">{behavior.antecedent}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm arabic-text text-emerald-800 mb-1">
                              السلوك (B):
                            </h4>
                            <p className="text-sm arabic-text font-medium">{behavior.behavior}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm arabic-text text-emerald-800 mb-1">
                              النتيجة (C):
                            </h4>
                            <p className="text-sm arabic-text">{behavior.consequence}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-emerald-600 arabic-text mb-2">لم يتم تسجيل أي سلوكيات بعد</p>
                    <p className="text-sm text-emerald-500 arabic-text">
                      ابدأ بتسجيل سلوكياتك لنتمكن من تحليلها
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns">
            <Card className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800">
                  أنماط السلوك المكتشفة
                </CardTitle>
                <CardDescription className="arabic-text">
                  الأنماط المتكررة في سلوكياتك - اكتشف عاداتك
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patterns.length > 0 ? (
                  <div className="space-y-4">
                    {patterns.map((pattern, index) => (
                      <div 
                        key={index}
                        className="p-4 border rounded-lg bg-emerald-50 border-emerald-200"
                        data-testid={`pattern-${index}`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <Badge className="points-badge">
                            تكرر {pattern[1].count} مرة
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold arabic-text text-emerald-800">
                            النمط المكتشف:
                          </h4>
                          <p className="arabic-text font-medium text-emerald-700">
                            {pattern[0]}
                          </p>
                          
                          <div className="mt-3">
                            <h5 className="font-medium text-sm arabic-text text-emerald-700 mb-1">
                              النتائج المختلفة:
                            </h5>
                            <div className="space-y-1">
                              {pattern[1].consequences.slice(0, 3).map((consequence, idx) => (
                                <p key={idx} className="text-sm arabic-text text-emerald-600">
                                  • {consequence}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <p className="text-emerald-600 arabic-text mb-2">لم يتم اكتشاف أنماط بعد</p>
                    <p className="text-sm text-emerald-500 arabic-text">
                      سجل المزيد من السلوكيات لنتمكن من اكتشاف الأنماط المتكررة
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BehaviorAnalyzer;