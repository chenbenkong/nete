import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import Globe from "react-globe.gl";

// --- Configuration ---
const GEOJSON_URL = "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";
const RADIO_API_BASE = "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact";

// --- Local Music Culture Database ---
const musicCultureDB: Record<string, string[]> = {
  "中国": [
    "中国音乐融合了传统民乐与现代流行元素，从古典古筝到电子舞曲应有尽有。",
    "广播电台常播放华语流行音乐、古典音乐以及地方戏曲，满足不同听众需求。"
  ],
  "美国": [
    "美国是全球流行音乐的发源地，从摇滚乐、嘻哈到乡村音乐，影响深远。",
    "广播电台种类繁多，包括Top 40流行音乐、新闻谈话和专门的音乐类型频道。"
  ],
  "英国": [
    "英国音乐产业历史悠久，从披头士乐队到当代流行歌手，一直引领全球潮流。",
    "BBC广播网络提供多样化内容，包括古典音乐、摇滚乐和独立音乐节目。"
  ],
  "日本": [
    "日本音乐文化独特，融合了传统艺能与现代J-POP、动漫音乐等多种元素。",
    "广播电台常播放J-POP、摇滚和电子音乐，同时保留传统音乐节目。"
  ],
  "韩国": [
    "韩国K-POP全球流行，以精致的编舞和制作著称，拥有大量国际粉丝。",
    "广播电台以播放K-POP为主，同时涵盖摇滚、嘻哈和民谣等多种音乐类型。"
  ],
  "法国": [
    "法国音乐以浪漫的香颂和电子音乐闻名，同时拥有活跃的独立音乐场景。",
    "广播电台播放法语流行音乐、古典音乐和国际热门歌曲。"
  ],
  "德国": [
    "德国是电子音乐的重要发源地，柏林和法兰克福是全球电子音乐中心。",
    "广播电台提供多样化内容，包括古典音乐、摇滚和电子舞曲节目。"
  ],
  "巴西": [
    "巴西音乐充满活力，桑巴、波萨诺瓦和福罗是其代表性音乐类型。",
    "广播电台常播放桑巴、拉丁流行音乐和当地特色音乐节目。"
  ],
  "印度": [
    "印度音乐丰富多样，宝莱坞电影音乐和传统古典音乐深受喜爱。",
    "广播电台播放宝莱坞热门歌曲、古典音乐和地方语言音乐。"
  ],
  "澳大利亚": [
    "澳大利亚音乐场景多元，从独立摇滚到电子音乐，拥有众多国际知名艺人。",
    "广播电台播放流行音乐、摇滚和本土独立音乐，同时涵盖新闻和谈话节目。"
  ],
  "加拿大": [
    "加拿大音乐产业发达，从流行音乐到独立摇滚，涌现出众多国际巨星。",
    "广播电台播放加拿大本土音乐和国际热门歌曲，支持本地音乐发展。"
  ],
  "俄罗斯": [
    "俄罗斯拥有丰富的古典音乐传统，同时现代流行音乐和摇滚也很受欢迎。",
    "广播电台播放古典音乐、俄语流行歌曲和国际音乐节目。"
  ],
  "意大利": [
    "意大利音乐以歌剧和古典音乐闻名，同时现代流行音乐和民谣也很流行。",
    "广播电台播放意大利流行音乐、古典音乐和歌剧节目。"
  ],
  "西班牙": [
    "西班牙音乐充满激情，弗拉门戈、拉丁流行和电子音乐是其特色。",
    "广播电台播放弗拉门戈、拉丁音乐和国际流行歌曲。"
  ],
  "墨西哥": [
    "墨西哥音乐融合了传统马里亚奇和现代拉丁流行元素，充满活力。",
    "广播电台播放马里亚奇音乐、拉丁流行歌曲和当地特色音乐节目。"
  ]
};

// 生成随机洞察的辅助函数
const getRandomInsight = (countryName: string): string => {
  const insights = musicCultureDB[countryName] || [
    `${countryName}拥有丰富多样的音乐文化，融合了传统与现代元素。`,
    `当地广播电台提供多样化的音乐节目，满足不同听众的需求。`
  ];
  return insights.join(" ");
};

// --- Types ---
interface Station {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  votes: number;
}

interface CountryGeo {
  properties: {
    ISO_A2: string;
    NAME: string;
    label_lat?: number;
    label_lon?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// --- Helpers ---
// Move this OUTSIDE the component to prevent recreation on every render (Major Performance Fix)
const regionNames = new Intl.DisplayNames(['zh-Hans'], { type: 'region' });

const getChineseName = (code: string, defaultName: string) => {
  try {
    return regionNames.of(code) || defaultName;
  } catch (e) {
    return defaultName;
  }
};

// --- App Component ---
const App = () => {
  // Globe State
  const globeEl = useRef<any>();
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD] = useState<object | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryGeo | null>(null);
  
  // Radio State
  const [stations, setStations] = useState<Station[]>([]);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.5);

