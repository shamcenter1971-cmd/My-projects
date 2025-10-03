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

  const activeListeningModule = {
    id: "active_listening",
    title: "كيف أجعل شريكي يشعر أنه مسموع؟",
    description: "السلوك البديل للمقاطعة، التجاهل، أو التشتت الذهني أثناء النقاش",
    duration: "10-15 دقيقة",
    goal: "تحويل الاستماع للرد إلى الاستماع للفهم",
    sections: [
      {
        id: "readiness",
        title: "الجاهزية (جسدياً وذهنياً)",
        subtitle: "استعد بتركيز 100%",
        content: [
          {
            type: "technique",
            title: "التحضير الجسدي:",
            description: "هيئ نفسك للاستماع الفعّال",
            steps: ["📱 أبعد هاتفك", "🧘 اجلس مواجهاً للشريك", "👀 حافظ على تواصل بصري هادئ", "💭 ذكّر نفسك: أنا هنا لأفهم فقط، وليس لأحكم أو أرد"]
          }
        ]
      },
      {
        id: "silence",
        title: "الصمت البنّاء",
        subtitle: "لا تقاطع إطلاقاً",
        content: [
          {
            type: "technique",
            title: "مقاومة المقاطعة:",
            description: "تحكم في رغبتك للرد الفوري",
            steps: ["قاوم رغبتك في الدفاع عن نفسك أو تبرير موقفك", "استخدم إشارات بسيطة (كالإيماء) لتشجيع شريكك", "اتركه يكمل فكرته بالكامل", "تنفس بعمق إذا شعرت برغبة في المقاطعة"]
          }
        ]
      },
      {
        id: "reflection",
        title: "عكس ما سمعته (الخطوة القوية)",
        subtitle: "لخص وافهم قبل أن ترد",
        content: [
          {
            type: "script",
            title: "عبارات التلخيص:",
            text: "إذا فهمت كلامك صح، أنت تشعر بأن..."
          },
          {
            type: "script",
            title: "عبارات الفهم:",
            text: "ما أسمعه منك هو..."
          },
          {
            type: "script",
            title: "عبارات التأكيد:",
            text: "صححني إذا أخطأت، ولكن يبدو أن..."
          }
        ]
      },
      {
        id: "homework",
        title: "الواجب السلوكي",
        subtitle: "طبق المهارة في الحياة الواقعية",
        content: [
          {
            type: "challenge",
            title: "📝 التحدي:",
            description: "في المرة القادمة، طبّق تقنية 'التلخيص قبل الرد'",
            steps: ["استمع لشريكك دون مقاطعة", "لخص ما فهمته قبل الرد", "إذا نجحت، سجّل تجربتك في محلل A-B-C كـ سلوك إيجابي"]
          }
        ]
      }
    ]
  };

  const expressingNeedsModule = {
    id: "expressing_needs",
    title: "كيف أطلب ما أريد دون لوم؟",
    description: "السلوك البديل للّوم، الانتقاد، أو التذمر العام الذي يسبب دفاع الشريك",
    duration: "10-15 دقيقة",
    goal: "تحويل الشكاوى العاطفية إلى طلبات عملية ومحددة يمكن لشريكك تلبيتها",
    sections: [
      {
        id: "i_statements",
        title: "قاعدة \"أنا\"",
        subtitle: "ابدأ بالتعبير عن مشاعرك وحاجتك",
        content: [
          {
            type: "comparison",
            title: "بدلاً من اللوم:",
            wrong: "أنت لا تهتم بي",
            right: "أنا أشعر بالوحدة وأحتاج وقتاً معك"
          },
          {
            type: "comparison",
            title: "بدلاً من الانتقاد:",
            wrong: "أنت لا تساعدني أبداً",
            right: "أنا أشعر بالإرهاق وأحتاج مساعدتك"
          },
          {
            type: "technique",
            title: "صيغة \"أنا\" الأساسية:",
            description: "أنا أشعر بـ... عندما... وأحتاج...",
            steps: ["ابدأ بوصف مشاعرك", "اذكر الموقف المحدد", "اطلب حاجتك بوضوح", "تجنب كلمة 'أنت' في البداية"]
          }
        ]
      },
      {
        id: "specific_requests",
        title: "الطلب القابل للقياس",
        subtitle: "اجعل طلبك محدداً وواضحاً جداً",
        content: [
          {
            type: "comparison",
            title: "بدلاً من الغموض:",
            wrong: "كن أفضل معي",
            right: "هل يمكننا الاتفاق على الذهاب لنزهة لمدة ساعتين كل يوم سبت؟"
          },
          {
            type: "comparison",
            title: "بدلاً من العموميات:",
            wrong: "اهتم بي أكثر",
            right: "هل يمكنك إرسال رسالة واحدة خلال اليوم تسأل فيها عن أحوالي؟"
          },
          {
            type: "technique",
            title: "معايير الطلب الواضح:",
            description: "طلب قابل للتنفيذ والقياس",
            steps: ["محدد بالوقت والمكان", "قابل للتحقق", "في حدود إمكانيات الشريك", "مفصل وليس عام"]
          }
        ]
      },
      {
        id: "handling_rejection",
        title: "التعامل مع الرفض",
        subtitle: "تقبّل الإجابة واستخدم الاستماع النشط",
        content: [
          {
            type: "technique",
            title: "عند سماع 'لا':",
            description: "حوّل الرفض إلى حوار بنّاء",
            steps: ["تنفس بعمق ولا تغضب", "اسأل: 'هل يمكنك أن تساعدني أفهم السبب؟'", "استمع لشريكك دون مقاطعة", "ابحثا معاً عن حل وسط"]
          },
          {
            type: "script",
            title: "عبارات التفاوض:",
            text: "أفهم وضعك، هل يمكننا إيجاد طريقة أخرى؟"
          },
          {
            type: "script",
            title: "عبارات قبول الرفض:",
            text: "أقدر صراحتك، دعنا نفكر في حل آخر لاحقاً"
          }
        ]
      },
      {
        id: "homework",
        title: "الواجب السلوكي",
        subtitle: "حوّل انتقاداتك إلى طلبات إيجابية",
        content: [
          {
            type: "challenge",
            title: "📝 التحدي:",
            description: "اختر شيئاً كنت تنتقد شريكك بسببه مؤخراً",
            steps: ["حدد الانتقاد الذي تريد تغييره", "اعد صياغته باستخدام قاعدة 'أنا'", "اطلبه بشكل محدد وقابل للقياس", "سجّل رد فعل شريكك الإيجابي في محلل A-B-C"]
          }
        ]
      }
    ]
  };

  const allModules = [timeoutModule, activeListeningModule, expressingNeedsModule];

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
              الأدوات المتاحة
            </CardTitle>
            <CardDescription className="arabic-text">
              وحدات تعليمية قصيرة (10-15 دقيقة) لتطوير مهارات التواصل الإيجابي وحل الخلافات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {allModules.map((module) => (
                <div 
                  key={module.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    activeModule === module.id ? "border-emerald-400 bg-emerald-50" : "border-emerald-200 hover:bg-emerald-50"
                  }`}
                  onClick={() => setActiveModule(module.id)}
                  data-testid={`${module.id}-skill-card`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-semibold arabic-text text-emerald-800">
                        {module.title}
                      </h3>
                      <p className="text-sm text-emerald-600 arabic-text mt-1">
                        {module.description}
                      </p>
                      {module.goal && (
                        <p className="text-xs text-emerald-500 arabic-text mt-1 font-medium">
                          الهدف: {module.goal}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="arabic-text text-xs">
                          {module.duration}
                        </Badge>
                        <Badge variant="secondary" className="arabic-text text-xs">
                          {module.sections.length} أقسام
                        </Badge>
                      </div>
                    </div>
                    {completedModules.has(module.id) && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <span className="text-lg">✅</span>
                        <span className="text-xs arabic-text">مكتمل</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Content */}
        {allModules.map((module) => (
          activeModule === module.id && (
            <Card key={module.id} className="glass border-emerald-200">
              <CardHeader>
                <CardTitle className="arabic-title text-emerald-800 flex items-center gap-3">
                  <span className="text-2xl">
                    {module.id === 'timeout' && '🧘'}
                    {module.id === 'active_listening' && '👂'}
                    {module.id === 'expressing_needs' && '💬'}
                  </span>
                  {module.title}
                </CardTitle>
                <CardDescription className="arabic-text">
                  {module.description}
                </CardDescription>
                {module.goal && (
                  <p className="text-sm text-emerald-600 arabic-text font-medium">
                    🎯 {module.goal}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={module.sections[0].id} className="w-full">
                  <TabsList className={`grid w-full grid-cols-${module.sections.length} mb-6`}>
                    {module.sections.map((section) => (
                      <TabsTrigger key={section.id} value={section.id} className="arabic-text text-xs">
                        {section.title.split('(')[0].trim()}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {module.sections.map((section) => (
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
                            {renderContentItem(item, index)}
                          </div>
                        ))}
                      </div>

                      {/* Practice Button */}
                      {section.id === module.sections[module.sections.length - 1].id && (
                        <div className="text-center pt-6 border-t border-emerald-200">
                          <Button
                            onClick={() => markModuleComplete(module.id)}
                            disabled={completedModules.has(module.id)}
                            className="btn-primary arabic-text px-8"
                            data-testid="complete-module-button"
                          >
                            {completedModules.has(module.id) ? "تم الإكمال ✅" : "أكملت هذه المهارة (+3 نقاط)"}
                          </Button>
                          <p className="text-xs text-emerald-600 arabic-text mt-2">
                            ستحصل على 3 نقاط عند إكمال هذه الوحدة
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )
        ))}

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