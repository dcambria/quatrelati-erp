// =====================================================
// Mapa de Clientes - Leaflet
// v2.9.0 - Geocoding com endereço completo, precisão melhorada
// =====================================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Users, Loader2, Navigation, Phone, RefreshCw, Maximize2, Minimize2, Focus } from 'lucide-react';

// Cache de coordenadas no localStorage
const CACHE_KEY = 'quatrelati_geocode_cache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getCache() {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      Object.keys(data).forEach(key => {
        if (data[key].timestamp && now - data[key].timestamp > CACHE_EXPIRY) {
          delete data[key];
        }
      });
      return data;
    }
  } catch {
    // Ignore
  }
  return {};
}

function setCache(cache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore
  }
}

// Geocoding via Nominatim (OpenStreetMap)
async function geocodeAddress(endereco, numero, cidade, estado, cep) {
  if (!cidade && !estado && !endereco) return null;

  // Criar chave de cache mais específica
  const cacheKey = `${endereco || ''}_${numero || ''}_${cidade || ''}_${estado || ''}_${cep || ''}`.toLowerCase().trim().replace(/\s+/g, '_');
  const cache = getCache();

  if (cache[cacheKey]?.lat) {
    return cache[cacheKey];
  }

  // Tentar primeiro com endereço completo
  let query = '';
  if (endereco && cidade) {
    query = [endereco, numero, cidade, estado, cep, 'Brasil'].filter(Boolean).join(', ');
  } else if (cep) {
    query = `${cep}, Brasil`;
  } else {
    query = [cidade, estado, 'Brasil'].filter(Boolean).join(', ');
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'Quatrelati-ERP/1.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        nome: data[0].display_name.split(',')[0],
        timestamp: Date.now()
      };

      cache[cacheKey] = result;
      setCache(cache);

      return result;
    }

    // Se não encontrou com endereço completo, tentar só com cidade/estado
    if (endereco && cidade) {
      const fallbackQuery = [cidade, estado, 'Brasil'].filter(Boolean).join(', ');
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'Quatrelati-ERP/1.0'
          }
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const result = {
            lat: parseFloat(fallbackData[0].lat),
            lng: parseFloat(fallbackData[0].lon),
            nome: fallbackData[0].display_name.split(',')[0],
            timestamp: Date.now(),
            approximate: true // Marcar como aproximado
          };

          cache[cacheKey] = result;
          setCache(cache);

          return result;
        }
      }
    }
  } catch (error) {
    console.error('Erro no geocoding:', error);
  }

  return null;
}

