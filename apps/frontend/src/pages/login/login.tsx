import type { ReactNode } from 'react';
import { LoginCardWidget } from '@/widgets/auth/';
import { useUser } from '@entities/model-user';
import { Navigate } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, BarChart3, MessageSquareText } from 'lucide-react';

const FUNCIONES = [
  { icon: <CalendarDays size={26} />, titulo: 'Planificar', detalle: 'Programa los cronogramas de visita.' },
  { icon: <ClipboardCheck size={26} />, titulo: 'Monitorear', detalle: 'Registra la ficha en el aula.' },
  { icon: <BarChart3 size={26} />, titulo: 'Evaluar', detalle: 'Califica con la rúbrica vigente.' },
  { icon: <MessageSquareText size={26} />, titulo: 'Mejorar', detalle: 'Retroalimenta y da seguimiento.' },
];

export const LoginPage = () => {
  const { isAuthenticated } = useUser();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <div className="relative flex-1 lg:basis-[58%] flex flex-col">
        <div className="relative h-[380px] sm:h-[460px] lg:h-[64vh] lg:min-h-[480px] w-full shrink-0 overflow-hidden bg-slate-100">
          <img
            src="/login-foto.webp"
            alt="Especialista observando una sesión de aula"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* En celular el texto ocupa todo el ancho y cae sobre los alumnos de
              la foto: ahí el velo blanco tiene que cubrir de punta a punta. */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/55 lg:from-white lg:via-white/60 lg:to-transparent w-full lg:w-[70%] pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col justify-start px-6 lg:px-16 pt-8 sm:pt-10 lg:pt-14 max-w-2xl animate-in fade-in-0 slide-in-from-left-4 duration-700 motion-reduce:animate-none">
            <div className="flex items-center gap-4 mb-6 sm:mb-8">
              <img src="/logo-ugel-lampa.webp" alt="UGEL Lampa" className="h-16 lg:h-20 object-contain shrink-0" />
              <div className="h-14 w-px bg-primary/40 shrink-0" />
              <p className="text-xs lg:text-sm font-semibold text-slate-700 uppercase tracking-wide leading-snug">
                Unidad de Gestión
                <br />
                Educativa Local
                <br />
                Lampa
              </p>
            </div>

            <h1 className="text-[2rem] sm:text-4xl lg:text-[3.25rem] font-black text-slate-800 leading-[1.05] tracking-tight mb-4 sm:mb-5">
              Sistema de
              <br />
              <span className="text-primary">Monitoreo Docente</span>
              <br />
              <span className="text-primary">y Directivo</span>
            </h1>

            <p className="text-[15px] sm:text-base lg:text-lg text-slate-600 max-w-lg leading-relaxed">
              Plataforma para el monitoreo y evaluación del directivo y docente de educación básica
              de la UGEL Lampa.
            </p>
          </div>

          <Cordillera />
        </div>

        <div className="flex-1 bg-gradient-to-b from-primary to-primary-dark px-4 sm:px-6 lg:px-12 pt-2 pb-8 flex flex-col justify-between gap-7 sm:gap-8 -mt-px">
          <div className="grid grid-cols-4 divide-x divide-white/20">
            {FUNCIONES.map((f) => (
              <Funcion key={f.titulo} {...f} />
            ))}
          </div>

          {/* Una sola línea en cualquier ancho: partido en dos, el trazo dorado
              quedaba colgado debajo de la segunda palabra. El contenedor
              `inline-flex` hace que el trazo mida lo mismo que el texto. */}
          <div className="self-start inline-flex flex-col pl-2 -rotate-3 origin-left">
            <p className="font-script text-[1.6rem] sm:text-3xl text-white/95 whitespace-nowrap">
              Juntos por una mejor educación
            </p>
            <svg viewBox="0 0 300 14" preserveAspectRatio="none" className="w-full h-3.5 -mt-0.5" aria-hidden="true">
              <path
                d="M4 10 C 80 2, 190 1, 296 6"
                fill="none"
                className="stroke-yellow-400"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* En celular la tarjeta va primero: entrar no puede exigir scrollear
          por debajo de toda la presentación. */}
      <div className="relative order-first lg:order-none flex-1 lg:basis-[42%] flex items-center justify-center overflow-hidden bg-slate-50 px-6 pt-10 pb-16 lg:py-14 lg:px-12">
        {/* Marcas de agua: el emblema institucional arriba y la cordillera
            abajo, casi transparentes para no competir con la tarjeta. */}
        <img
          src="/login-emblema.webp"
          alt=""
          aria-hidden="true"
          className="absolute -top-16 -right-28 w-[420px] opacity-[0.05] pointer-events-none select-none"
        />
        <CordilleraTenue />

        <div className="relative z-10 w-full flex justify-center animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">
          <LoginCardWidget />
        </div>

        <div className="absolute bottom-4 inset-x-0 z-10 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-semibold tracking-wider uppercase">
          <span>Desarrollado por</span>
          <img src="/logo-unsa.webp" alt="UNSA" className="h-5 object-contain opacity-70" />
        </div>
      </div>
    </div>
  );
};

