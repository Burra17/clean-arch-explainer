import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Layers,
  Database,
  Box,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Cpu,
  HardDrive,
  FileCode,
  Send,
  RotateCcw,
  Zap,
  Package,
  Server,
} from "lucide-react";

const LAYERS = [
  { id: "user", label: "Användare", color: "#64748b", icon: Globe },
  {
    id: "presentation",
    label: "Presentation (API)",
    color: "#3b82f6",
    icon: Send,
  },
  { id: "application", label: "Applikation", color: "#8b5cf6", icon: Cpu },
  { id: "domain", label: "Domän", color: "#f59e0b", icon: Package },
  {
    id: "infrastructure",
    label: "Infrastruktur",
    color: "#10b981",
    icon: HardDrive,
  },
  { id: "database", label: "Databas", color: "#ef4444", icon: Database },
];

const STEPS = [
  {
    index: 0,
    activeLayer: "user",
    direction: "down",
    title: "Steg 1: HTTP-förfrågan",
    code: "GET /api/products/1",
    description:
      'Allt börjar här. En användare (t.ex. en frontend-app, Postman eller en webbläsare) skickar en HTTP GET-förfrågan till vår API-endpoint. Förfrågan säger i princip: "Hej server, ge mig produkten med ID 1". ASP.NET:s routing-system tar emot anropet och kollar vilken controller och metod som matchar URL:en /api/products/1.',
    highlight: ["user", "presentation"],
    arrow: { from: "user", to: "presentation" },
  },
  {
    index: 1,
    activeLayer: "presentation",
    direction: "down",
    title: "Steg 2: Controller → MediatR",
    code: `[HttpGet("{id}")]
public async Task<IActionResult> Get(int id)
{
    var query = new GetProductByIdQuery(id);
    var result = await _mediator.Send(query);
    return Ok(result);
}`,
    description:
      "Routingen träffade rätt — vi landar i ProductsController. Men controllern gör medvetet så lite som möjligt. Den skapar bara ett query-objekt (GetProductByIdQuery) som beskriver vad vi vill ha, och skickar iväg det via MediatR med _mediator.Send(). Det här är CQRS i praktiken: controllern vet inte HUR datan hämtas, den bara ber om den. All logik lever någon annanstans.",
    highlight: ["presentation"],
    arrow: { from: "presentation", to: "application" },
  },
  {
    index: 2,
    activeLayer: "application",
    direction: "down",
    title: "Steg 3: QueryHandler aktiveras",
    code: `public class GetProductByIdQueryHandler
  : IRequestHandler<GetProductByIdQuery, ProductDTO>
{
    private readonly IProductRepository _repository;
    // Handler aktiveras av MediatR
}`,
    description:
      'MediatR fungerar som en brevbärare — den tar emot vårt query-objekt och letar upp rätt handler att leverera det till. I det här fallet hittar den GetProductByIdQueryHandler. Handleren har injicerat ett beroende till IProductRepository via konstruktorn. Det är ett interface (kontrakt) som säger "jag kan hämta produkter" — men handleren bryr sig inte om vilken konkret klass som gör jobbet. Det löser Dependency Injection åt oss vid körtid.',
    highlight: ["application"],
    arrow: null,
  },
  {
    index: 3,
    activeLayer: "application",
    direction: "down",
    title: "Steg 4: Anropa via Repository-interface",
    code: `public async Task<ProductDTO> Handle(
    GetProductByIdQuery request,
    CancellationToken ct)
{
    var product = await _repository
        .GetById(request.Id);
}`,
    description:
      "Nu kör handleren sin logik. Den anropar _repository.GetById(1) via IProductRepository-interfacet. Här ser vi Dependency Inversion i praktiken: applikationslagret definierar interfacet (kontraktet), men den faktiska implementationen lever i infrastrukturlagret. Handleren jobbar alltså mot en abstraktion — den har ingen aning om att det är Entity Framework eller en SQL-databas bakom kulisserna.",
    highlight: ["application", "infrastructure"],
    arrow: { from: "application", to: "infrastructure" },
  },
  {
    index: 4,
    activeLayer: "infrastructure",
    direction: "down",
    title: "Steg 5: Repository → Databas",
    code: `public class ProductRepository : IProductRepository
{
    public async Task<Product> GetById(int id)
    {
        return await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id);
    }
}`,
    description:
      'Här är vi i infrastrukturlagret — den "smutsiga" delen som pratar med omvärlden. ProductRepository implementerar IProductRepository-interfacet och använder Entity Framework Core (via _context) för att bygga en databasfråga. EF Core översätter vårt LINQ-uttryck till riktig SQL och skickar iväg det till databasen. Det fina är att om vi någon dag vill byta från SQL Server till t.ex. PostgreSQL behöver vi bara ändra här — resten av appen märker inget.',
    highlight: ["infrastructure"],
    arrow: { from: "infrastructure", to: "database" },
  },
  {
    index: 5,
    activeLayer: "database",
    direction: "up",
    title: "Steg 6: Databas returnerar rådata",
    code: `-- SQL genererad av EF Core:
SELECT TOP(1) [p].[Id], [p].[Name],
       [p].[Price], [p].[Description]
FROM [Products] AS [p]
WHERE [p].[Id] = @id`,
    description:
      "Databasen tar emot SQL-frågan, letar igenom Products-tabellen och hittar raden med ID 1. Den returnerar rådatan (rader och kolumner) tillbaka till Entity Framework Core i infrastrukturlagret. Om produkten inte hade funnits hade vi fått tillbaka null. Men nu hittades den — så datan börjar sin resa uppåt genom lagren igen.",
    highlight: ["database", "infrastructure"],
    arrow: { from: "database", to: "infrastructure" },
  },
  {
    index: 6,
    activeLayer: "infrastructure",
    direction: "up",
    title: "Steg 7: Rådata → Product-entitet",
    code: `// EF Core mappar automatiskt till:
public class Product  // Domänlagret
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
}`,
    description:
      "Entity Framework Core gör sin magi: den tar rådatan från databasen (som bara är rader och kolumner) och mappar den automatiskt till ett riktigt C#-objekt — vår Product-entitet som definieras i domänlagret. Det här kallas Object-Relational Mapping (ORM). Nu har vi ett starkt typat objekt istället för lösa datavärden, och det skickas tillbaka uppåt till applikationslagret via repository-interfacet.",
    highlight: ["infrastructure", "domain", "application"],
    arrow: { from: "infrastructure", to: "application" },
  },
  {
    index: 7,
    activeLayer: "application",
    direction: "up",
    title: "Steg 8: Entitet → DTO",
    code: `// I HandleAsync:
var dto = new ProductDTO
{
    Id = product.Id,
    Name = product.Name,
    Price = product.Price
};
return dto; // MediatR returnerar`,
    description:
      "Handleren har nu fått tillbaka Product-entiteten. Men vi vill inte skicka hela domänobjektet rakt ut till klienten — det kan innehålla saker som inte ska exponeras (t.ex. interna fält, navigations-properties). Istället mappar vi till en ProductDTO (Data Transfer Object) som bara innehåller exakt de fält API-konsumenten behöver. MediatR tar sedan hand om att returnera DTO:n tillbaka till controllern som väntade på svar.",
    highlight: ["application", "presentation"],
    arrow: { from: "application", to: "presentation" },
  },
  {
    index: 8,
    activeLayer: "presentation",
    direction: "up",
    title: "Steg 9: 200 OK → Klienten",
    code: `// Controller returnerar:
return Ok(result);

// HTTP-svar:
// 200 OK
// Content-Type: application/json
// { "id": 1, "name": "...", "price": 99.90 }`,
    description:
      "Vi är tillbaka där vi startade! Controllern tar emot ProductDTO:n från MediatR och wrappar den i ett Ok()-resultat — vilket ger statuskod 200. ASP.NET serialiserar DTO:n till JSON och skickar tillbaka HTTP-svaret till klienten. Hela resan genom alla lager är klar: förfrågan gick nedåt genom Presentation → Applikation → Infrastruktur → Databas, och svaret bubblade tillbaka uppåt samma väg. Varje lager hade sitt eget ansvar och visste bara det den behövde.",
    highlight: ["presentation", "user"],
    arrow: { from: "presentation", to: "user" },
  },
];

