import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SkillsModule = ({ user, partner, onBack }) => {
  const [completedModules, setCompletedModules] = useState(new Set());
  const [activeModule, setActiveModule] = useState("timeout");

  const markModuleComplete = async (moduleId) => {
    try {
      // Award points for completing a module
      await axios.post(`${API}/points/award?user_id=${user.id}`, {
        partner_id: partner.id,
        points: 3,
        transaction_type: "earned",
        description: `أكمل وحدة مهارة: ${getModuleTitle(moduleId)}`
      });

      setCompletedModules(prev => new Set([...prev, moduleId]));
      toast.success("تم إكمال الوحدة بنجاح! حصلت على 3 نقاط");
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ التقدم");
    }
  };

  const getModuleTitle = (moduleId) => {
    const titles = {
      "timeout": "مهارة الاستراحة والتهدئة الذاتية"
    };
    return titles[moduleId] || moduleId;
  };

  const timeoutModule = {
    id: "timeout",
    title: "مهارة الاستراحة والتهدئة الذاتية",
    description: "السلوك البديل للسلوكيات السلبية مثل الصراخ أو الانسحاب العدواني",
    duration: "10-15 دقيقة",
    sections: [
      {
        id: "when",
        title: "متى أطلب الاستراحة؟ (العلامات الحمراء)",
        subtitle: "وظيفتها التعرف على أعراض الغضب",
        content: [
          {
            type: "category",
            title: "العلامات الجسدية:",
            items: ["تسارع ضربات القلب", "تشنج الفك", "توتر العضلات", "التعرق المفرط"]
          },
          {
            type: "category", 
            title: "العلامات السلوكية:",
            items: ['رفع الصوت أو استخدام كلمات مثل "دائماً"', "المقاطعة المستمرة", "الإشارات العدوانية"]
          }
        ]
      },
      {
        id: "how",
        title: "كيف أطلب الاستراحة؟ (العبارات البديلة)",
        subtitle: "استخدم هذه العبارات بدلاً من الصراخ أو الانسحاب",
        content: [
          {
            type: "script",
            title: "العبارة المقترحة 1:",
            text: "أنا أحتاج إلى استراحة الآن. سأعود في غضون 20 دقيقة."
          },
          {
            type: "script",
            title: "العبارة المقترحة 2:", 
            text: "هذا النقاش مهم، لكنني أحتاج وقتاً لأهدأ حتى لا أقول شيئاً أندم عليه."
          },
          {
            type: "script",
            title: "العبارة المقترحة 3:",
            text: "أريد أن أعطيك انتباهي الكامل، دعني أهدأ أولاً وأعود إليك."
          }
        ]
      },
      {
        id: "soothing",
        title: "التهدئة الذاتية (ماذا أفعل؟)",
        subtitle: "هذه الأنشطة يجب أن تتم بعيداً عن الشريك",
        content: [
          {
            type: "technique",
            title: "التنفس العميق:",
            description: "10 أنفاس عميقة",
            steps: ["اجلس في مكان هادئ", "تنفس من الأنف لمدة 4 ثوان", "احبس النفس لـ 4 ثوان", "أخرج النفس من الفم لـ 6 ثوان", "كرر 10 مرات"]
          },
          {
            type: "technique", 
            title: "التغيير الجسدي:",
            description: "تغيير البيئة والحالة الجسدية",
            steps: ["الخروج في نزهة سريعة (5-10 دقائق)", "غسل الوجه بماء بارد", "شرب كوب ماء بارد", "تغيير الملابس أو المكان"]
          },
          {
            type: "technique",
            title: "تشتيت الذهن:",
            description: "إشغال العقل بأنشطة مهدئة",
            steps: ["الاستماع إلى موسيقى هادئة", "قراءة بضع صفحات من كتاب", "ممارسة تمرين رياضي خفيف", "التأمل أو الدعاء"]
          }
        ]
      }
    ]
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
              أدوات المساعدة وحل الخلافات
            </h1>
            <p className="text-emerald-600 arabic-text">
              تعلم المهارات البديلة للسلوكيات السلبية المسجلة في محلل السلوك
            </p>
          </div>
        </div>

        {/* Skills Overview */}
        <Card className="glass border-emerald-200 mb-6">
          <CardHeader>
            <CardTitle className="arabic-title text-emerald-800">
              المهارات المتاحة
            </CardTitle>
            <CardDescription className="arabic-text">
              وحدات تعليمية قصيرة (5-15 دقيقة) لتطوير مهارات التواصل الإيجابي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  activeModule === "timeout" ? "border-emerald-400 bg-emerald-50" : "border-emerald-200 hover:bg-emerald-50"
                }`}
                onClick={() => setActiveModule("timeout")}
                data-testid="timeout-skill-card"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold arabic-text text-emerald-800">
                      {timeoutModule.title}
                    </h3>
                    <p className="text-sm text-emerald-600 arabic-text mt-1">
                      {timeoutModule.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="arabic-text text-xs">
                        {timeoutModule.duration}
                      </Badge>
                      <Badge variant="secondary" className="arabic-text text-xs">
                        3 أقسام
                      </Badge>
                    </div>
                  </div>
                  {completedModules.has("timeout") && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <span className="text-lg">✅</span>
                      <span className="text-xs arabic-text">مكتمل</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Content */}
        {activeModule === "timeout" && (
          <Card className="glass border-emerald-200">
            <CardHeader>
              <CardTitle className="arabic-title text-emerald-800 flex items-center gap-3">
                <span className="text-2xl">🧘</span>
                {timeoutModule.title}
              </CardTitle>
              <CardDescription className="arabic-text">
                {timeoutModule.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="when" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="when" className="arabic-text">العلامات الحمراء</TabsTrigger>
                  <TabsTrigger value="how" className="arabic-text">العبارات البديلة</TabsTrigger>
                  <TabsTrigger value="soothing" className="arabic-text">التهدئة الذاتية</TabsTrigger>
                </TabsList>

                {timeoutModule.sections.map((section) => (
                  <TabsContent key={section.id} value={section.id} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold arabic-title text-emerald-800 mb-2">
                        {section.title}
                      </h2>
                      <p className="text-emerald-600 arabic-text">
                        {section.subtitle}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {section.content.map((item, index) => (
                        <div key={index}>
                          {item.type === "category" && (
                            <Card className="border-emerald-200">
                              <CardContent className="p-4">
                                <h4 className="font-semibold arabic-text text-emerald-800 mb-3">
                                  {item.title}
                                </h4>
                                <ul className="space-y-2">
                                  {item.items.map((listItem, itemIndex) => (
                                    <li key={itemIndex} className="flex items-center gap-2 arabic-text">
                                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                      {listItem}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                          {item.type === "script" && (
                            <Card className="border-emerald-200 bg-emerald-50">
                              <CardContent className="p-4">
                                <h4 className="font-semibold arabic-text text-emerald-800 mb-2">
                                  {item.title}
                                </h4>
                                <div className="p-3 bg-white rounded-lg border-r-4 border-emerald-500">
                                  <p className="arabic-text font-medium text-emerald-700">
                                    "{item.text}"
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {item.type === "technique" && (
                            <Card className="border-emerald-200">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h4 className="font-semibold arabic-text text-emerald-800">
                                      {item.title}
                                    </h4>
                                    <p className="text-sm text-emerald-600 arabic-text">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="mr-10 space-y-2">
                                  {item.steps.map((step, stepIndex) => (
                                    <div key={stepIndex} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                      <span className="arabic-text text-sm">{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Practice Button */}
                    <div className="text-center pt-6 border-t border-emerald-200">
                      <Button
                        onClick={() => markModuleComplete("timeout")}
                        disabled={completedModules.has("timeout")}
                        className="btn-primary arabic-text px-8"
                        data-testid="complete-module-button"
                      >
                        {completedModules.has("timeout") ? "تم الإكمال ✅" : "أكملت هذه المهارة (+3 نقاط)"}
                      </Button>
                      <p className="text-xs text-emerald-600 arabic-text mt-2">
                        ستحصل على 3 نقاط عند إكمال هذه الوحدة
                      </p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Implementation Homework */}
        <Card className="glass border-emerald-200">
          <CardHeader>
            <CardTitle className="arabic-title text-emerald-800">
              الواجب السلوكي (التطبيق العملي)
            </CardTitle>
            <CardDescription className="arabic-text">
              بعد تعلم هذه المهارة، طبقها في الحياة الواقعية وسجل النتيجة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-semibold arabic-text text-amber-800 mb-2">
                📝 التحدي:
              </h4>
              <p className="arabic-text text-amber-700 mb-3">
                في المرة القادمة عندما تشعر بعلامات الغضب، استخدم مهارة الاستراحة والتهدئة الذاتية بدلاً من الصراخ أو الانسحاب.
              </p>
              <p className="text-sm arabic-text text-amber-600">
                بعد التطبيق، سجل تجربتك في محلل السلوك A-B-C لمراقبة التحسن.
              </p>
            </div>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full arabic-text"
              data-testid="go-to-behavior-analyzer"
            >
              انتقل إلى محلل السلوك لتسجيل التجربة
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SkillsModule;