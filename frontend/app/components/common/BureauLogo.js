'use client';

/**
 * ===========================================
 * Quatrelati - Bureau Logo Footer
 * Logo no final do conteúdo com texto
 * Cores suaves por padrão, brilham no hover
 * ===========================================
 */

export default function BureauLogo({ className = '' }) {
  return (
    <a
      href="https://bureau-it.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center justify-center gap-2 py-4 transition-all duration-300 ${className}`}
      title="Bureau de Tecnologia"
    >
      <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-300" style={{ transform: 'translateY(-8px)' }}>
        Desenvolvido por
      </span>
      <svg
        className="h-10 w-auto"
        style={{ transform: 'translateY(-8px)' }}
        viewBox="0 0 123.81 123.81"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background transparente */}
        <rect fill="none" width="123.81" height="123.81"/>

        {/* Seta - suave, fica mais forte no hover */}
        <polygon
          className="fill-gray-300 dark:fill-gray-600 group-hover:fill-gray-600 dark:group-hover:fill-gray-300 transition-colors duration-300"
          points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68"
        />

        {/* Letra t - suave, brilha no hover */}
        <path
          className="fill-amber-300/60 dark:fill-amber-600/50 group-hover:fill-quatrelati-gold-500 dark:group-hover:fill-quatrelati-gold-400 transition-colors duration-300"
          d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z"
        />

        {/* Ponto do i - suave, brilha no hover */}
        <rect
          className="fill-amber-300/60 dark:fill-amber-600/50 group-hover:fill-quatrelati-gold-500 dark:group-hover:fill-quatrelati-gold-400 transition-colors duration-300"
          x="41.13" y="36.23" width="11.16" height="6.86"
        />

        {/* Corpo do i - suave, brilha no hover */}
        <polygon
          className="fill-amber-300/60 dark:fill-amber-600/50 group-hover:fill-quatrelati-gold-500 dark:group-hover:fill-quatrelati-gold-400 transition-colors duration-300"
          points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45"
        />

        {/* Underline _ - suave, brilha no hover */}
        <path
          className="fill-amber-300/60 dark:fill-amber-600/50 group-hover:fill-quatrelati-gold-500 dark:group-hover:fill-quatrelati-gold-400 transition-colors duration-300"
          d="M78.18,73.48h29v5.58h-29Z"
        />
      </svg>
    </a>
  );
}

/**
 * Componente para uso em relatórios/PDFs
 * Mostra "Desenvolvido por [logo]"
 */
export function BureauReportFooter({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">Desenvolvido por</span>
      <svg
        className="h-5 w-auto"
        viewBox="0 0 123.81 123.81"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="none" width="123.81" height="123.81"/>
        <polygon
          fill="#374151"
          points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68"
        />
        <path
          fill="#D4A017"
          d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z"
        />
        <rect fill="#D4A017" x="41.13" y="36.23" width="11.16" height="6.86"/>
        <polygon fill="#D4A017" points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45"/>
        <path fill="#D4A017" d="M78.18,73.48h29v5.58h-29Z"/>
      </svg>
    </div>
  );
}