const Particle = ({ delay, x }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: 3,
      height: 3,
      left: x,
      background: "currentColor",
      opacity: 0.4,
    }}
    animate={{
      y: [0, -60],
      opacity: [0.6, 0],
      scale: [1, 0.3],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

export default function CleanArchitectureExplainer() {
  const [step, setStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const current = STEPS[step];

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    if (step >= STEPS.length - 1) {
      setIsAutoPlaying(false);
      return;
    }
    const timer = setTimeout(next, 3000);
    return () => clearTimeout(timer);
  }, [isAutoPlaying, step, next]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const getLayerStyle = (layerId) => {
    const isActive = current.activeLayer === layerId;
    const isHighlighted = current.highlight.includes(layerId);
    const layer = LAYERS.find((l) => l.id === layerId);
    return {
      borderColor: isActive
        ? layer.color
        : isHighlighted
          ? layer.color + "80"
          : "rgba(100,116,139,0.15)",
      background: isActive
        ? layer.color + "18"
        : isHighlighted
          ? layer.color + "08"
          : "rgba(15,23,42,0.4)",
      boxShadow: isActive
        ? `0 0 30px ${layer.color}25, inset 0 0 30px ${layer.color}08`
        : "none",
      scale: isActive ? 1.02 : 1,
    };
  };

  const renderArrow = () => {
    if (!current.arrow) return null;
    const fromIdx = LAYERS.findIndex((l) => l.id === current.arrow.from);
    const toIdx = LAYERS.findIndex((l) => l.id === current.arrow.to);
    const goingDown = toIdx > fromIdx;

    return (
      <motion.div
        key={`arrow-${step}`}
        className="absolute left-1/2 z-30"
        style={{
          top: `${Math.min(fromIdx, toIdx) * 16.666 + 8.333}%`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex flex-col items-center"
          animate={{
            y: goingDown ? [0, 20, 0] : [0, -20, 0],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap
            size={20}
            style={{
              color: LAYERS.find((l) => l.id === current.activeLayer)?.color,
              filter: `drop-shadow(0 0 8px ${
                LAYERS.find((l) => l.id === current.activeLayer)?.color
              })`,
            }}
          />
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div
      className="min-h-screen w-full text-white overflow-hidden relative"
      style={{
        background:
          "linear-gradient(145deg, #0a0e1a 0%, #0f172a 40%, #0c1220 100%)",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                }}
              >
                <Layers size={20} />
              </div>
              <div>
                <h1
                  className="text-lg font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(90deg, #e2e8f0, #94a3b8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Clean Architecture & CQRS
                </h1>
                <p className="text-xs text-slate-500">
                  GET-förfrågan genom .NET med MediatR
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="relative"
                  style={{ width: 28, height: 6 }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "rgba(100,116,139,0.2)" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      scaleX: i <= step ? 1 : 0,
                      background:
                        i === step
                          ? LAYERS.find((l) => l.id === STEPS[i].activeLayer)
                              ?.color
                          : "rgba(148,163,184,0.4)",
                    }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.3 }}
                  />
                </button>
              ))}
              <span className="text-[10px] text-slate-500 ml-1 font-mono">
                {step + 1}/{STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 px-6 pb-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-5">
          {/* Layer diagram */}
          <div className="lg:w-[340px] flex-shrink-0">
            <div className="relative flex flex-col gap-2">
              {LAYERS.map((layer, i) => {
                const Icon = layer.icon;
                const style = getLayerStyle(layer.id);
                const isActive = current.activeLayer === layer.id;

                return (
                  <motion.div
                    key={layer.id}
                    className="relative rounded-xl border px-4 py-3 cursor-default"
                    animate={{
                      borderColor: style.borderColor,
                      background: style.background,
                      boxShadow: style.boxShadow,
                      scale: style.scale,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          border: `1px solid ${layer.color}`,
                          opacity: 0,
                        }}
                        animate={{ opacity: [0, 0.6, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      <motion.div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isActive
                            ? layer.color + "30"
                            : "rgba(100,116,139,0.1)",
                        }}
                        animate={{
                          scale: isActive ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: isActive ? Infinity : 0,
                        }}
                      >
                        <Icon
                          size={16}
                          style={{
                            color: isActive ? layer.color : "#64748b",
                          }}
                        />
                      </motion.div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold tracking-wide"
                          style={{
                            color: isActive ? layer.color : "#94a3b8",
                          }}
                        >
                          {layer.label}
                        </div>
                        {layer.id === "application" && isActive && (
                          <motion.div
                            className="text-[9px] mt-0.5"
                            style={{ color: layer.color + "90" }}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                          >
                            IProductRepository interface ← här
                          </motion.div>
                        )}
                        {layer.id === "domain" && (
                          <div className="text-[9px] text-slate-600 mt-0.5">
                            Enbart Product-entitet
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: layer.color }}
                          animate={{
                            boxShadow: [
                              `0 0 4px ${layer.color}`,
                              `0 0 12px ${layer.color}`,
                              `0 0 4px ${layer.color}`,
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                          }}
                        />
                      )}
                    </div>

                    {/* Connection line */}
                    {i < LAYERS.length - 1 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-px h-2 z-0">
                        <motion.div
                          className="w-full h-full"
                          animate={{
                            background:
                              current.highlight.includes(layer.id) &&
                              current.highlight.includes(LAYERS[i + 1]?.id)
                                ? layer.color
                                : "rgba(100,116,139,0.15)",
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4"
              >
                {/* Title card */}
                <div
                  className="rounded-xl border p-5"
                  style={{
                    borderColor:
                      LAYERS.find((l) => l.id === current.activeLayer)?.color +
                      "40",
                    background: "rgba(15,23,42,0.6)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase"
                      style={{
                        background:
                          LAYERS.find((l) => l.id === current.activeLayer)
                            ?.color + "20",
                        color: LAYERS.find((l) => l.id === current.activeLayer)
                          ?.color,
                        border: `1px solid ${
                          LAYERS.find((l) => l.id === current.activeLayer)
                            ?.color
                        }30`,
                      }}
                    >
                      {current.direction === "down" ? "↓ Nedåt" : "↑ Uppåt"}
                    </div>
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ background: "#475569" }}
                    />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {LAYERS.find((l) => l.id === current.activeLayer)?.label}
                    </span>
                  </div>
                  <h2
                    className="text-xl font-bold mb-3"
                    style={{
                      color: LAYERS.find((l) => l.id === current.activeLayer)
                        ?.color,
                    }}
                  >
                    {current.title}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "#94a3b8",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {current.description}
                  </p>
                </div>

                {/* Code block */}
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor: "rgba(100,116,139,0.15)",
                    background: "rgba(2,6,23,0.8)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-2 border-b"
                    style={{
                      borderColor: "rgba(100,116,139,0.1)",
                      background: "rgba(15,23,42,0.5)",
                    }}
                  >
                    <FileCode size={12} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Kod
                    </span>
                  </div>
                  <pre
                    className="p-4 overflow-x-auto text-xs leading-relaxed"
                    style={{ color: "#cbd5e1" }}
                  >
                    <code>{current.code}</code>
                  </pre>
                </div>

                {/* Architecture note for step 3 */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border p-4 flex items-start gap-3"
                    style={{
                      borderColor: "#f59e0b40",
                      background:
                        "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#f59e0b20" }}
                    >
                      <Zap size={14} style={{ color: "#f59e0b" }} />
                    </div>
                    <div>
                      <div
                        className="text-xs font-bold mb-1"
                        style={{ color: "#f59e0b" }}
                      >
                        Bra att veta
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{
                          color: "#94a3b8",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        I den här uppsättningen ligger
                        IProductRepository-interfacet i{" "}
                        <span style={{ color: "#8b5cf6" }}>
                          Applikationslagret
                        </span>
                        . Det finns de som föredrar att lägga det i Domänlagret
                        istället — båda sätten fungerar. Det viktiga är att
                        implementationen alltid lever i{" "}
                        <span style={{ color: "#10b981" }}>
                          Infrastrukturlagret
                        </span>
                        .
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-auto pt-2">
              <button
                onClick={prev}
                disabled={step === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background:
                    step === 0
                      ? "rgba(100,116,139,0.1)"
                      : "rgba(100,116,139,0.15)",
                  color: step === 0 ? "#334155" : "#94a3b8",
                  border: "1px solid rgba(100,116,139,0.1)",
                  cursor: step === 0 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={14} />
                Föregående
              </button>

              <button
                onClick={() => {
                  if (step >= STEPS.length - 1) {
                    setStep(0);
                  } else {
                    setIsAutoPlaying(!isAutoPlaying);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: isAutoPlaying
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(99,102,241,0.15)",
                  color: isAutoPlaying ? "#ef4444" : "#818cf8",
                  border: `1px solid ${
                    isAutoPlaying
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(99,102,241,0.2)"
                  }`,
                  cursor: "pointer",
                }}
              >
                {step >= STEPS.length - 1 ? (
                  <>
                    <RotateCcw size={14} />
                    Börja om
                  </>
                ) : isAutoPlaying ? (
                  "⏸ Pausa"
                ) : (
                  "▶ Auto"
                )}
              </button>

              <button
                onClick={next}
                disabled={step >= STEPS.length - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background:
                    step >= STEPS.length - 1
                      ? "rgba(100,116,139,0.1)"
                      : `${
                          LAYERS.find((l) => l.id === current.activeLayer)
                            ?.color
                        }20`,
                  color:
                    step >= STEPS.length - 1
                      ? "#334155"
                      : LAYERS.find((l) => l.id === current.activeLayer)?.color,
                  border: `1px solid ${
                    step >= STEPS.length - 1
                      ? "rgba(100,116,139,0.1)"
                      : LAYERS.find((l) => l.id === current.activeLayer)
                          ?.color + "30"
                  }`,
                  cursor: step >= STEPS.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                Nästa
                <ChevronRight size={14} />
              </button>

              <div className="ml-auto text-[10px] text-slate-600 hidden sm:block">
                ← → tangenter fungerar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Trigger new publish