/**
 * Tres capas de cordillera, de la más lejana a la más cercana: dos de picos
 * neblinosos a la izquierda y la ola sólida que sube hacia la derecha y
 * continúa en el bloque de abajo. Cada capa rellena hasta el piso del SVG, así
 * ninguna termina en una línea recta visible.
 */
const Cordillera = () => (
  <svg
    viewBox="0 0 1440 240"
    preserveAspectRatio="none"
    className="absolute bottom-0 inset-x-0 w-full h-32 sm:h-44 lg:h-60 pointer-events-none"
    aria-hidden="true"
  >
    <path
      className="fill-primary"
      fillOpacity={0.18}
      d="M0,120 C50,104 80,78 125,80 C170,82 190,112 245,108 C305,104 335,62 390,60 C450,58 480,112 550,118 C630,125 700,138 790,134 L1440,40 L1440,240 L0,240 Z"
    />
    <path
      className="fill-primary"
      fillOpacity={0.38}
      d="M0,168 C80,156 120,130 185,133 C250,136 290,160 370,154 C450,148 490,122 570,128 C650,134 730,152 830,144 L1440,70 L1440,240 L0,240 Z"
    />
    <path
      className="fill-primary"
      d="M0,214 C220,210 420,200 640,178 C860,156 1060,114 1260,74 C1340,58 1400,48 1440,42 L1440,240 L0,240 Z"
    />
  </svg>
);

const CordilleraTenue = () => (
  <svg
    viewBox="0 0 800 200"
    preserveAspectRatio="none"
    className="absolute bottom-0 inset-x-0 w-full h-40 pointer-events-none"
    aria-hidden="true"
  >
    <path
      className="fill-primary"
      fillOpacity={0.05}
      d="M0,120 C80,100 140,70 220,78 C300,86 340,120 420,112 C500,104 560,60 640,62 C720,64 770,96 800,104 L800,200 L0,200 Z"
    />
    <path
      className="fill-primary"
      fillOpacity={0.07}
      d="M0,170 C120,150 240,160 380,140 C520,120 640,132 800,110 L800,200 L0,200 Z"
    />
  </svg>
);

/** En celular sólo ícono y título: las descripciones alargaban una presentación que ahí ya queda debajo del login. */
const Funcion = ({ icon, titulo, detalle }: { icon: ReactNode; titulo: string; detalle: string }) => (
  <div className="flex flex-col items-center text-center px-1 sm:px-3 group cursor-default">
    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/15 flex items-center justify-center text-white mb-2 sm:mb-3 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-[26px] sm:[&>svg]:h-[26px] group-hover:bg-white/25 group-hover:text-yellow-400 transition-colors">
      {icon}
    </div>
    <span className="text-[13px] sm:text-base font-bold text-white">{titulo}</span>
    <span className="hidden sm:block text-xs text-white/80 leading-snug mt-1.5 max-w-[10rem]">{detalle}</span>
  </div>
);
