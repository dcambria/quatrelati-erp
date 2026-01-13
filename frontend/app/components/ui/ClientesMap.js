// =====================================================
// Mapa de Clientes - Leaflet
// v2.7.1 - Ícone Focus, invalidateSize ao expandir
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
async function geocodeAddress(cidade, estado) {
  if (!cidade && !estado) return null;

  const cacheKey = `${cidade || ''}_${estado || ''}`.toLowerCase().trim();
  const cache = getCache();

  if (cache[cacheKey]?.lat) {
    return cache[cacheKey];
  }

  const query = [cidade, estado, 'Brasil'].filter(Boolean).join(', ');

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

    for (const cliente of clientes) {
      if (geocodingRef.current !== currentRun) {
        return;
      }

      if (!cliente.cidade && !cliente.estado) continue;

      const cacheKey = `${cliente.cidade || ''}_${cliente.estado || ''}`.toLowerCase().trim();
      const cache = getCache();

      if (cache[cacheKey]?.lat) {
        const variation = (Math.random() - 0.5) * 0.05;
        results.push({
          ...cliente,
          coords: {
            lat: cache[cacheKey].lat + variation,
            lng: cache[cacheKey].lng + variation
          }
        });
        continue;
      }

      if (needsApiCall) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }

      const coords = await geocodeAddress(cliente.cidade, cliente.estado);
      needsApiCall = true;

      if (coords) {
        const variation = (Math.random() - 0.5) * 0.05;
        results.push({
          ...cliente,
          coords: {
            lat: coords.lat + variation,
            lng: coords.lng + variation
          }
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

  const createIcon = (numero) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #3B82F6, #1D4ED8);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${numero}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
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

          {geocodedClientes.map((cliente, index) => (
            <Marker
              key={cliente.id}
              position={[cliente.coords.lat, cliente.coords.lng]}
              icon={createIcon(index + 1)}
              ref={(ref) => { if (ref) markersRef.current[cliente.id] = ref; }}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <div
                    className="font-bold text-blue-600 hover:underline cursor-pointer mb-2"
                    onClick={() => onClienteClick && onClienteClick(cliente)}
                  >
                    {cliente.nome}
                  </div>

                  <div className="text-sm text-gray-600 mb-2 space-y-0.5">
                    {cliente.endereco && (
                      <p>
                        {cliente.endereco}
                        {cliente.numero && `, ${cliente.numero}`}
                        {cliente.complemento && ` - ${cliente.complemento}`}
                      </p>
                    )}
                    <p>
                      {cliente.cidade}{cliente.estado && ` - ${cliente.estado}`}
                    </p>
                    {cliente.cep && (
                      <p className="text-gray-400 text-xs">CEP: {cliente.cep}</p>
                    )}
                  </div>

                  {cliente.telefone && (
                    <a
                      href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 mb-2"
                    >
                      <Phone className="w-3 h-3" />
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
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                    >
                      <Navigation className="w-3 h-3" />
                      Abrir rota no Google Maps
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
