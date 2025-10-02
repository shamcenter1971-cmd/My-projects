import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PairingPage = ({ user, onPairSuccess, onLogout }) => {
  const [pairingCode, setPairingCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePair = async (e) => {
    e.preventDefault();
    if (!pairingCode.trim()) {
      toast.error("يرجى إدخال رمز الربط");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/users/${user.id}/pair`, {
        pairing_code: pairingCode.toUpperCase()
      });
      
      toast.success(`تم الربط بنجاح مع ${response.data.partner_name}! مرحباً بكما في ميثاق`);
      onPairSuccess({ name: response.data.partner_name });
    } catch (error) {
      const message = error.response?.data?.detail || "حدث خطأ أثناء الربط";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyPairingCode = () => {
    navigator.clipboard.writeText(user.pairing_code);
    toast.success("تم نسخ رمز الربط!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl text-white font-bold arabic-title">💑</span>
          </div>
          <h1 className="text-2xl font-bold arabic-title text-emerald-800 mb-2">
            مرحباً {user.name}!
          </h1>
          <p className="text-emerald-600 arabic-text">
            الآن حان وقت ربط حسابك مع شريك حياتك لبدء رحلة التحسن معاً
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Your Pairing Code */}
          <Card className="glass border-emerald-200 animate-slide-in">
            <CardHeader className="text-center">
              <CardTitle className="arabic-title text-lg text-emerald-800 flex items-center justify-center gap-2">
                <span>📱</span>
                رمز الربط الخاص بك
              </CardTitle>
              <CardDescription className="arabic-text text-emerald-600">
                شارك هذا الرمز مع شريك حياتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
                  <div 
                    className="text-3xl font-bold arabic-title text-emerald-800 tracking-wider cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={copyPairingCode}
                    data-testid="pairing-code"
                  >
                    {user.pairing_code}
                  </div>
                </div>
                <Button
                  onClick={copyPairingCode}
                  variant="outline"
                  className="mt-3 arabic-text"
                  data-testid="copy-code-button"
                >
                  📋 نسخ الرمز
                </Button>
              </div>
              
              <div className="text-center text-sm text-emerald-600 arabic-text">
                <p>انقر على الرمز أو الزر لنسخه</p>
                <p className="mt-2">أرسله لشريكك عبر الواتس أب أو أي تطبيق آخر</p>
              </div>
            </CardContent>
          </Card>

          {/* Enter Partner's Code */}
          <Card className="glass border-emerald-200 animate-slide-in">
            <CardHeader className="text-center">
              <CardTitle className="arabic-title text-lg text-emerald-800 flex items-center justify-center gap-2">
                <span>🔗</span>
                أدخل رمز شريك حياتك
              </CardTitle>
              <CardDescription className="arabic-text text-emerald-600">
                أدخل الرمز الذي حصلت عليه من شريكك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePair} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pairingCode" className="arabic-text text-emerald-700 font-medium">
                    رمز الربط (8 أحرف/أرقام)
                  </Label>
                  <Input
                    id="pairingCode"
                    type="text"
                    placeholder="مثل: A1B2C3D4"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="form-input arabic-text text-center text-lg font-bold tracking-wider"
                    data-testid="pairing-code-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || pairingCode.length !== 8}
                  className="w-full btn-primary arabic-text"
                  data-testid="pair-button"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري الربط...
                    </div>
                  ) : (
                    "ربط الحسابات"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="glass border-emerald-200 animate-fade-in">
          <CardContent className="p-6">
            <h3 className="font-semibold arabic-title text-emerald-800 mb-4 text-center">
              كيفية الربط:
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">1</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  انسخ رمزك الخاص وأرسله لشريكك
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">2</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  اطلب من شريكك إنشاء حساب والحصول على رمزه
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 font-bold">3</span>
                </div>
                <p className="text-sm arabic-text text-emerald-700">
                  أدخل رمز شريكك هنا لربط الحسابات
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Option */}
        <div className="text-center">
          <Button 
            onClick={onLogout}
            variant="outline"
            className="arabic-text text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            data-testid="logout-button"
          >
            تسجيل خروج
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PairingPage;