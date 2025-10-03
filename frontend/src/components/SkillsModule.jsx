import React, { useState, useEffect } from "react";
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
  const [sectionProgress, setSectionProgress] = useState({}); // Track section completion
  const [unlockedSections, setUnlockedSections] = useState({}); // Track unlocked sections
  const [commitmentPhrases, setCommitmentPhrases] = useState({}); // Store user's commitment phrases
  const [currentCommitmentPhrase, setCurrentCommitmentPhrase] = useState(""); // Current input
  const [showCommitmentInput, setShowCommitmentInput] = useState(false);
  const [currentCommitmentSection, setCurrentCommitmentSection] = useState(null);

  useEffect(() => {
    // Initialize first section as unlocked for each module
    const initialUnlocked = {};
    allModules.forEach(module => {
      initialUnlocked[module.id] = { [module.sections[0].id]: true };
    });
    setUnlockedSections(initialUnlocked);
  }, []);

  const handleSectionInteraction = (moduleId, sectionId, interactionType) => {
    const progressKey = `${moduleId}_${sectionId}`;
    
    // Mark section as interacted with
    setSectionProgress(prev => ({
      ...prev,
      [progressKey]: true
    }));

    // Unlock next section
    const module = allModules.find(m => m.id === moduleId);
    const currentSectionIndex = module.sections.findIndex(s => s.id === sectionId);
    const nextSection = module.sections[currentSectionIndex + 1];
    
    if (nextSection) {
      setUnlockedSections(prev => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [nextSection.id]: true
        }
      }));
    }

    toast.success("تم إكمال هذا القسم! انتقل للقسم التالي");
  };

  const handleCommitmentPhrase = async (moduleId, sectionId, phrase) => {
    try {
      // Save commitment phrase to backend
      await axios.post(`${API}/commitment-phrases`, {
        user_id: user.id,
        module_id: moduleId,
        section_id: sectionId,
        phrase: phrase,
        display_on_dashboard: true
      });

      setCommitmentPhrases(prev => ({
        ...prev,
        [`${moduleId}_${sectionId}`]: phrase
      }));

      setShowCommitmentInput(false);
      setCurrentCommitmentPhrase("");
      
      toast.success("تم حفظ عبارة الالتزام الشخصية! ستظهر في لوحة التحكم كتذكير فوري");
      
      // Mark this as interaction completed
      handleSectionInteraction(moduleId, sectionId, 'commitment');
      
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ عبارة الالتزام");
    }
  };

  const markModuleComplete = async (moduleId) => {
    // Check if all sections have been interacted with
    const module = allModules.find(m => m.id === moduleId);
    const requiredInteractions = module.sections.length;
    const completedInteractions = module.sections.filter(section => 
      sectionProgress[`${moduleId}_${section.id}`]
    ).length;

    if (completedInteractions < requiredInteractions) {
      toast.error(`يجب إكمال جميع الأقسام التفاعلية أولاً (${completedInteractions}/${requiredInteractions})`);
      return;
    }

    // Check if commitment phrase is required and saved
    const hasCommitmentSection = module.sections.some(s => 
      s.id === 'how' || s.id === 'specific_requests' || s.id === 'scripts'
    );
    
    if (hasCommitmentSection && !commitmentPhrases[`${moduleId}_commitment`]) {
      toast.error("يجب حفظ عبارة الالتزام الشخصية أولاً!");
      return;
    }

    try {
      // Award points for completing a module (only after all interactions)
      await axios.post(`${API}/points/award?user_id=${user.id}`, {
        partner_id: partner.id,
        points: 3,
        transaction_type: "earned",
        description: `أكمل وحدة مهارة تفاعلية: ${getModuleTitle(moduleId)}`
      });

      setCompletedModules(prev => new Set([...prev, moduleId]));
      toast.success("تم إكمال الوحدة التفاعلية بنجاح! حصلت على 3 نقاط");
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ التقدم");
    }
  };

  const getModuleTitle = (moduleId) => {
    const module = allModules.find(m => m.id === moduleId);
    return module ? module.title : moduleId;
  };

  const renderContentItem = (item, index) => {
    switch (item.type) {
      case "category":
        return (
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
        );

      case "script":
        return (
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
        );

      case "technique":
        return (
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
        );

      case "comparison":
        return (
          <Card className="border-emerald-200">
            <CardContent className="p-4">
              <h4 className="font-semibold arabic-text text-emerald-800 mb-3">
                {item.title}
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500">❌</span>
                    <span className="font-medium arabic-text text-red-700">تجنب:</span>
                  </div>
                  <p className="arabic-text text-red-600">"{item.wrong}"</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500">✅</span>
                    <span className="font-medium arabic-text text-green-700">بدلاً من ذلك:</span>
                  </div>
                  <p className="arabic-text text-green-600">"{item.right}"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "challenge":
        return (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <h4 className="font-semibold arabic-text text-amber-800 mb-2">
                {item.title}
              </h4>
              <p className="arabic-text text-amber-700 mb-3">
                {item.description}
              </p>
              <div className="space-y-2">
                {item.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-xs">
                      {stepIndex + 1}
                    </span>
                    <span className="arabic-text text-sm text-amber-700">{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
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
    <div className="min-h-screen p-2 sm:p-4 space-y-6">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 skills-module-container">
        {/* Header */}
        <div className="dashboard-header mb-6 sm:mb-8">
          <Button 
            onClick={onBack}
            variant="outline"
            className="arabic-text mb-4 md:mb-0 w-full sm:w-auto"
            data-testid="back-button"
          >
            ← العودة
          </Button>
          <div className="text-center md:text-right w-full">
            <h1 className="text-2xl sm:text-3xl font-bold arabic-title text-emerald-800 mb-3 skills-module-title">
              أدوات المساعدة وحل الخلافات
            </h1>
            <p className="text-emerald-600 arabic-text text-base sm:text-lg leading-relaxed px-2">
              تعلم المهارات البديلة للسلوكيات السلبية المسجلة في محلل السلوك
            </p>
          </div>
        </div>

        {/* Skills Overview */}
        <Card className="glass border-emerald-200 mb-6 sm:mb-8 w-full">
          <CardHeader className="pb-4 px-3 sm:px-6">
            <CardTitle className="arabic-title text-emerald-800 text-xl sm:text-2xl mb-3 text-center">
              الأدوات المتاحة
            </CardTitle>
            <CardDescription className="arabic-text text-sm sm:text-base leading-relaxed text-center px-1">
              وحدات تعليمية قصيرة (10-15 دقيقة) لتطوير مهارات التواصل الإيجابي وحل الخلافات
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6">
            <div className="grid gap-4 sm:gap-6 w-full">
              {allModules.map((module) => (
                <div 
                  key={module.id}
                  className={`skill-section cursor-pointer transition-all w-full ${
                    activeModule === module.id ? "border-emerald-400 bg-emerald-50 shadow-md" : "border-emerald-200 hover:bg-emerald-50"
                  }`}
                  onClick={() => setActiveModule(module.id)}
                  data-testid={`${module.id}-skill-card`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 w-full">
                    <div className="flex-1 w-full">
                      <h3 className="text-lg sm:text-xl font-semibold arabic-title text-emerald-800 mb-2 sm:mb-3 text-center sm:text-right">
                        {module.title}
                      </h3>
                      <p className="text-emerald-600 arabic-text mb-2 sm:mb-3 leading-relaxed text-center sm:text-right text-sm sm:text-base">
                        {module.description}
                      </p>
                      {module.goal && (
                        <p className="text-xs sm:text-sm text-emerald-500 arabic-text mb-3 sm:mb-4 font-medium leading-relaxed text-center sm:text-right">
                          🎯 الهدف: {module.goal}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                        <Badge variant="secondary" className="arabic-text px-2 sm:px-3 py-1 text-xs">
                          {module.duration}
                        </Badge>
                        <Badge variant="secondary" className="arabic-text px-2 sm:px-3 py-1 text-xs">
                          {module.sections.length} أقسام
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto text-center">
                      {completedModules.has(module.id) && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <span className="text-xl sm:text-2xl">✅</span>
                          <span className="text-xs sm:text-sm arabic-text font-medium">مكتمل</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Content */}
        {allModules.map((module) => (
          activeModule === module.id && (
            <Card key={module.id} className="glass border-emerald-200 mb-6 sm:mb-8 w-full">
              <CardHeader className="pb-4 sm:pb-6 px-3 sm:px-6">
                <CardTitle className="arabic-title text-emerald-800 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-xl sm:text-2xl mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">
                    {module.id === 'timeout' && '🧘'}
                    {module.id === 'active_listening' && '👂'}
                    {module.id === 'expressing_needs' && '💬'}
                  </span>
                  <div className="flex-1 text-center sm:text-right">
                    {module.title}
                  </div>
                </CardTitle>
                <CardDescription className="arabic-text text-sm sm:text-base leading-relaxed mb-3 text-center sm:text-right px-1">
                  {module.description}
                </CardDescription>
                {module.goal && (
                  <div className="skill-section bg-blue-50 border-l-4 border-blue-400 w-full">
                    <p className="text-blue-700 arabic-text font-medium leading-relaxed text-sm sm:text-base text-center sm:text-right">
                      🎯 {module.goal}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6">
                <Tabs defaultValue={module.sections[0].id} className="w-full tabs-container">
                  <div className="overflow-x-auto mb-6 sm:mb-8">
                    <TabsList className="w-full flex flex-wrap sm:grid gap-1 sm:gap-2" style={{gridTemplateColumns: `repeat(${module.sections.length}, 1fr)`}}>
                      {module.sections.map((section, index) => (
                        <TabsTrigger 
                          key={section.id} 
                          value={section.id} 
                          className="tab-trigger arabic-text text-center px-2 py-2 sm:px-2 sm:py-3 flex-shrink-0 min-w-0"
                          disabled={!unlockedSections[module.id]?.[section.id] && index > 0}
                        >
                          <div className="flex flex-col items-center justify-center gap-1 sm:gap-2">
                            {unlockedSections[module.id]?.[section.id] ? (
                              <span className="text-green-500 text-sm sm:text-base">🔓</span>
                            ) : (
                              <span className="text-gray-400 text-sm sm:text-base">🔒</span>
                            )}
                            <span className="text-xs leading-tight text-center break-words">
                              {section.title.split('(')[0].trim()}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {module.sections.map((section) => (
                    <TabsContent key={section.id} value={section.id} className="mt-0">
                      <div className="skill-section bg-gradient-to-r from-emerald-50 to-teal-50 mb-6 sm:mb-8 w-full">
                        <div className="text-center w-full">
                          <h2 className="text-xl sm:text-2xl font-bold arabic-title text-emerald-800 mb-3 sm:mb-4 leading-relaxed">
                            {section.title}
                          </h2>
                          <p className="text-emerald-600 arabic-text text-base sm:text-lg leading-relaxed px-2">
                            {section.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6 sm:space-y-8 w-full">
                        {section.content.map((item, index) => (
                          <div key={index} className="no-overlap w-full">
                            {renderContentItem(item, index)}
                          </div>
                        ))}
                      </div>

                      {/* Interactive Elements */}
                      <div className="skill-section bg-amber-50 border border-amber-200 mt-6 sm:mt-8 w-full">
                        <div className="text-center w-full">
                          <h3 className="text-base sm:text-lg font-bold arabic-title text-amber-800 mb-3 sm:mb-4">
                            تفاعل مطلوب لإكمال هذا القسم
                          </h3>
                          {!sectionProgress[`${module.id}_${section.id}`] ? (
                            <Button
                              onClick={() => handleSectionInteraction(module.id, section.id, 'interaction')}
                              className="btn-primary arabic-text px-6 sm:px-8 py-2 sm:py-3 w-full sm:w-auto"
                              data-testid={`interact-${section.id}`}
                            >
                              ✅ فهمت محتوى هذا القسم
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 sm:gap-3 text-green-600 w-full">
                              <span className="text-xl sm:text-2xl">✅</span>
                              <span className="arabic-text font-medium text-base sm:text-lg">تم إكمال هذا القسم</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Completion Button - only show on last section */}
                      {section.id === module.sections[module.sections.length - 1].id && (
                        <div className="skill-section bg-green-50 border border-green-200 text-center mt-6 sm:mt-8 w-full">
                          <Button
                            onClick={() => markModuleComplete(module.id)}
                            disabled={completedModules.has(module.id)}
                            className="btn-primary arabic-text px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                            data-testid="complete-module-button"
                          >
                            {completedModules.has(module.id) ? "تم الإكمال ✅" : "أكملت هذه المهارة (+3 نقاط)"}
                          </Button>
                          <p className="text-xs sm:text-sm text-green-600 arabic-text mt-2 sm:mt-3 leading-relaxed px-2">
                            ستحصل على 3 نقاط عند إكمال جميع الأقسام التفاعلية
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