// =====================================================
// Componente de controle do mapa - FORA do componente principal
// =====================================================
function MapController({ clientes, recenterTrigger, focusClienteId, markersRef, L, useMap, expanded }) {
  const map = useMap();
  const initialFitDone = useRef(false);
  const lastRecenterTrigger = useRef(0);
  const lastFocusId = useRef(null);

  // Fit inicial - apenas UMA vez
  useEffect(() => {
    if (!initialFitDone.current && clientes.length > 0 && L) {
      const bounds = L.latLngBounds(
        clientes.map(c => [c.coords.lat, c.coords.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      initialFitDone.current = true;
    }
  }, [clientes, map, L]);

  // Recentralizar - apenas quando botão é clicado
  useEffect(() => {
    if (recenterTrigger > lastRecenterTrigger.current && clientes.length > 0 && L) {
      const bounds = L.latLngBounds(
        clientes.map(c => [c.coords.lat, c.coords.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      lastRecenterTrigger.current = recenterTrigger;
    }
  }, [recenterTrigger, clientes, map, L]);

  // Focar em cliente específico (centraliza mantendo zoom atual)
  useEffect(() => {
    if (focusClienteId && focusClienteId !== lastFocusId.current) {
      lastFocusId.current = focusClienteId;
      const cliente = clientes.find(c => c.id === focusClienteId);
      if (cliente && markersRef.current[focusClienteId]) {
        map.panTo([cliente.coords.lat, cliente.coords.lng], { animate: true });
        setTimeout(() => {
          markersRef.current[focusClienteId]?.openPopup();
        }, 300);
      }
    }
  }, [focusClienteId, clientes, map, markersRef]);

  // Invalidar tamanho do mapa ao expandir/reduzir
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 350); // Aguarda a transição CSS (300ms) + margem
  }, [expanded, map]);

  return null;
}

// =====================================================
// Componente principal
// =====================================================
export default function ClientesMap({ clientes, onClienteClick, compact = false, focusClienteId = null }) {
  const [MapContainer, setMapContainer] = useState(null);
  const [TileLayer, setTileLayer] = useState(null);
  const [Marker, setMarker] = useState(null);
  const [Popup, setPopup] = useState(null);
  const [useMapHook, setUseMapHook] = useState(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodedClientes, setGeocodedClientes] = useState([]);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const markersRef = useRef({});
  const geocodingRef = useRef(0);

  // Carregar Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        const leaflet = await import('leaflet');
        const reactLeaflet = await import('react-leaflet');

        delete leaflet.default.Icon.Default.prototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setL(leaflet.default);
        setMapContainer(() => reactLeaflet.MapContainer);
        setTileLayer(() => reactLeaflet.TileLayer);
        setMarker(() => reactLeaflet.Marker);
        setPopup(() => reactLeaflet.Popup);
        setUseMapHook(() => reactLeaflet.useMap);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar Leaflet:', error);
        setLoading(false);
      }
    };

    loadLeaflet();
  }, []);

  // Geocodificar clientes
  const geocodeClientes = useCallback(async () => {
    if (!clientes || clientes.length === 0) {
      setGeocodedClientes([]);
      return;
    }

    const currentRun = ++geocodingRef.current;
    setGeocoding(true);

    const results = [];
    let needsApiCall = false;
    const positionsUsed = new Map(); // Para evitar sobreposição exata

    for (const cliente of clientes) {
      if (geocodingRef.current !== currentRun) {
        return;
      }

      // Precisa ter pelo menos cidade/estado ou endereço
      if (!cliente.cidade && !cliente.estado && !cliente.endereco) continue;

      // Criar chave de cache específica para este cliente
      const cacheKey = `${cliente.endereco || ''}_${cliente.numero || ''}_${cliente.cidade || ''}_${cliente.estado || ''}_${cliente.cep || ''}`.toLowerCase().trim().replace(/\s+/g, '_');
      const cache = getCache();

      let coords = null;

      if (cache[cacheKey]?.lat) {
        coords = cache[cacheKey];
      } else {
        if (needsApiCall) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }

        coords = await geocodeAddress(cliente.endereco, cliente.numero, cliente.cidade, cliente.estado, cliente.cep);
        needsApiCall = true;
      }

      if (coords) {
        // Pequena variação apenas se houver sobreposição exata (mesma coordenada)
        const posKey = `${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`;
        let offsetIndex = positionsUsed.get(posKey) || 0;
        positionsUsed.set(posKey, offsetIndex + 1);

        // Variação mínima de ~50m apenas para evitar sobreposição exata
        const angle = (offsetIndex * 45) * (Math.PI / 180);
        const offset = offsetIndex * 0.0005; // ~50m por cliente sobreposto

        results.push({
          ...cliente,
          coords: {
            lat: coords.lat + (offset * Math.cos(angle)),
            lng: coords.lng + (offset * Math.sin(angle))
          },
          approximate: coords.approximate || false
        });
      }
    }

    if (geocodingRef.current !== currentRun) {
      return;
    }

    setGeocodedClientes(results);
    setGeocoding(false);
  }, [clientes]);

  useEffect(() => {
    geocodeClientes();
  }, [geocodeClientes]);

  const clientesComLocalizacao = geocodedClientes.length;
  const clientesSemLocalizacao = clientes.length - clientesComLocalizacao;

  if (loading) {
    return (
      <div className={`${compact ? 'h-[300px]' : 'h-[400px]'} rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-quatrelati-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  if (!MapContainer || !TileLayer || !Marker || !Popup || !L || !useMapHook) {
    return (
      <div className={`${compact ? 'h-[300px]' : 'h-[400px]'} rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
        <p className="text-gray-500">Erro ao carregar mapa</p>
      </div>
    );
  }

  const centerBrasil = [-14.235, -51.9253];

  // Gera iniciais do nome (até 2 letras)
  const getInitials = (nome) => {
    if (!nome) return '?';
    const words = nome.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const createIcon = (cliente) => {
    const initials = getInitials(cliente.nome);
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #D4A017, #B8860B);
          color: white;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          white-space: nowrap;
        ">
          ${initials}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  return (
    <div className="space-y-2">
      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs flex-wrap p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {/* Badges de estatísticas */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-quatrelati-blue-100 dark:bg-quatrelati-blue-900/30 text-quatrelati-blue-700 dark:text-quatrelati-blue-300 rounded-md font-medium">
          <MapPin className="w-3.5 h-3.5" />
          <span>{clientesComLocalizacao} no mapa</span>
        </div>
        {clientesSemLocalizacao > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md">
            <Users className="w-3.5 h-3.5" />
            <span>{clientesSemLocalizacao} sem localização</span>
          </div>
        )}
        {geocoding && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Geocodificando...</span>
          </div>
        )}

        {/* Botões de ação */}
        {clientesComLocalizacao > 0 && !geocoding && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setRecenterTrigger(prev => prev + 1)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-700 text-quatrelati-blue-600 dark:text-quatrelati-blue-400 hover:bg-quatrelati-blue-50 dark:hover:bg-gray-600 rounded-md transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
              title="Recentralizar mapa"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Recentralizar</span>
            </button>
            <button
              onClick={() => setExpanded(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors shadow-sm border ${
                expanded
                  ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-500'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
              }`}
              title={expanded ? "Reduzir mapa" : "Ampliar mapa"}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{expanded ? 'Reduzir' : 'Ampliar'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className={`${expanded ? (compact ? 'h-[600px]' : 'h-[800px]') : (compact ? 'h-[300px]' : 'h-[400px]')} rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300`}>
        <MapContainer
          center={centerBrasil}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            clientes={geocodedClientes}
            recenterTrigger={recenterTrigger}
            focusClienteId={focusClienteId}
            markersRef={markersRef}
            L={L}
            useMap={useMapHook}
            expanded={expanded}
          />

          {geocodedClientes.map((cliente) => (
            <Marker
              key={cliente.id}
              position={[cliente.coords.lat, cliente.coords.lng]}
              icon={createIcon(cliente)}
              ref={(ref) => { if (ref) markersRef.current[cliente.id] = ref; }}
            >
              <Popup>
                <div className="min-w-[240px] p-1">
                  {/* Header com nome */}
                  <div
                    className="font-bold text-base text-gray-900 hover:text-quatrelati-blue-600 cursor-pointer pb-2 border-b border-gray-200 mb-2"
                    onClick={() => onClienteClick && onClienteClick(cliente)}
                  >
                    {cliente.nome}
                  </div>

                  {/* Endereço */}
                  <div className="text-sm text-gray-700 mb-3 space-y-1">
                    {cliente.endereco && (
                      <p className="font-medium">
                        {cliente.endereco}
                        {cliente.numero && `, ${cliente.numero}`}
                      </p>
                    )}
                    {cliente.complemento && (
                      <p className="text-gray-500 text-xs">{cliente.complemento}</p>
                    )}
                    <p className="text-gray-600">
                      {cliente.cidade}{cliente.estado && ` - ${cliente.estado}`}
                    </p>
                    {cliente.cep && (
                      <p className="text-gray-400 text-xs">CEP: {cliente.cep}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    {cliente.telefone && (
                      <a
                        href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-quatrelati-blue-600 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {cliente.telefone}
                      </a>
                    )}

                    {(cliente.endereco || cliente.cidade) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          [cliente.endereco, cliente.numero, cliente.cidade, cliente.estado, 'Brasil'].filter(Boolean).join(', ')
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                      >
                        <Navigation className="w-4 h-4" />
                        Abrir rota no Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
