import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, CheckCircle, Globe, Loader2, Lock, ShoppingCart, User } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuthContext();
  const [, navigate] = useLocation();
  const { toggleLanguage, language } = useLocale();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(username, password);
      
      if (success) {
        navigate('/');
      } else {
        setError(t('login_error'));
      }
    } catch (err) {
      console.error("خطأ في تسجيل الدخول:", err);
      setError(t('login_error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-pattern p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl card-glass rounded-2xl overflow-hidden">
        {/* قسم جانبي للترحيب */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-primary/90 to-indigo-600/90 text-white">
          <div>
            <div className="inline-flex items-center p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white mb-6">
              <ShoppingCart className="h-7 w-7 mr-2" />
              <span className="text-xl font-bold">Sales Ghazy</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-6">{t('login_welcome')}</h1>
            <p className="text-lg opacity-90 mb-8">{t('login_description')}</p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-white/80" />
                <span>{t('feature_inventory')}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-white/80" />
                <span>{t('feature_invoicing')}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-white/80" />
                <span>{t('feature_reporting')}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-6 flex items-center text-white/80 text-sm">
            <Globe className="h-4 w-4 mr-2" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white hover:bg-white/10"
              onClick={toggleLanguage}
            >
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </div>
        
        {/* قسم تسجيل الدخول */}
        <div className="p-8">
          <div className="md:hidden text-center mb-8">
            <ShoppingCart className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold gradient-heading">Sales Ghazy</h1>
            <p className="text-muted-foreground mt-2">{t('login_description')}</p>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold">{t('login')}</h2>
            <p className="text-muted-foreground mt-1">{t('login_to_access_dashboard')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t('username')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="username" 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 py-6"
                  placeholder={t('username_placeholder')}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                  {t('forgot_password')}
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 py-6"
                  placeholder={t('password_placeholder')}
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full py-6 text-base btn-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('logging_in')}
                </>
              ) : (
                <>
                  {t('login')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm text-muted-foreground md:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center mx-auto"
              onClick={toggleLanguage}
            >
              <Globe className="mr-2 h-4 w-4" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}