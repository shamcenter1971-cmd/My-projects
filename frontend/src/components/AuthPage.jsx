import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(false); // Toggle between login and register
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const response = await axios.post(`${API}/login`, {
          email: formData.email
        });
        toast.success("تم تسجيل الدخول بنجاح!");
        onLogin(response.data);
      } else {
        // Registration flow
        const response = await axios.post(`${API}/users`, formData);
        toast.success("تم إنشاء الحساب بنجاح! يمكنك الآن ربط حسابك مع شريك حياتك");
        onLogin(response.data);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 
        (isLogin ? "حدث خطأ أثناء تسجيل الدخول" : "حدث خطأ أثناء إنشاء الحساب");
      toast.error(message);
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: "", email: "" }); // Reset form
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <span className="text-2xl text-white font-bold arabic-title">م</span>
            </div>
            <h1 className="text-3xl font-bold arabic-title text-emerald-800 mb-2">
              ميثاق
            </h1>
            <p className="text-lg text-emerald-600 arabic-text">
              رحلة التعلم السلوكي للأزواج
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="glass border-emerald-200 animate-slide-in">
          <CardHeader className="text-center">
            <CardTitle className="arabic-title text-xl text-emerald-800">
              {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </CardTitle>
            <CardDescription className="arabic-text text-emerald-600">
              {isLogin 
                ? "أدخل بريدك الإلكتروني للدخول إلى حسابك" 
                : "ابدأ رحلتك في تحسين التواصل مع شريك حياتك"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="arabic-text text-emerald-700 font-medium">
                    الاسم الكامل
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input arabic-text"
                    data-testid="name-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="arabic-text text-emerald-700 font-medium">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input arabic-text"
                  data-testid="email-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full btn-primary arabic-text text-lg py-3"
                data-testid={isLogin ? "login-button" : "register-button"}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isLogin ? "جاري تسجيل الدخول..." : "جاري الإنشاء..."}
                  </div>
                ) : (
                  isLogin ? "تسجيل الدخول" : "إنشاء الحساب"
                )}
              </Button>

              {/* Toggle between login and register */}
              <div className="text-center pt-4 border-t border-emerald-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleMode}
                  className="arabic-text text-emerald-600 hover:text-emerald-800"
                  data-testid="toggle-auth-mode"
                >
                  {isLogin 
                    ? "ليس لديك حساب؟ إنشاء حساب جديد" 
                    : "هل لديك حساب بالفعل؟ تسجيل الدخول"
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-1 gap-4 mt-8 animate-fade-in">
          <div className="glass rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-sm">📊</span>
              </div>
              <div>
                <h3 className="font-semibold arabic-text text-emerald-800">تحليل السلوك A-B-C</h3>
                <p className="text-sm text-emerald-600 arabic-text">اكتشف أنماط السلوك وحسن التفاعل</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-sm">🎁</span>
              </div>
              <div>
                <h3 className="font-semibold arabic-text text-emerald-800">بنك التعزيز الإيجابي</h3>
                <p className="text-sm text-emerald-600 arabic-text">اكسب نقاط واستبدلها بما يسعد شريكك</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-sm">💑</span>
              </div>
              <div>
                <h3 className="font-semibold arabic-text text-emerald-800">حسابات مترابطة</h3>
                <p className="text-sm text-emerald-600 arabic-text">تفاعل مع شريكك بشكل آمن ومحمي</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;