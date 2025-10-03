import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RepairCycle = ({ user, partner, onBack, onComplete }) => {
  const [activeRepairCycle, setActiveRepairCycle] = useState(null);
  const [behaviorContext, setBehaviorContext] = useState(null); // A-B-C context
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchActiveRepairCycle();
  }, [user.id]);

  const fetchActiveRepairCycle = async () => {
    try {
      const response = await axios.get(`${API}/repair-cycles/${user.id}/active`);
      if (response.data) {
        setActiveRepairCycle(response.data);
        determineCurrentStep(response.data);
        
        // Fetch the A-B-C behavior context
        await fetchBehaviorContext(response.data.behavior_id);
      }
    } catch (error) {
      console.error("Error fetching repair cycle:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBehaviorContext = async (behaviorId) => {
    try {
      // Get the specific behavior that triggered this repair cycle
      const behaviorResponse = await axios.get(`${API}/behaviors/${user.id}/couple`);
      const behavior = behaviorResponse.data.find(b => b.id === behaviorId);
      if (behavior) {
        setBehaviorContext(behavior);
      }
    } catch (error) {
      console.error("Error fetching behavior context:", error);
    }
  };

  const determineCurrentStep = (cycle) => {
    if (!cycle.offender_acknowledged) {
      setCurrentStep(0); // Acknowledge step
    } else if (!cycle.compensation_paid) {
      setCurrentStep(1); // Payment step
    } else if (!cycle.offender_skill_completed) {
      setCurrentStep(2); // Learning step
    } else {
      setCurrentStep(3); // Completed
    }
  };

  const performRepairAction = async (actionType, skillId = null) => {
    try {
      const response = await axios.post(`${API}/repair-cycles/${activeRepairCycle.id}/action?user_id=${user.id}`, {
        action_type: actionType,
        skill_id: skillId
      });

      toast.success("تم تنفيذ الخطوة بنجاح!");
      
      if (actionType === "acknowledge") {
        setCurrentStep(1);
      } else if (actionType === "pay_compensation") {
        setCurrentStep(2);
        toast.success("تم إرسال 3 نقاط تعويض لشريكك");
      } else if (actionType === "complete_skill") {
        setCurrentStep(3);
        toast.success("تم إكمال دورة الإصلاح الفورية بنجاح!");
        setTimeout(() => {
          onComplete && onComplete();
        }, 2000);
      }

      // Refresh the repair cycle data
      await fetchActiveRepairCycle();
      
    } catch (error) {
      const message = error.response?.data?.detail || "حدث خطأ أثناء تنفيذ الإجراء";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-emerald-600 arabic-text">جاري تحميل دورة الإصلاح...</p>
        </div>
      </div>
    );
  }

  if (!activeRepairCycle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass border-emerald-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-xl font-bold arabic-title text-emerald-800 mb-2">
              لا توجد دورة إصلاح نشطة
            </h2>
            <p className="text-emerald-600 arabic-text mb-4">
              ليس هناك سلوكيات سلبية تتطلب إصلاحاً فورياً في الوقت الحالي
            </p>
            <Button onClick={onBack} className="btn-primary arabic-text">
              العودة للوحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const repairSteps = [
    {
      id: "acknowledge",
      title: "الإقرار بالملاحظة",
      description: "أقر بأن شريكي لاحظ سلوكاً سلبياً مني",
      action: "أقر بالملاحظة وبدأت الإصلاح",
      completed: activeRepairCycle.offender_acknowledged
    },
    {
      id: "compensation",
      title: "التعويض الرمزي",
      description: "إرسال 3 نقاط كبادرة اعتذار وتقدير لشريكي",
      action: "أرسل 3 نقاط تعويض لشريكي",
      completed: activeRepairCycle.compensation_paid
    },
    {
      id: "learning",
      title: "التعلم الإلزامي",
      description: "إكمال وحدة تعليمية لتجنب تكرار السلوك السلبي",
      action: "إكمال مهارة الاستراحة والتهدئة الذاتية",
      completed: activeRepairCycle.offender_skill_completed
    }
  ];

  const getStepIcon = (index, completed) => {
    if (completed) return "✅";
    if (index === currentStep) return "🔄";
    return "⭕";
  };

  const getStepColor = (index, completed) => {
    if (completed) return "text-green-600";
    if (index === currentStep) return "text-blue-600";
    return "text-gray-400";
  };

  const progressPercentage = ((currentStep) / 3) * 100;

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
              دورة الإصلاح الفورية
            </h1>
            <p className="text-emerald-600 arabic-text">
              خطوات إلزامية لإصلاح السلوك السلبي وتقوية العلاقة
            </p>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="glass border-emerald-200 mb-6">
          <CardHeader>
            <CardTitle className="arabic-title text-emerald-800">
              مؤشر التقدم في الإصلاح
            </CardTitle>
            <CardDescription className="arabic-text">
              اكمل جميع الخطوات لإنهاء دورة الإصلاح الفورية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-center arabic-text text-sm text-emerald-600">
                {currentStep} من 3 خطوات مكتملة ({Math.round(progressPercentage)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Repair Steps */}
        <div className="space-y-4">
          {repairSteps.map((step, index) => (
            <Card 
              key={step.id}
              className={`glass border-emerald-200 transition-all ${
                index === currentStep ? 'ring-2 ring-emerald-400' : ''
              } ${step.completed ? 'bg-green-50' : ''}`}
              data-testid={`repair-step-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {getStepIcon(index, step.completed)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold arabic-title mb-2 ${getStepColor(index, step.completed)}`}>
                      الخطوة {index + 1}: {step.title}
                    </h3>
                    <p className="arabic-text text-gray-700 mb-4">
                      {step.description}
                    </p>
                    
                    {!step.completed && index === currentStep && (
                      <div className="space-y-3">
                        <Separator />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => {
                              if (step.id === "acknowledge") {
                                performRepairAction("acknowledge");
                              } else if (step.id === "compensation") {
                                performRepairAction("pay_compensation");
                              } else if (step.id === "learning") {
                                performRepairAction("complete_skill", "timeout");
                              }
                            }}
                            className="btn-primary arabic-text flex-1"
                            data-testid={`${step.id}-button`}
                          >
                            {step.action}
                          </Button>
                          
                          {step.id === "learning" && (
                            <Button
                              onClick={() => window.open('/help-tools', '_blank')}
                              variant="outline"
                              className="arabic-text"
                            >
                              انتقل لأدوات المساعدة
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {step.completed && (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="text-sm arabic-text font-medium">
                          ✅ تم إكمال هذه الخطوة
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion Message */}
        {currentStep === 3 && (
          <Card className="glass border-green-300 bg-green-50">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold arabic-title text-green-800 mb-4">
                تهانينا! تم إكمال دورة الإصلاح الفورية
              </h2>
              <p className="arabic-text text-green-700 mb-6">
                لقد قمت بإقرار السلوك السلبي، وأرسلت التعويض، وأكملت التعلم المطلوب.
                هذا يُظهر التزامك بتحسين العلاقة مع شريك حياتك.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={onBack}
                  className="btn-primary arabic-text"
                >
                  العودة للوحة الرئيسية
                </Button>
                <Button 
                  onClick={() => window.open('/behavior-analyzer', '_self')}
                  variant="outline"
                  className="arabic-text"
                >
                  سجل سلوكاً إيجابياً
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Note */}
        <Card className="glass border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold arabic-text text-amber-800 mb-2">
                  ملاحظة مهمة
                </h4>
                <p className="text-sm arabic-text text-amber-700">
                  دورة الإصلاح الفورية مصممة لمساعدتك على التعلم من السلوكيات السلبية وتقوية علاقتك.
                  إكمال جميع الخطوات مطلوب للعودة للاستخدام العادي للتطبيق.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepairCycle;