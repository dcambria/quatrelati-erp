// =====================================================
// Componente de Ícone do Produto
// v1.0.0 - Exibe ícone baseado no tipo de produto
// =====================================================

import { Package, Star, Award, Cookie } from 'lucide-react';

export default function IconeProduto({ nome }) {
  const nomeLower = nome?.toLowerCase() || '';

  // Verifica o tipo de embalagem
  const isPote = nomeLower.includes('pote');

  // Verifica a qualidade
  const isExtra = nomeLower.includes('extra');
  const isPrimeira = nomeLower.includes('primeira');

  // Define cor baseada na qualidade
  let corClasse = 'text-gray-500'; // Comum
  if (isExtra) corClasse = 'text-amber-500';
  if (isPrimeira) corClasse = 'text-blue-500';

  // Retorna ícone baseado no tipo
  if (isPote) {
    return <Cookie className={`w-4 h-4 ${corClasse}`} />;
  }

  // Bloco com indicador de qualidade
  if (isExtra) {
    return (
      <div className="relative">
        <Package className={`w-4 h-4 ${corClasse}`} />
        <Award className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1" />
      </div>
    );
  }

  if (isPrimeira) {
    return (
      <div className="relative">
        <Package className={`w-4 h-4 ${corClasse}`} />
        <Star className="w-2.5 h-2.5 text-blue-500 absolute -top-1 -right-1" />
      </div>
    );
  }

  // Comum (padrão)
  return <Package className={`w-4 h-4 ${corClasse}`} />;
}
