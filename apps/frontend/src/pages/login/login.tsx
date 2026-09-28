import { LoginCardWidget } from '@/widgets/auth/';
import { useUser } from '@entities/model-user';
import { Navigate } from 'react-router-dom';
import { BarChart2, Search, ClipboardCheck, TrendingUp } from 'lucide-react';

export const LoginPage = () => {
  const { isAuthenticated } = useUser();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900"
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      
      {/* Gradient Overlay for the left side */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#6b0326] via-[#990537]/80 to-transparent w-full lg:w-3/4" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24 h-full">
        
        {/* Left Side: Information & Branding */}
        <div className="flex-1 text-white flex flex-col items-center lg:items-start text-center lg:text-left pt-8 lg:pt-0 relative">
          
          {/* Subtle Watermark (Chakana Emblem) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none w-[400px] h-[400px]">
            <img src="/LOGGO1.png" alt="Emblema Lampa" className="w-full h-full object-contain" />
          </div>

          <div className="flex flex-col items-center lg:items-start mb-4 relative z-10">
            <img src="/LOGO2W.png" alt="UGEL Lampa" className="h-20 lg:h-24 object-contain mb-2 drop-shadow-md bg-white/80 p-2 rounded-xl" />
          </div>
          
          <p className="text-yellow-400 font-medium italic text-lg mb-8 tracking-wide relative z-10">
            Comprometidos con la educación
          </p>

          <h1 className="text-5xl lg:text-6xl font-black mb-2 leading-tight drop-shadow-lg relative z-10">
            SISTEMA DE
            <br />
            <span className="text-yellow-400">MONITOREO</span> - LAMPA
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-100 max-w-xl mb-12 mt-4 leading-relaxed text-shadow-sm font-medium">
            Plataforma para el monitoreo y evaluación del directivo y docente de educación básica de la UGEL Lampa.
          </p>

          {/* Feature Icons */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-6 lg:gap-10 mb-10">
            <FeatureIcon icon={<BarChart2 size={32} />} label="Planificar" />
            <FeatureIcon icon={<Search size={32} />} label="Monitorear" />
            <FeatureIcon icon={<ClipboardCheck size={32} />} label="Evaluar" />
            <FeatureIcon icon={<TrendingUp size={32} />} label="Mejorar" />
          </div>
          
          <p className="text-yellow-400 font-medium italic text-xl tracking-wide mt-auto">
            Juntos por una mejor educación
          </p>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-[420px] flex-shrink-0 relative">
          <div className="flex justify-end mb-4 pr-2">
            <img 
              src="/LOMO FOLDERSS 2024.png" 
              alt="AGP" 
              className="h-16 lg:h-20 object-contain bg-white rounded-xl shadow-lg border border-slate-200/50 p-2"
            />
          </div>
          <LoginCardWidget />
        </div>
        
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-4 right-4 lg:right-8 flex items-center gap-2 text-white/60 text-[10px] font-semibold tracking-wider uppercase z-10 pointer-events-none">
        <span>Desarrollado por</span>
        <img src="/LOGO_UNSA.png" alt="UNSA" className="h-6 object-contain opacity-80 drop-shadow-sm" />
      </div>
    </div>
  );
};

const FeatureIcon = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-3 group cursor-default">
    <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center bg-black/10 backdrop-blur-sm group-hover:bg-white/10 group-hover:border-yellow-400 group-hover:text-yellow-400 transition-all duration-300 shadow-lg">
      {icon}
    </div>
    <span className="text-sm font-semibold tracking-wide group-hover:text-yellow-400 transition-colors">
      {label}
    </span>
  </div>
);
