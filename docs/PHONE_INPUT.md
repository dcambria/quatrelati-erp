# PhoneInput Component

## Overview

Componente de entrada de telefone com suporte a DDI internacional, detecção automática de país e formatação inteligente.

**Versão:** 2.0.0
**Arquivo:** `frontend/app/components/ui/PhoneInput.js`

## Funcionalidades

### Colagem Inteligente

O componente detecta automaticamente o país quando um número completo é colado:

```
+351 910 348 702  → Portugal (PT) detectado
+55 11 99999-9999 → Brasil (BR) detectado
00351910348702    → Portugal (PT) detectado
5511999999999     → Brasil (BR) detectado
```

### Formatação por País

Cada país tem seu formato de número específico:

| País | Formato |
|------|---------|
| Brasil (BR) | (XX) XXXXX-XXXX |
| Portugal (PT) | XXX XXX XXX |
| EUA (US) | (XXX) XXX-XXXX |
| Outros | XXX XXX XXXX |

### Países Suportados

O componente inclui mais de 60 países com suas bandeiras e códigos DDI:
- América do Sul (Brasil, Argentina, Chile, etc.)
- América do Norte (EUA, Canadá, México)
- Europa (Portugal, Espanha, França, etc.)
- Ásia (Japão, China, Índia, etc.)
- Oceania (Austrália, Nova Zelândia)
- África (África do Sul, Nigéria, Egito, etc.)

## Uso

### Básico

```jsx
import PhoneInput from '../components/ui/PhoneInput';

<PhoneInput
  label="Telefone"
  value={telefone}
  onChange={(e) => setTelefone(e.target.value)}
/>
```

### Com React Hook Form

```jsx
import { Controller } from 'react-hook-form';
import PhoneInput from '../components/ui/PhoneInput';

<Controller
  name="telefone"
  control={control}
  render={({ field }) => (
    <PhoneInput
      label="Telefone / WhatsApp"
      error={errors.telefone?.message}
      {...field}
    />
  )}
/>
```

### Variante Dark (Glassmorphism)

```jsx
<PhoneInput
  label="Telefone"
  variant="dark"
  value={telefone}
  onChange={handleChange}
/>
```

## Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| label | string | - | Label do campo |
| value | string | '' | Valor do campo (formato: +55 (11) 99999-9999) |
| onChange | function | - | Callback chamado com evento sintético |
| onBlur | function | - | Callback de blur |
| name | string | - | Nome do campo |
| placeholder | string | dinâmico | Placeholder (muda conforme país) |
| disabled | boolean | false | Desabilita o campo |
| variant | 'default' \| 'dark' | 'default' | Estilo visual |
| error | string | - | Mensagem de erro |
| className | string | '' | Classes CSS adicionais |

## Formato do Valor

O valor retornado pelo `onChange` sempre inclui o DDI e o número formatado:

```
+55 (11) 99999-9999  // Brasil
+351 912 345 678     // Portugal
+1 555 123 4567      // EUA
```

## Detecção de País

A detecção funciona nos seguintes formatos de entrada:

1. **Com +**: `+351910348702`
2. **Com 00**: `00351910348702`
3. **Apenas números** (se maior que 8 dígitos): `351910348702`
4. **Com espaços**: `+351 910 348 702`
5. **Formatado**: `+351 912-345-678`

## Pesquisa de País

O dropdown de países permite buscar por:
- Nome do país (em português)
- Código DDI
- Código ISO do país

## Eventos

### onPaste

Intercepta colagem para processar números completos:

```jsx
// Usuário cola: "+351 910 348 702"
// Resultado: País = Portugal, Número = "912 345 678"
```

### onChange

Formata a entrada em tempo real conforme o país selecionado:

```jsx
// Digitando: "11999999999" (Brasil selecionado)
// Resultado: "(11) 99999-9999"
```

## Exemplos de Uso

### Página de Perfil

```jsx
// Em frontend/app/(dashboard)/perfil/page.js
<Controller
  name="telefone"
  control={control}
  render={({ field }) => (
    <PhoneInput
      label="Telefone / WhatsApp"
      error={errors.telefone?.message}
      {...field}
    />
  )}
/>
```

### Formulário de Usuários

```jsx
// Em frontend/app/(dashboard)/usuarios/page.js
<Controller
  name="telefone"
  control={control}
  render={({ field }) => (
    <PhoneInput
      label="Telefone / WhatsApp"
      error={errors.telefone?.message}
      {...field}
    />
  )}
/>
```

### Tela de Login (Dark Mode)

```jsx
<PhoneInput
  label="Telefone"
  variant="dark"
  value={phone}
  onChange={handlePhoneChange}
/>
```

## Notas de Desenvolvimento

### Adicionando Novos Países

Para adicionar um novo país, adicione ao array `COUNTRIES`:

```javascript
{ code: 'XX', ddi: '+XXX', name: 'Nome do País', flag: '🏳️' }
```

A lista é ordenada automaticamente por tamanho do DDI para garantir detecção correta.

### Formatação Personalizada

Para adicionar formatação específica de um país:

```javascript
// Em formatPhoneByCountry()
case 'XX':
  return formatCustomPhone(numbers);
```

## Changelog

### v2.0.0
- Adicionada detecção automática de país ao colar números
- Suporte a formatos internacionais variados
- Mais de 60 países suportados
- Placeholder dinâmico por país
- Dica de uso abaixo do campo

### v1.2.1
- Visual aprimorado
- Variante dark para glassmorphism

### v1.0.0
- Versão inicial com seletor de DDI
- Formatação brasileira