  // AI State
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const handleError = (e: any) => {
      console.error("Audio playback error", e);
      setIsPlaying(false);
    };
    
    // Attempt to auto-resume if interrupted, but respect browser policy
    audioRef.current.addEventListener('error', handleError);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('error', handleError);
      }
    };
  }, []);

  // Sync Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load GeoJSON
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then(setCountries)
      .catch(console.error);
  }, []);

  // --- Auto-Rotate Management ---
  // 核心逻辑：有选中国家时停止旋转，没有选中时恢复旋转
  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      if (controls) {
        controls.autoRotate = !selectedCountry;
        controls.autoRotateSpeed = 0.5; // 设置一个缓慢的自转速度
      }
    }
  }, [selectedCountry]);

  // Fetch Radio Stations
  const fetchStations = async (countryCode: string) => {
    setLoadingStations(true);
    setStations([]);
    try {
      // Fetch top 30 stations by votes for the country
      const res = await fetch(`${RADIO_API_BASE}/${countryCode}?limit=30&order=votes&reverse=true`);
      const data = await res.json();
      setStations(data);
    } catch (error) {
      console.error("Failed to fetch stations:", error);
    } finally {
      setLoadingStations(false);
    }
  };

  // Fetch AI Insights (Local Implementation)
  const fetchAiInsight = async (countryName: string) => {
    setLoadingAi(true);
    setAiSummary("");
    
    try {
      // 模拟异步请求，保持用户体验一致
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 使用本地数据库获取洞察
      const insight = getRandomInsight(countryName);
      setAiSummary(insight);
    } catch (error) {
      console.error("AI Error:", error);
      setAiSummary("无法加载洞察内容。");
    } finally {
      setLoadingAi(false);
    }
  };

  // Handle Country Click
  const handleCountryClick = useCallback((polygon: any) => {
    const properties = polygon.properties;
    
    setSelectedCountry(polygon);
    const isoCode = properties.ISO_A2;
    const engName = properties.NAME;
    const cnName = getChineseName(isoCode, engName);

    // Zoom to country and STOP rotation
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      if(controls) {
        controls.autoRotate = false; // 立即停止旋转
      }

      globeEl.current.pointOfView({ 
        lat: properties.label_lat || 0, 
        lng: properties.label_lon || 0, 
        altitude: 0.5 // 拉近镜头，更聚焦
      }, 1000);
    }

    fetchStations(isoCode);
    fetchAiInsight(cnName);
    
    // Stop current radio when switching
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentStation(null);
  }, []); 

  // Handle Play Station
  const playStation = (station: Station) => {
    if (!audioRef.current) return;
    
    if (currentStation?.stationuuid === station.stationuuid && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setCurrentStation(station);
    setIsPlaying(true);
    audioRef.current.src = station.url_resolved;
    audioRef.current.play().catch(e => {
      console.error("Play failed", e);
      setIsPlaying(false);
      alert("当前无法播放此电台，可能是离线状态。");
    });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentStation) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 点击外部关闭面板
  const handleOutsideClick = (e: React.MouseEvent) => {
    // 只有当点击Globe区域且面板打开时才关闭
    if (selectedCountry && e.target === e.currentTarget) {
      setSelectedCountry(null);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans" onClick={handleOutsideClick}>
      
      {/* 3D Globe */}
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={countries.features}
        polygonsTransitionDuration={300} 
        polygonAltitude={(d: any) => {
           if (d === selectedCountry) return 0.2; // Significantly higher
           if (d === hoverD) return 0.08;
           return 0.01;
        }}
        polygonCapColor={(d: any) => {
          if (d === selectedCountry) return 'rgba(250, 204, 21, 0.75)'; // Bright Gold for selected
          if (d === hoverD) return 'rgba(255, 255, 255, 0.3)';
          return 'rgba(255, 255, 255, 0.0)';
        }}
        polygonSideColor={(d: any) => {
           if (d === selectedCountry) return 'rgba(234, 179, 8, 0.9)'; // Darker Gold side
           return 'rgba(255, 255, 255, 0.15)';
        }}
        polygonStrokeColor={(d: any) => {
           if (d === selectedCountry) return '#ffffff'; // White border for selected
           return '#111';
        }}
        polygonLabel={({ properties: d }: any) => `
          <div class="bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 shadow-lg text-sm font-sans">
            ${getChineseName(d.ISO_A2, d.NAME)}
          </div>
        `}
        onPolygonHover={setHoverD}
        onPolygonClick={handleCountryClick}
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.25}
        // 触控优化配置
        enablePointerInteraction={true}
        // 确保组件正确处理触摸事件
        width="100%"
        height="100%"
      />

      {/* Header / Brand */}
      <div className="absolute top-6 left-6 pointer-events-none z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          <i className="fas fa-globe-americas mr-3 text-blue-400"></i>
          全球电台<span className="text-yellow-400">3D</span>
        </h1>
        <p className="text-blue-200 text-xs sm:text-sm mt-1 opacity-80">点击国家收听当地实时广播</p>
      </div>

      {/* Right Panel: Station List & AI Info */}
      <div className={`absolute top-6 right-6 bottom-6 w-full md:w-80 lg:w-96 max-w-[90vw] md:max-w-none bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col transition-transform duration-500 shadow-2xl z-20 ${selectedCountry ? 'translate-x-0' : 'translate-x-[120%]'}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Country Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-1 drop-shadow-md">
              {selectedCountry ? getChineseName(selectedCountry.properties.ISO_A2, selectedCountry.properties.NAME) : ''}
            </h2>
            <div className="flex items-center text-xs text-gray-400 gap-2">
              <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded uppercase tracking-wider border border-yellow-500/30">
                {selectedCountry?.properties?.ISO_A2}
              </span>
              <span>实时广播</span>
            </div>
          </div>
          <button 
             onClick={() => setSelectedCountry(null)}
             className="text-gray-400 hover:text-white active:text-red-400 transition-all active:scale-95"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* AI Insight Section */}
        <div className="px-6 py-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-b border-white/5 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-2xl rounded-full -mr-10 -mt-10"></div>
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <i className="fas fa-robot text-purple-400"></i>
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest">文化洞察</span>
          </div>
          {loadingAi ? (
             <div className="animate-pulse space-y-2 relative z-10">
               <div className="h-2 bg-white/10 rounded w-3/4"></div>
               <div className="h-2 bg-white/10 rounded w-full"></div>
             </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed italic relative z-10">
              "{aiSummary}"
            </p>
          )}
        </div>

        {/* Station List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingStations ? (
            <div className="flex flex-col items-center justify-center py-20 text-blue-400/50">
              <i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i>
              <span className="text-sm">搜索信号中...</span>
            </div>
          ) : stations.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <i className="fas fa-satellite-dish mb-3 text-3xl block opacity-30"></i>
              未找到该地区的电台信号。
            </div>
          ) : (
            stations.map((station) => (
              <button
                key={station.stationuuid}
                onClick={() => playStation(station)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group border active:scale-[0.98] ${currentStation?.stationuuid === station.stationuuid ? "bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 active:bg-white/15"}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                   currentStation?.stationuuid === station.stationuuid ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400 group-hover:bg-white/20'
                }`}>
                  {currentStation?.stationuuid === station.stationuuid && isPlaying ? (
                     <div className="flex gap-0.5 h-3 items-end">
                       <div className="w-1 bg-white animate-[bounce_1s_infinite] h-full"></div>
                       <div className="w-1 bg-white animate-[bounce_1.2s_infinite] h-2/3"></div>
                       <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-3/4"></div>
                     </div>
                  ) : (
                    <i className="fas fa-play text-sm ml-0.5"></i>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`font-medium truncate text-sm transition-colors ${currentStation?.stationuuid === station.stationuuid ? 'text-blue-200' : 'text-gray-200'}`}>
                    {station.name.trim() || "未知电台"}
                  </div>
                  <div className="text-xs text-gray-500 truncate flex gap-2 mt-0.5">
                    <span className="bg-black/30 px-1.5 rounded">{station.tags ? station.tags.split(',')[0] : 'Radio'}</span>
                    {station.votes > 0 && <span><i className="fas fa-heart text-xs text-red-500/50 mr-1"></i>{station.votes}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Player Controls (Bottom of panel) */}
        {currentStation && (
          <div className="p-4 bg-gradient-to-t from-black via-gray-900 to-gray-900/90 border-t border-white/10 relative z-30">
            <div className="flex items-center gap-4">
               <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white text-black hover:bg-yellow-400 active:bg-yellow-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-lg`}></i>
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">{currentStation.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <div className="text-xs text-gray-400">
                    {isPlaying ? "正在直播" : "已暂停"}
                  </div>
                </div>
              </div>
            </div>
            {/* Volume */}
            <div className="mt-4 flex items-center gap-3 text-gray-400 group">
               <i className={`fas ${volume === 0 ? 'fa-volume-mute' : 'fa-volume-up'} text-xs w-4 transition-colors group-hover:text-white`}></i>
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.05"
                 value={volume}
                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                 className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
               />
            </div>
          </div>
        )}
      </div>

      {/* Intro Overlay (When nothing selected) */}
      {!selectedCountry && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-80 animate-bounce">
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-white text-sm tracking-widest mb-2 shadow-lg">
             点击任意国家开始
          </div>
          <i className="fas fa-chevron-down text-white/50"></i>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);