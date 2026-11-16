/**
 * 由 scripts/extract-catalog.mjs 从小程序工程自动生成，勿手改。
 * 来源：paper-daily/utils/domains.js、utils/journals.js
 */

export type Sub = { key: string; name: string; query: string; keywords: string[] }
export type Domain = { key: string; name: string; en: string; color: string; query: string; subs: Sub[] }

export const DOMAINS: Domain[] = [
  {
    "key": "life",
    "name": "生命科学",
    "en": "Life Sciences",
    "color": "#16a34a",
    "query": "molecular biology cell genomics",
    "subs": [
      {
        "key": "genomics",
        "name": "基因组学",
        "query": "genome sequencing genomics",
        "keywords": [
          "genome",
          "genomic",
          "sequencing",
          "chromatin",
          "variant",
          "transcriptome"
        ]
      },
      {
        "key": "molecular",
        "name": "分子与细胞生物",
        "query": "molecular cell biology signaling",
        "keywords": [
          "molecular",
          "cell biology",
          "signaling",
          "protein",
          "organelle",
          "transcription"
        ]
      },
      {
        "key": "neuro",
        "name": "神经科学",
        "query": "neuroscience neural circuit brain",
        "keywords": [
          "neuron",
          "neural",
          "brain",
          "synap",
          "cortex",
          "cognitive"
        ]
      },
      {
        "key": "immuno",
        "name": "免疫学",
        "query": "immunology immune response t cell",
        "keywords": [
          "immun",
          "t cell",
          "antibod",
          "inflamm",
          "lymphocyte",
          "cytokine"
        ]
      },
      {
        "key": "microbiome",
        "name": "微生物组",
        "query": "microbiome gut bacteria microbial",
        "keywords": [
          "microbiome",
          "microbiota",
          "bacteria",
          "microbial",
          "gut",
          "pathogen"
        ]
      },
      {
        "key": "structural",
        "name": "结构生物学",
        "query": "cryo-em protein structure",
        "keywords": [
          "cryo-em",
          "crystal structure",
          "structural",
          "cryoem",
          "folding",
          "complex structure"
        ]
      },
      {
        "key": "stemcell",
        "name": "发育与干细胞",
        "query": "stem cell organoid development",
        "keywords": [
          "stem cell",
          "organoid",
          "embryo",
          "differentiation",
          "development",
          "regeneration"
        ]
      },
      {
        "key": "bioinfo",
        "name": "生物信息学",
        "query": "bioinformatics single cell computational biology",
        "keywords": [
          "bioinformatic",
          "single-cell",
          "algorithm",
          "computational",
          "pipeline",
          "atlas"
        ]
      }
    ]
  },
  {
    "key": "medicine",
    "name": "医学",
    "en": "Medicine & Health",
    "color": "#dc2626",
    "query": "clinical medicine patient disease",
    "subs": [
      {
        "key": "oncology",
        "name": "肿瘤学",
        "query": "cancer tumor immunotherapy oncology",
        "keywords": [
          "cancer",
          "tumor",
          "tumour",
          "carcinoma",
          "oncolog",
          "neoplasm"
        ]
      },
      {
        "key": "cardio",
        "name": "心血管",
        "query": "cardiovascular heart disease",
        "keywords": [
          "cardiac",
          "heart",
          "cardiovascular",
          "atherosclero",
          "myocardial",
          "hypertension"
        ]
      },
      {
        "key": "metabolic",
        "name": "代谢与内分泌",
        "query": "metabolism diabetes obesity endocrine",
        "keywords": [
          "metaboli",
          "diabet",
          "obesity",
          "insulin",
          "endocrine",
          "lipid"
        ]
      },
      {
        "key": "infectious",
        "name": "传染病",
        "query": "infectious disease virus vaccine",
        "keywords": [
          "infecti",
          "virus",
          "viral",
          "vaccine",
          "epidemi",
          "antimicrobial"
        ]
      },
      {
        "key": "publichealth",
        "name": "公共卫生",
        "query": "public health cohort population",
        "keywords": [
          "public health",
          "cohort",
          "population",
          "mortality",
          "health policy",
          "screening"
        ]
      },
      {
        "key": "pharma",
        "name": "药理与药物研发",
        "query": "drug discovery pharmacology clinical trial",
        "keywords": [
          "drug",
          "pharmac",
          "clinical trial",
          "therapeutic",
          "inhibitor",
          "compound"
        ]
      }
    ]
  },
  {
    "key": "pharm",
    "name": "药学",
    "en": "Pharmaceutical Sciences",
    "color": "#ea580c",
    "query": "pharmacology drug delivery medicinal chemistry",
    "subs": [
      {
        "key": "pharmacology",
        "name": "药理学",
        "query": "pharmacology mechanism of action receptor drug target",
        "keywords": [
          "pharmacolog",
          "mechanism of action",
          "dose-response",
          "agonist",
          "antagonist",
          "potency",
          "off-target"
        ]
      },
      {
        "key": "medchem",
        "name": "药物化学",
        "query": "medicinal chemistry drug design structure-activity",
        "keywords": [
          "medicinal chemistry",
          "drug design",
          "structure-activity",
          "lead compound",
          "pharmacophore",
          "prodrug",
          "hit compound"
        ]
      },
      {
        "key": "delivery",
        "name": "药剂与递送",
        "query": "drug delivery formulation nanoparticle carrier",
        "keywords": [
          "drug delivery",
          "formulation",
          "liposome",
          "nanocarrier",
          "bioavailability",
          "controlled release",
          "excipient"
        ]
      },
      {
        "key": "natural",
        "name": "天然药物与中药",
        "query": "natural product herbal medicine traditional chinese medicine",
        "keywords": [
          "natural product",
          "herbal",
          "traditional chinese medicine",
          "flavonoid",
          "alkaloid",
          "ethnopharmacolog",
          "decoction"
        ]
      },
      {
        "key": "pkpd",
        "name": "临床药理与药代",
        "query": "pharmacokinetics clinical pharmacology dosing",
        "keywords": [
          "pharmacokinet",
          "pharmacodynam",
          "therapeutic drug monitoring",
          "bioequivalence",
          "clearance",
          "dose adjustment"
        ]
      },
      {
        "key": "toxicology",
        "name": "药物毒理与安全",
        "query": "toxicology adverse drug reaction drug safety",
        "keywords": [
          "toxicolog",
          "adverse drug",
          "hepatotoxic",
          "nephrotoxic",
          "drug safety",
          "genotoxic"
        ]
      }
    ]
  },
  {
    "key": "chemistry",
    "name": "化学",
    "en": "Chemistry",
    "color": "#d97706",
    "query": "chemistry synthesis reaction molecular",
    "subs": [
      {
        "key": "organic",
        "name": "有机合成",
        "query": "organic synthesis total synthesis",
        "keywords": [
          "organic synthesis",
          "total synthesis",
          "c-h",
          "alkene",
          "coupling reaction",
          "stereoselect"
        ]
      },
      {
        "key": "catalysis",
        "name": "催化",
        "query": "catalysis catalyst heterogeneous",
        "keywords": [
          "cataly",
          "catalyst",
          "electrocataly",
          "photocataly",
          "turnover"
        ]
      },
      {
        "key": "analytical",
        "name": "分析化学",
        "query": "analytical chemistry mass spectrometry sensing",
        "keywords": [
          "analytical",
          "mass spectrom",
          "sensor",
          "detection",
          "chromatograph",
          "spectroscop"
        ]
      },
      {
        "key": "physicalchem",
        "name": "物理化学",
        "query": "physical chemistry thermodynamics kinetics",
        "keywords": [
          "thermodynamic",
          "kinetic",
          "quantum chem",
          "reaction mechanism",
          "molecular dynamic"
        ]
      },
      {
        "key": "chembio",
        "name": "化学生物学",
        "query": "chemical biology probe protein labeling",
        "keywords": [
          "chemical biology",
          "probe",
          "labeling",
          "bioorthogonal",
          "click chemistry",
          "ligand"
        ]
      },
      {
        "key": "polymerchem",
        "name": "高分子化学",
        "query": "polymer synthesis polymerization",
        "keywords": [
          "polymer",
          "polymerization",
          "copolymer",
          "macromolecul",
          "monomer"
        ]
      }
    ]
  },
  {
    "key": "physics",
    "name": "物理学",
    "en": "Physics",
    "color": "#2563eb",
    "query": "physics quantum condensed matter",
    "subs": [
      {
        "key": "quantum",
        "name": "量子物理",
        "query": "quantum computing qubit entanglement",
        "keywords": [
          "quantum",
          "qubit",
          "entangle",
          "superconduct",
          "quantum state"
        ]
      },
      {
        "key": "condensed",
        "name": "凝聚态物理",
        "query": "condensed matter topological material",
        "keywords": [
          "condensed matter",
          "topological",
          "magnet",
          "superconduct",
          "electronic band",
          "spin"
        ]
      },
      {
        "key": "astro",
        "name": "天体与宇宙学",
        "query": "astrophysics galaxy cosmology observation",
        "keywords": [
          "galax",
          "cosmolog",
          "astro",
          "exoplanet",
          "dark matter",
          "telescope"
        ]
      },
      {
        "key": "particle",
        "name": "粒子物理",
        "query": "particle physics higgs collider",
        "keywords": [
          "particle",
          "higgs",
          "collider",
          "neutrino",
          "hadron",
          "standard model"
        ]
      },
      {
        "key": "optics",
        "name": "光学与光子学",
        "query": "photonics optics laser",
        "keywords": [
          "optic",
          "photon",
          "laser",
          "waveguide",
          "interferom",
          "plasmon"
        ]
      },
      {
        "key": "plasma",
        "name": "等离子体与聚变",
        "query": "plasma physics fusion confinement",
        "keywords": [
          "plasma",
          "fusion",
          "confinement",
          "tokamak",
          "discharge"
        ]
      }
    ]
  },
  {
    "key": "materials",
    "name": "材料科学",
    "en": "Materials Science",
    "color": "#7c3aed",
    "query": "materials science nanomaterials thin films",
    "subs": [
      {
        "key": "nano",
        "name": "纳米材料",
        "query": "nanoparticle nanostructure synthesis",
        "keywords": [
          "nanoparticle",
          "nanostructur",
          "nanowire",
          "quantum dot",
          "nanomaterial"
        ]
      },
      {
        "key": "energy",
        "name": "能源材料",
        "query": "battery electrode solar cell materials",
        "keywords": [
          "battery",
          "electrode",
          "solar cell",
          "photovoltaic",
          "electrolyte",
          "hydrogen"
        ]
      },
      {
        "key": "2d",
        "name": "二维材料",
        "query": "graphene two-dimensional materials",
        "keywords": [
          "graphene",
          "two-dimensional",
          "2d material",
          "monolayer",
          "heterostructure",
          "mos2"
        ]
      },
      {
        "key": "polymermat",
        "name": "高分子材料",
        "query": "polymer materials soft matter hydrogel",
        "keywords": [
          "hydrogel",
          "soft matter",
          "elastomer",
          "polymer film",
          "self-healing"
        ]
      },
      {
        "key": "biomaterial",
        "name": "生物材料",
        "query": "biomaterial tissue engineering scaffold",
        "keywords": [
          "biomaterial",
          "scaffold",
          "tissue engineering",
          "biocompat",
          "implant"
        ]
      },
      {
        "key": "optoelectron",
        "name": "光电材料",
        "query": "optoelectronic perovskite semiconductor",
        "keywords": [
          "optoelectron",
          "perovskite",
          "semiconductor",
          "led",
          "photodetector",
          "thin film"
        ]
      }
    ]
  },
  {
    "key": "cs",
    "name": "计算机科学",
    "en": "Computer Science",
    "color": "#0891b2",
    "query": "computer science machine learning algorithms",
    "subs": [
      {
        "key": "ai",
        "name": "人工智能",
        "query": "large language model artificial intelligence",
        "keywords": [
          "large language model",
          "llm",
          "artificial intelligence",
          "agent",
          "reasoning",
          "foundation model"
        ]
      },
      {
        "key": "ml",
        "name": "机器学习",
        "query": "machine learning deep neural network",
        "keywords": [
          "machine learning",
          "deep learning",
          "neural network",
          "training",
          "generalization",
          "optimization"
        ]
      },
      {
        "key": "cv",
        "name": "计算机视觉",
        "query": "computer vision image segmentation recognition",
        "keywords": [
          "computer vision",
          "image",
          "segmentation",
          "object detection",
          "video",
          "visual"
        ]
      },
      {
        "key": "nlp",
        "name": "自然语言处理",
        "query": "natural language processing text generation",
        "keywords": [
          "natural language",
          "text",
          "translation",
          "language model",
          "token",
          "corpus"
        ]
      },
      {
        "key": "security",
        "name": "安全与隐私",
        "query": "cybersecurity privacy adversarial attack",
        "keywords": [
          "security",
          "privacy",
          "adversarial",
          "attack",
          "encryption",
          "vulnerabilit"
        ]
      },
      {
        "key": "systems",
        "name": "系统与网络",
        "query": "distributed systems computer networks",
        "keywords": [
          "distributed",
          "system",
          "network",
          "database",
          "scheduling",
          "edge computing"
        ]
      }
    ]
  },
  {
    "key": "earth",
    "name": "地球与环境",
    "en": "Earth & Environment",
    "color": "#059669",
    "query": "climate earth environment ecology",
    "subs": [
      {
        "key": "climate",
        "name": "气候变化",
        "query": "climate change global warming model",
        "keywords": [
          "climate",
          "warming",
          "greenhouse",
          "carbon emission",
          "temperature",
          "extreme weather"
        ]
      },
      {
        "key": "geology",
        "name": "地质与地球化学",
        "query": "geology geochemistry earthquake",
        "keywords": [
          "geolog",
          "geochem",
          "earthquake",
          "mineral",
          "tectonic",
          "sediment"
        ]
      },
      {
        "key": "ocean",
        "name": "海洋科学",
        "query": "oceanography marine ocean circulation",
        "keywords": [
          "ocean",
          "marine",
          "sea level",
          "coral",
          "salinity",
          "circulation"
        ]
      },
      {
        "key": "enveng",
        "name": "环境工程",
        "query": "water treatment pollution remediation",
        "keywords": [
          "pollution",
          "wastewater",
          "remediation",
          "treatment",
          "contaminant",
          "air quality"
        ]
      },
      {
        "key": "ecology",
        "name": "生态与生物多样性",
        "query": "biodiversity ecology conservation species",
        "keywords": [
          "biodivers",
          "ecolog",
          "species",
          "conservation",
          "habitat",
          "ecosystem"
        ]
      },
      {
        "key": "remote",
        "name": "遥感与地理信息",
        "query": "remote sensing satellite GIS",
        "keywords": [
          "remote sensing",
          "satellite",
          "gis",
          "spatial",
          "lidar",
          "land cover"
        ]
      }
    ]
  },
  {
    "key": "math",
    "name": "数学与统计",
    "en": "Mathematics & Statistics",
    "color": "#be185d",
    "query": "mathematics statistics probability theory",
    "subs": [
      {
        "key": "applied",
        "name": "应用数学",
        "query": "applied mathematics differential equations",
        "keywords": [
          "applied mathematics",
          "differential equation",
          "partial differential",
          "dynamical system",
          "modeling"
        ]
      },
      {
        "key": "stats",
        "name": "概率与统计",
        "query": "statistics inference bayesian estimation",
        "keywords": [
          "statistic",
          "bayesian",
          "inference",
          "estimation",
          "probability",
          "regression"
        ]
      },
      {
        "key": "pure",
        "name": "纯数学",
        "query": "algebra geometry number theory proof",
        "keywords": [
          "theorem",
          "algebra",
          "geometry",
          "topolog",
          "proof",
          "manifold"
        ]
      },
      {
        "key": "computmath",
        "name": "计算数学",
        "query": "numerical analysis computational mathematics",
        "keywords": [
          "numerical",
          "computational mathematics",
          "finite element",
          "algorithm",
          "approximation"
        ]
      },
      {
        "key": "mathbio",
        "name": "数学生物学",
        "query": "mathematical biology epidemiological model",
        "keywords": [
          "mathematical biology",
          "epidemiological model",
          "population dynamics",
          "reaction-diffusion"
        ]
      },
      {
        "key": "optimization",
        "name": "优化与运筹",
        "query": "optimization operations research convex",
        "keywords": [
          "optimization",
          "convex",
          "operations research",
          "linear programming",
          "stochastic gradient"
        ]
      }
    ]
  }
]

export const ALL_KEY = "all"

/** ISSN → 领域 key，用于按期刊判定论文归属 */
export const DOMAIN_BY_ISSN: Record<string, string> = {
  "0028-0836": "life",
  "0036-8075": "life",
  "0092-8674": "life",
  "2041-1723": "life",
  "0305-1048": "life",
  "1474-760X": "life",
  "2050-084X": "life",
  "1548-7091": "life",
  "2211-1247": "life",
  "2045-2322": "life",
  "1061-4036": "life",
  "0027-8424": "life",
  "1465-7392": "life",
  "1097-2765": "life",
  "1097-6256": "life",
  "0896-6273": "life",
  "1074-7613": "life",
  "1529-2908": "life",
  "1934-5909": "life",
  "1545-9985": "life",
  "2058-5276": "life",
  "1931-3128": "life",
  "1088-9051": "life",
  "1367-4803": "life",
  "0737-4038": "life",
  "0021-9525": "life",
  "0261-4189": "life",
  "1087-0156": "life",
  "1534-5807": "life",
  "2397-334X": "life",
  "1545-7885": "life",
  "0960-9822": "life",
  "0028-4793": "medicine",
  "0140-6736": "medicine",
  "0098-7484": "medicine",
  "0959-8138": "medicine",
  "1078-8956": "medicine",
  "1470-2045": "medicine",
  "0732-183X": "medicine",
  "1535-6108": "medicine",
  "0009-7322": "medicine",
  "0195-668X": "medicine",
  "0735-1097": "medicine",
  "0149-5992": "medicine",
  "1473-3099": "medicine",
  "1058-4838": "medicine",
  "1474-1776": "medicine",
  "0168-8278": "medicine",
  "0085-2538": "medicine",
  "0003-4819": "medicine",
  "2468-2667": "medicine",
  "2168-6106": "medicine",
  "1550-4131": "medicine",
  "1474-175X": "medicine",
  "0031-6997": "pharm",
  "0165-6147": "pharm",
  "1043-6618": "pharm",
  "2211-3835": "pharm",
  "1671-4083": "pharm",
  "0022-2623": "pharm",
  "0223-5234": "pharm",
  "0168-3659": "pharm",
  "0169-409X": "pharm",
  "0378-5173": "pharm",
  "1543-8384": "pharm",
  "0009-9236": "pharm",
  "0306-5251": "pharm",
  "0378-8741": "pharm",
  "0944-7113": "pharm",
  "0090-9556": "pharm",
  "2451-9448": "pharm",
  "0002-7863": "chemistry",
  "1433-7851": "chemistry",
  "1755-4330": "chemistry",
  "0009-2665": "chemistry",
  "0306-0012": "chemistry",
  "2155-5435": "chemistry",
  "2520-1158": "chemistry",
  "2041-6520": "chemistry",
  "0003-2700": "chemistry",
  "1523-7060": "chemistry",
  "0947-6539": "chemistry",
  "1552-4450": "chemistry",
  "0024-9297": "chemistry",
  "0021-9517": "chemistry",
  "1463-9262": "chemistry",
  "0031-9007": "physics",
  "2469-9950": "physics",
  "2160-3308": "physics",
  "1745-2473": "physics",
  "0034-6861": "physics",
  "2397-3366": "physics",
  "0004-637X": "physics",
  "0035-8711": "physics",
  "0370-1573": "physics",
  "2056-6387": "physics",
  "2521-327X": "physics",
  "2331-7019": "physics",
  "0029-5515": "physics",
  "2047-7538": "physics",
  "1094-4087": "physics",
  "1476-1122": "materials",
  "1748-3387": "materials",
  "0935-9648": "materials",
  "1614-6832": "materials",
  "1944-8244": "materials",
  "1530-6984": "materials",
  "1754-5692": "materials",
  "2542-4351": "materials",
  "2058-7546": "materials",
  "2053-1583": "materials",
  "0897-4756": "materials",
  "0142-9612": "materials",
  "2520-1131": "materials",
  "1616-301X": "materials",
  "2522-5839": "cs",
  "0162-8828": "cs",
  "1532-4435": "cs",
  "0004-3702": "cs",
  "1076-9757": "cs",
  "2162-237X": "cs",
  "0098-5589": "cs",
  "0360-0300": "cs",
  "0004-5411": "cs",
  "0001-0782": "cs",
  "0020-0255": "cs",
  "0950-7051": "cs",
  "0031-3203": "cs",
  "1556-6013": "cs",
  "0730-0301": "cs",
  "0893-6080": "cs",
  "1536-1233": "cs",
  "1758-678X": "earth",
  "1752-0894": "earth",
  "0048-9697": "earth",
  "0013-936X": "earth",
  "0043-1354": "earth",
  "0012-821X": "earth",
  "0094-8276": "earth",
  "0894-8755": "earth",
  "2398-9629": "earth",
  "1461-023X": "earth",
  "1354-1013": "earth",
  "0034-4257": "earth",
  "2169-897X": "earth",
  "0269-7491": "earth",
  "0079-6611": "earth",
  "0003-486X": "math",
  "0894-0347": "math",
  "0020-9910": "math",
  "0010-3640": "math",
  "0036-1429": "math",
  "0025-5718": "math",
  "0022-0396": "math",
  "0001-8708": "math",
  "0090-5364": "math",
  "0162-1459": "math",
  "0036-1445": "math",
  "0025-5610": "math",
  "0006-3444": "math"
}

/** 刊名 → 影响因子参考值 */
export const JOURNAL_IF: Record<string, string> = {
  "nature": "50.5",
  "science": "44.7",
  "cell": "45.5",
  "the new england journal of medicine": "96.2",
  "new england journal of medicine": "96.2",
  "thelancet": "98.4",
  "the lancet": "98.4",
  "lancet": "98.4",
  "jama": "63.1",
  "nature medicine": "58.7",
  "nature biotechnology": "33.1",
  "nature methods": "36.1",
  "nature genetics": "31.7",
  "nature neuroscience": "21.2",
  "nature immunology": "27.7",
  "nature materials": "37.2",
  "nature energy": "49.7",
  "nature physics": "17.6",
  "nature chemistry": "19.2",
  "nature machine intelligence": "18.8",
  "nature communications": "14.7",
  "science advances": "11.7",
  "science translational medicine": "15.8",
  "cell reports": "7.5",
  "cell host & microbe": "20.6",
  "cell host and microbe": "20.6",
  "immunity": "25.5",
  "proceedings of the national academy of sciences": "9.4",
  "pnas": "9.4",
  "nucleic acids research": "16.6",
  "genome biology": "10.1",
  "elife": "6.4",
  "plos one": "2.9",
  "scientific reports": "3.9",
  "journal of the american chemical society": "14.4",
  "jacs": "14.4",
  "angewandte chemie": "16.1",
  "angewandte chemie international edition": "16.1",
  "chemical society reviews": "40.4",
  "advanced materials": "27.4",
  "acs nano": "15.8",
  "nano letters": "9.6",
  "energy & environmental science": "32.4",
  "energy and environmental science": "32.4",
  "physical review letters": "8.1",
  "physical review b": "3.7",
  "ieee transactions on pattern analysis and machine intelligence": "20.8",
  "bioinformatics": "4.4",
  "briefings in bioinformatics": "6.8",
  "frontiers in immunology": "5.7",
  "frontiers in microbiology": "4.0",
  "frontiers in bioengineering and biotechnology": "4.3",
  "journal of clinical oncology": "42.1",
  "circulation": "35.5",
  "nature reviews drug discovery": "122.7",
  "pharmacological reviews": "19.3",
  "trends in pharmacological sciences": "13.0",
  "pharmacological research": "9.3",
  "acta pharmaceutica sinica b": "14.7",
  "acta pharmacologica sinica": "6.9",
  "clinical pharmacology & therapeutics": "6.7",
  "clinical pharmacology and therapeutics": "6.7",
  "british journal of clinical pharmacology": "3.1",
  "european journal of medicinal chemistry": "6.0",
  "journal of controlled release": "10.8",
  "advanced drug delivery reviews": "15.2",
  "international journal of pharmaceutics": "5.3",
  "molecular pharmaceutics": "4.5",
  "journal of ethnopharmacology": "4.8",
  "phytomedicine": "6.7",
  "drug metabolism and disposition": "3.9",
  "frontiers in pharmacology": "4.4",
  "british journal of pharmacology": "6.8",
  "european journal of pharmacology": "4.2",
  "biochemical pharmacology": "5.3",
  "biomedicine & pharmacotherapy": "6.9",
  "biomedicine and pharmacotherapy": "6.9",
  "international immunopharmacology": "4.8",
  "drug discovery today": "6.8",
  "current medicinal chemistry": "3.5",
  "journal of pharmacy and pharmacology": "2.8",
  "expert opinion on drug delivery": "5.4",
  "blood": "21.0",
  "gut": "23.0",
  "brain": "10.6",
  "nature climate change": "29.6",
  "global change biology": "10.8",
  "environmental science & technology": "10.8",
  "water research": "11.4",
  "acm computing surveys": "23.8",
  "ieee transactions on neural networks and learning systems": "10.2"
}

export type JournalMeta = { issn: string; name: string; abbr: string; impact: string; domain: string }

/** 期刊清单：面板按简称/全名/ISSN 搜索靠它 */
export const JOURNALS: JournalMeta[] = [
  {
    "issn": "0028-0836",
    "name": "Nature",
    "abbr": "Nature",
    "impact": "50.5",
    "domain": "life"
  },
  {
    "issn": "0036-8075",
    "name": "Science",
    "abbr": "Science",
    "impact": "44.7",
    "domain": "life"
  },
  {
    "issn": "0092-8674",
    "name": "Cell",
    "abbr": "Cell",
    "impact": "45.5",
    "domain": "life"
  },
  {
    "issn": "2041-1723",
    "name": "Nature Communications",
    "abbr": "Nat Commun",
    "impact": "14.7",
    "domain": "life"
  },
  {
    "issn": "0305-1048",
    "name": "Nucleic Acids Research",
    "abbr": "Nucleic Acids Res",
    "impact": "16.6",
    "domain": "life"
  },
  {
    "issn": "1474-760X",
    "name": "Genome Biology",
    "abbr": "",
    "impact": "10.1",
    "domain": "life"
  },
  {
    "issn": "2050-084X",
    "name": "eLife",
    "abbr": "Elife",
    "impact": "6.4",
    "domain": "life"
  },
  {
    "issn": "1548-7091",
    "name": "Nature Methods",
    "abbr": "Nat Methods",
    "impact": "36.1",
    "domain": "life"
  },
  {
    "issn": "2211-1247",
    "name": "Cell Reports",
    "abbr": "Cell Rep",
    "impact": "7.5",
    "domain": "life"
  },
  {
    "issn": "2045-2322",
    "name": "Scientific Reports",
    "abbr": "Sci Rep",
    "impact": "3.8",
    "domain": "life"
  },
  {
    "issn": "1061-4036",
    "name": "Nature Genetics",
    "abbr": "Nat Genet",
    "impact": "31.7",
    "domain": "life"
  },
  {
    "issn": "0027-8424",
    "name": "Proceedings of the National Academy of Sciences",
    "abbr": "Proc Natl Acad Sci U S A",
    "impact": "9.4",
    "domain": "life"
  },
  {
    "issn": "1465-7392",
    "name": "Nature Cell Biology",
    "abbr": "Nat Cell Biol",
    "impact": "17.3",
    "domain": "life"
  },
  {
    "issn": "1097-2765",
    "name": "Molecular Cell",
    "abbr": "Mol Cell",
    "impact": "14.5",
    "domain": "life"
  },
  {
    "issn": "1097-6256",
    "name": "Nature Neuroscience",
    "abbr": "Nat Neurosci",
    "impact": "21.2",
    "domain": "life"
  },
  {
    "issn": "0896-6273",
    "name": "Neuron",
    "abbr": "Neuron",
    "impact": "14.7",
    "domain": "life"
  },
  {
    "issn": "1074-7613",
    "name": "Immunity",
    "abbr": "Immunity",
    "impact": "25.5",
    "domain": "life"
  },
  {
    "issn": "1529-2908",
    "name": "Nature Immunology",
    "abbr": "Nat Immunol",
    "impact": "27.7",
    "domain": "life"
  },
  {
    "issn": "1934-5909",
    "name": "Cell Stem Cell",
    "abbr": "Cell Stem Cell",
    "impact": "19.8",
    "domain": "life"
  },
  {
    "issn": "1545-9985",
    "name": "Nature Structural & Molecular Biology",
    "abbr": "",
    "impact": "12.5",
    "domain": "life"
  },
  {
    "issn": "2058-5276",
    "name": "Nature Microbiology",
    "abbr": "Nat Microbiol",
    "impact": "25.7",
    "domain": "life"
  },
  {
    "issn": "1931-3128",
    "name": "Cell Host & Microbe",
    "abbr": "Cell Host Microbe",
    "impact": "20.6",
    "domain": "life"
  },
  {
    "issn": "1088-9051",
    "name": "Genome Research",
    "abbr": "Genome Res",
    "impact": "6.2",
    "domain": "life"
  },
  {
    "issn": "1367-4803",
    "name": "Bioinformatics",
    "abbr": "Bioinformatics",
    "impact": "4.4",
    "domain": "life"
  },
  {
    "issn": "0737-4038",
    "name": "Molecular Biology and Evolution",
    "abbr": "Mol Biol Evol",
    "impact": "11.0",
    "domain": "life"
  },
  {
    "issn": "0021-9525",
    "name": "Journal of Cell Biology",
    "abbr": "J Cell Biol",
    "impact": "7.4",
    "domain": "life"
  },
  {
    "issn": "0261-4189",
    "name": "The EMBO Journal",
    "abbr": "EMBO J",
    "impact": "9.4",
    "domain": "life"
  },
  {
    "issn": "1087-0156",
    "name": "Nature Biotechnology",
    "abbr": "Nat Biotechnol",
    "impact": "33.1",
    "domain": "life"
  },
  {
    "issn": "1534-5807",
    "name": "Developmental Cell",
    "abbr": "Dev Cell",
    "impact": "10.7",
    "domain": "life"
  },
  {
    "issn": "2397-334X",
    "name": "Nature Ecology & Evolution",
    "abbr": "Nat Ecol Evol",
    "impact": "13.9",
    "domain": "life"
  },
  {
    "issn": "1545-7885",
    "name": "PLoS Biology",
    "abbr": "",
    "impact": "9.8",
    "domain": "life"
  },
  {
    "issn": "0960-9822",
    "name": "Current Biology",
    "abbr": "Curr Biol",
    "impact": "8.1",
    "domain": "life"
  },
  {
    "issn": "0028-4793",
    "name": "The New England Journal of Medicine",
    "abbr": "N Engl J Med",
    "impact": "96.2",
    "domain": "medicine"
  },
  {
    "issn": "0140-6736",
    "name": "The Lancet",
    "abbr": "Lancet",
    "impact": "98.4",
    "domain": "medicine"
  },
  {
    "issn": "0098-7484",
    "name": "JAMA",
    "abbr": "JAMA",
    "impact": "63.1",
    "domain": "medicine"
  },
  {
    "issn": "0959-8138",
    "name": "BMJ",
    "abbr": "BMJ",
    "impact": "93.6",
    "domain": "medicine"
  },
  {
    "issn": "1078-8956",
    "name": "Nature Medicine",
    "abbr": "Nat Med",
    "impact": "58.7",
    "domain": "medicine"
  },
  {
    "issn": "1470-2045",
    "name": "The Lancet Oncology",
    "abbr": "Lancet Oncol",
    "impact": "41.6",
    "domain": "medicine"
  },
  {
    "issn": "0732-183X",
    "name": "Journal of Clinical Oncology",
    "abbr": "J Clin Oncol",
    "impact": "42.1",
    "domain": "medicine"
  },
  {
    "issn": "1535-6108",
    "name": "Cancer Cell",
    "abbr": "Cancer Cell",
    "impact": "48.8",
    "domain": "medicine"
  },
  {
    "issn": "0009-7322",
    "name": "Circulation",
    "abbr": "Circulation",
    "impact": "35.5",
    "domain": "medicine"
  },
  {
    "issn": "0195-668X",
    "name": "European Heart Journal",
    "abbr": "Eur Heart J",
    "impact": "37.6",
    "domain": "medicine"
  },
  {
    "issn": "0735-1097",
    "name": "Journal of the American College of Cardiology",
    "abbr": "J Am Coll Cardiol",
    "impact": "21.7",
    "domain": "medicine"
  },
  {
    "issn": "0149-5992",
    "name": "Diabetes Care",
    "abbr": "Diabetes Care",
    "impact": "14.8",
    "domain": "medicine"
  },
  {
    "issn": "1473-3099",
    "name": "The Lancet Infectious Diseases",
    "abbr": "Lancet Infect Dis",
    "impact": "36.4",
    "domain": "medicine"
  },
  {
    "issn": "1058-4838",
    "name": "Clinical Infectious Diseases",
    "abbr": "Clin Infect Dis",
    "impact": "8.2",
    "domain": "medicine"
  },
  {
    "issn": "1474-1776",
    "name": "Nature Reviews Drug Discovery",
    "abbr": "Nat Rev Drug Discov",
    "impact": "122.7",
    "domain": "medicine"
  },
  {
    "issn": "0168-8278",
    "name": "Journal of Hepatology",
    "abbr": "J Hepatol",
    "impact": "26.8",
    "domain": "medicine"
  },
  {
    "issn": "0085-2538",
    "name": "Kidney International",
    "abbr": "Kidney Int",
    "impact": "14.8",
    "domain": "medicine"
  },
  {
    "issn": "0003-4819",
    "name": "Annals of Internal Medicine",
    "abbr": "Ann Intern Med",
    "impact": "19.6",
    "domain": "medicine"
  },
  {
    "issn": "2468-2667",
    "name": "The Lancet Public Health",
    "abbr": "Lancet Public Health",
    "impact": "25.4",
    "domain": "medicine"
  },
  {
    "issn": "2168-6106",
    "name": "JAMA Internal Medicine",
    "abbr": "JAMA Intern Med",
    "impact": "22.5",
    "domain": "medicine"
  },
  {
    "issn": "1550-4131",
    "name": "Cell Metabolism",
    "abbr": "Cell Metab",
    "impact": "27.7",
    "domain": "medicine"
  },
  {
    "issn": "1474-175X",
    "name": "Nature Reviews Cancer",
    "abbr": "Nat Rev Cancer",
    "impact": "72.5",
    "domain": "medicine"
  },
  {
    "issn": "0031-6997",
    "name": "Pharmacological Reviews",
    "abbr": "Pharmacol Rev",
    "impact": "19.3",
    "domain": "pharm"
  },
  {
    "issn": "0165-6147",
    "name": "Trends in Pharmacological Sciences",
    "abbr": "Trends Pharmacol Sci",
    "impact": "13.0",
    "domain": "pharm"
  },
  {
    "issn": "1043-6618",
    "name": "Pharmacological Research",
    "abbr": "Pharmacol Res",
    "impact": "9.3",
    "domain": "pharm"
  },
  {
    "issn": "2211-3835",
    "name": "Acta Pharmaceutica Sinica B",
    "abbr": "Acta Pharm Sin B",
    "impact": "14.7",
    "domain": "pharm"
  },
  {
    "issn": "1671-4083",
    "name": "Acta Pharmacologica Sinica",
    "abbr": "Acta Pharmacol Sin",
    "impact": "6.9",
    "domain": "pharm"
  },
  {
    "issn": "0022-2623",
    "name": "Journal of Medicinal Chemistry",
    "abbr": "J Med Chem",
    "impact": "6.8",
    "domain": "pharm"
  },
  {
    "issn": "0223-5234",
    "name": "European Journal of Medicinal Chemistry",
    "abbr": "Eur J Med Chem",
    "impact": "6.0",
    "domain": "pharm"
  },
  {
    "issn": "0168-3659",
    "name": "Journal of Controlled Release",
    "abbr": "J Control Release",
    "impact": "10.8",
    "domain": "pharm"
  },
  {
    "issn": "0169-409X",
    "name": "Advanced Drug Delivery Reviews",
    "abbr": "Adv Drug Deliv Rev",
    "impact": "15.2",
    "domain": "pharm"
  },
  {
    "issn": "0378-5173",
    "name": "International Journal of Pharmaceutics",
    "abbr": "Int J Pharm",
    "impact": "5.3",
    "domain": "pharm"
  },
  {
    "issn": "1543-8384",
    "name": "Molecular Pharmaceutics",
    "abbr": "Mol Pharm",
    "impact": "4.5",
    "domain": "pharm"
  },
  {
    "issn": "0009-9236",
    "name": "Clinical Pharmacology & Therapeutics",
    "abbr": "Clin Pharmacol Ther",
    "impact": "6.7",
    "domain": "pharm"
  },
  {
    "issn": "0306-5251",
    "name": "British Journal of Clinical Pharmacology",
    "abbr": "Br J Clin Pharmacol",
    "impact": "3.1",
    "domain": "pharm"
  },
  {
    "issn": "0378-8741",
    "name": "Journal of Ethnopharmacology",
    "abbr": "J Ethnopharmacol",
    "impact": "4.8",
    "domain": "pharm"
  },
  {
    "issn": "0944-7113",
    "name": "Phytomedicine",
    "abbr": "Phytomedicine",
    "impact": "6.7",
    "domain": "pharm"
  },
  {
    "issn": "0090-9556",
    "name": "Drug Metabolism and Disposition",
    "abbr": "Drug Metab Dispos",
    "impact": "3.9",
    "domain": "pharm"
  },
  {
    "issn": "2451-9448",
    "name": "Cell Chemical Biology",
    "abbr": "Cell Chem Biol",
    "impact": "6.6",
    "domain": "pharm"
  },
  {
    "issn": "0002-7863",
    "name": "Journal of the American Chemical Society",
    "abbr": "J Am Chem Soc",
    "impact": "14.4",
    "domain": "chemistry"
  },
  {
    "issn": "1433-7851",
    "name": "Angewandte Chemie International Edition",
    "abbr": "Angew Chem Int Ed Engl",
    "impact": "16.1",
    "domain": "chemistry"
  },
  {
    "issn": "1755-4330",
    "name": "Nature Chemistry",
    "abbr": "Nat Chem",
    "impact": "19.2",
    "domain": "chemistry"
  },
  {
    "issn": "0009-2665",
    "name": "Chemical Reviews",
    "abbr": "Chem Rev",
    "impact": "51.4",
    "domain": "chemistry"
  },
  {
    "issn": "0306-0012",
    "name": "Chemical Society Reviews",
    "abbr": "Chem Soc Rev",
    "impact": "40.4",
    "domain": "chemistry"
  },
  {
    "issn": "2155-5435",
    "name": "ACS Catalysis",
    "abbr": "ACS Catal",
    "impact": "12.5",
    "domain": "chemistry"
  },
  {
    "issn": "2520-1158",
    "name": "Nature Catalysis",
    "abbr": "Nat Catal",
    "impact": "42.8",
    "domain": "chemistry"
  },
  {
    "issn": "2041-6520",
    "name": "Chemical Science",
    "abbr": "Chem Sci",
    "impact": "7.6",
    "domain": "chemistry"
  },
  {
    "issn": "0003-2700",
    "name": "Analytical Chemistry",
    "abbr": "Anal Chem",
    "impact": "6.7",
    "domain": "chemistry"
  },
  {
    "issn": "1523-7060",
    "name": "Organic Letters",
    "abbr": "Org Lett",
    "impact": "4.9",
    "domain": "chemistry"
  },
  {
    "issn": "0947-6539",
    "name": "Chemistry - A European Journal",
    "abbr": "Chemistry",
    "impact": "3.9",
    "domain": "chemistry"
  },
  {
    "issn": "1552-4450",
    "name": "Nature Chemical Biology",
    "abbr": "Nat Chem Biol",
    "impact": "12.9",
    "domain": "chemistry"
  },
  {
    "issn": "0024-9297",
    "name": "Macromolecules",
    "abbr": "Macromolecules",
    "impact": "5.1",
    "domain": "chemistry"
  },
  {
    "issn": "0021-9517",
    "name": "Journal of Catalysis",
    "abbr": "J Catal",
    "impact": "6.5",
    "domain": "chemistry"
  },
  {
    "issn": "1463-9262",
    "name": "Green Chemistry",
    "abbr": "Green Chem",
    "impact": "9.3",
    "domain": "chemistry"
  },
  {
    "issn": "0031-9007",
    "name": "Physical Review Letters",
    "abbr": "Phys Rev Lett",
    "impact": "8.1",
    "domain": "physics"
  },
  {
    "issn": "2469-9950",
    "name": "Physical Review B",
    "abbr": "Phys Rev B",
    "impact": "3.7",
    "domain": "physics"
  },
  {
    "issn": "2160-3308",
    "name": "Physical Review X",
    "abbr": "Phys Rev X",
    "impact": "11.6",
    "domain": "physics"
  },
  {
    "issn": "1745-2473",
    "name": "Nature Physics",
    "abbr": "Nat Phys",
    "impact": "17.6",
    "domain": "physics"
  },
  {
    "issn": "0034-6861",
    "name": "Reviews of Modern Physics",
    "abbr": "Rev Mod Phys",
    "impact": "45.9",
    "domain": "physics"
  },
  {
    "issn": "2397-3366",
    "name": "Nature Astronomy",
    "abbr": "Nat Astron",
    "impact": "12.9",
    "domain": "physics"
  },
  {
    "issn": "0004-637X",
    "name": "The Astrophysical Journal",
    "abbr": "Astrophys J",
    "impact": "4.8",
    "domain": "physics"
  },
  {
    "issn": "0035-8711",
    "name": "Monthly Notices of the Royal Astronomical Society",
    "abbr": "Mon Not R Astron Soc",
    "impact": "4.8",
    "domain": "physics"
  },
  {
    "issn": "0370-1573",
    "name": "Physics Reports",
    "abbr": "Phys Rep",
    "impact": "23.9",
    "domain": "physics"
  },
  {
    "issn": "2056-6387",
    "name": "npj Quantum Information",
    "abbr": "npj Quantum Inf",
    "impact": "6.6",
    "domain": "physics"
  },
  {
    "issn": "2521-327X",
    "name": "Quantum",
    "abbr": "Quantum (Vienna)",
    "impact": "5.3",
    "domain": "physics"
  },
  {
    "issn": "2331-7019",
    "name": "Physical Review Applied",
    "abbr": "Phys Rev Appl",
    "impact": "3.8",
    "domain": "physics"
  },
  {
    "issn": "0029-5515",
    "name": "Nuclear Fusion",
    "abbr": "",
    "impact": "3.3",
    "domain": "physics"
  },
  {
    "issn": "2047-7538",
    "name": "Light: Science & Applications",
    "abbr": "",
    "impact": "20.6",
    "domain": "physics"
  },
  {
    "issn": "1094-4087",
    "name": "Optics Express",
    "abbr": "Opt Express",
    "impact": "3.2",
    "domain": "physics"
  },
  {
    "issn": "1476-1122",
    "name": "Nature Materials",
    "abbr": "Nat Mater",
    "impact": "37.2",
    "domain": "materials"
  },
  {
    "issn": "1748-3387",
    "name": "Nature Nanotechnology",
    "abbr": "Nat Nanotechnol",
    "impact": "38.1",
    "domain": "materials"
  },
  {
    "issn": "0935-9648",
    "name": "Advanced Materials",
    "abbr": "Adv Mater",
    "impact": "27.4",
    "domain": "materials"
  },
  {
    "issn": "1614-6832",
    "name": "Advanced Energy Materials",
    "abbr": "Adv Energy Mater",
    "impact": "24.4",
    "domain": "materials"
  },
  {
    "issn": "1944-8244",
    "name": "ACS Applied Materials & Interfaces",
    "abbr": "ACS Appl Mater Interfaces",
    "impact": "8.3",
    "domain": "materials"
  },
  {
    "issn": "1530-6984",
    "name": "Nano Letters",
    "abbr": "Nano Lett",
    "impact": "9.6",
    "domain": "materials"
  },
  {
    "issn": "1754-5692",
    "name": "Energy & Environmental Science",
    "abbr": "Energy Environ Sci",
    "impact": "32.4",
    "domain": "materials"
  },
  {
    "issn": "2542-4351",
    "name": "Joule",
    "abbr": "Joule",
    "impact": "38.6",
    "domain": "materials"
  },
  {
    "issn": "2058-7546",
    "name": "Nature Energy",
    "abbr": "Nat Energy",
    "impact": "49.7",
    "domain": "materials"
  },
  {
    "issn": "2053-1583",
    "name": "2D Materials",
    "abbr": "2d Mater",
    "impact": "4.5",
    "domain": "materials"
  },
  {
    "issn": "0897-4756",
    "name": "Chemistry of Materials",
    "abbr": "Chem Mater",
    "impact": "7.2",
    "domain": "materials"
  },
  {
    "issn": "0142-9612",
    "name": "Biomaterials",
    "abbr": "Biomaterials",
    "impact": "12.8",
    "domain": "materials"
  },
  {
    "issn": "2520-1131",
    "name": "Nature Electronics",
    "abbr": "Nat Electron",
    "impact": "33.7",
    "domain": "materials"
  },
  {
    "issn": "1616-301X",
    "name": "Advanced Functional Materials",
    "abbr": "Adv Funct Mater",
    "impact": "18.5",
    "domain": "materials"
  },
  {
    "issn": "2522-5839",
    "name": "Nature Machine Intelligence",
    "abbr": "Nat Mach Intell",
    "impact": "18.8",
    "domain": "cs"
  },
  {
    "issn": "0162-8828",
    "name": "IEEE Transactions on Pattern Analysis and Machine Intelligence",
    "abbr": "IEEE Trans Pattern Anal Mach Intell",
    "impact": "20.8",
    "domain": "cs"
  },
  {
    "issn": "1532-4435",
    "name": "Journal of Machine Learning Research",
    "abbr": "J Mach Learn Res",
    "impact": "4.3",
    "domain": "cs"
  },
  {
    "issn": "0004-3702",
    "name": "Artificial Intelligence",
    "abbr": "Artif Intell",
    "impact": "5.1",
    "domain": "cs"
  },
  {
    "issn": "1076-9757",
    "name": "Journal of Artificial Intelligence Research",
    "abbr": "J Artif Intell Res",
    "impact": "5.0",
    "domain": "cs"
  },
  {
    "issn": "2162-237X",
    "name": "IEEE Transactions on Neural Networks and Learning Systems",
    "abbr": "IEEE Trans Neural Netw Learn Syst",
    "impact": "10.2",
    "domain": "cs"
  },
  {
    "issn": "0098-5589",
    "name": "IEEE Transactions on Software Engineering",
    "abbr": "",
    "impact": "6.5",
    "domain": "cs"
  },
  {
    "issn": "0360-0300",
    "name": "ACM Computing Surveys",
    "abbr": "ACM Comput Surv",
    "impact": "23.8",
    "domain": "cs"
  },
  {
    "issn": "0004-5411",
    "name": "Journal of the ACM",
    "abbr": "",
    "impact": "2.2",
    "domain": "cs"
  },
  {
    "issn": "0001-0782",
    "name": "Communications of the ACM",
    "abbr": "",
    "impact": "11.1",
    "domain": "cs"
  },
  {
    "issn": "0020-0255",
    "name": "Information Sciences",
    "abbr": "",
    "impact": "8.1",
    "domain": "cs"
  },
  {
    "issn": "0950-7051",
    "name": "Knowledge-Based Systems",
    "abbr": "Knowl Based Syst",
    "impact": "7.2",
    "domain": "cs"
  },
  {
    "issn": "0031-3203",
    "name": "Pattern Recognition",
    "abbr": "Pattern Recognit",
    "impact": "7.5",
    "domain": "cs"
  },
  {
    "issn": "1556-6013",
    "name": "IEEE Transactions on Information Forensics and Security",
    "abbr": "IEEE Trans Inf Forensics Secur",
    "impact": "6.3",
    "domain": "cs"
  },
  {
    "issn": "0730-0301",
    "name": "ACM Transactions on Graphics",
    "abbr": "",
    "impact": "7.8",
    "domain": "cs"
  },
  {
    "issn": "0893-6080",
    "name": "Neural Networks",
    "abbr": "Neural Netw",
    "impact": "6.0",
    "domain": "cs"
  },
  {
    "issn": "1536-1233",
    "name": "IEEE Transactions on Mobile Computing",
    "abbr": "IEEE Trans Mob Comput",
    "impact": "7.9",
    "domain": "cs"
  },
  {
    "issn": "1758-678X",
    "name": "Nature Climate Change",
    "abbr": "Nat Clim Chang",
    "impact": "29.6",
    "domain": "earth"
  },
  {
    "issn": "1752-0894",
    "name": "Nature Geoscience",
    "abbr": "Nat Geosci",
    "impact": "18.0",
    "domain": "earth"
  },
  {
    "issn": "0048-9697",
    "name": "Science of the Total Environment",
    "abbr": "Sci Total Environ",
    "impact": "8.2",
    "domain": "earth"
  },
  {
    "issn": "0013-936X",
    "name": "Environmental Science & Technology",
    "abbr": "Environ Sci Technol",
    "impact": "10.8",
    "domain": "earth"
  },
  {
    "issn": "0043-1354",
    "name": "Water Research",
    "abbr": "Water Res",
    "impact": "11.4",
    "domain": "earth"
  },
  {
    "issn": "0012-821X",
    "name": "Earth and Planetary Science Letters",
    "abbr": "Earth Planet Sci Lett",
    "impact": "4.8",
    "domain": "earth"
  },
  {
    "issn": "0094-8276",
    "name": "Geophysical Research Letters",
    "abbr": "Geophys Res Lett",
    "impact": "4.6",
    "domain": "earth"
  },
  {
    "issn": "0894-8755",
    "name": "Journal of Climate",
    "abbr": "",
    "impact": "4.1",
    "domain": "earth"
  },
  {
    "issn": "2398-9629",
    "name": "Nature Sustainability",
    "abbr": "Nat Sustain",
    "impact": "25.7",
    "domain": "earth"
  },
  {
    "issn": "1461-023X",
    "name": "Ecology Letters",
    "abbr": "Ecol Lett",
    "impact": "7.7",
    "domain": "earth"
  },
  {
    "issn": "1354-1013",
    "name": "Global Change Biology",
    "abbr": "Glob Chang Biol",
    "impact": "10.8",
    "domain": "earth"
  },
  {
    "issn": "0034-4257",
    "name": "Remote Sensing of Environment",
    "abbr": "Remote Sens Environ",
    "impact": "11.1",
    "domain": "earth"
  },
  {
    "issn": "2169-897X",
    "name": "Journal of Geophysical Research: Atmospheres",
    "abbr": "J Geophys Res Atmos",
    "impact": "3.8",
    "domain": "earth"
  },
  {
    "issn": "0269-7491",
    "name": "Environmental Pollution",
    "abbr": "Environ Pollut",
    "impact": "7.6",
    "domain": "earth"
  },
  {
    "issn": "0079-6611",
    "name": "Progress in Oceanography",
    "abbr": "Prog Oceanogr",
    "impact": "4.0",
    "domain": "earth"
  },
  {
    "issn": "0003-486X",
    "name": "Annals of Mathematics",
    "abbr": "Ann Math",
    "impact": "5.2",
    "domain": "math"
  },
  {
    "issn": "0894-0347",
    "name": "Journal of the American Mathematical Society",
    "abbr": "",
    "impact": "3.2",
    "domain": "math"
  },
  {
    "issn": "0020-9910",
    "name": "Inventiones Mathematicae",
    "abbr": "Invent Math",
    "impact": "3.1",
    "domain": "math"
  },
  {
    "issn": "0010-3640",
    "name": "Communications on Pure and Applied Mathematics",
    "abbr": "Commun Pure Appl Math",
    "impact": "3.4",
    "domain": "math"
  },
  {
    "issn": "0036-1429",
    "name": "SIAM Journal on Numerical Analysis",
    "abbr": "SIAM J Numer Anal",
    "impact": "2.6",
    "domain": "math"
  },
  {
    "issn": "0025-5718",
    "name": "Mathematics of Computation",
    "abbr": "Math Comput",
    "impact": "2.4",
    "domain": "math"
  },
  {
    "issn": "0022-0396",
    "name": "Journal of Differential Equations",
    "abbr": "J Differ Equ",
    "impact": "2.3",
    "domain": "math"
  },
  {
    "issn": "0001-8708",
    "name": "Advances in Mathematics",
    "abbr": "Adv Math (N Y)",
    "impact": "1.7",
    "domain": "math"
  },
  {
    "issn": "0090-5364",
    "name": "The Annals of Statistics",
    "abbr": "Ann Stat",
    "impact": "4.5",
    "domain": "math"
  },
  {
    "issn": "0162-1459",
    "name": "Journal of the American Statistical Association",
    "abbr": "J Am Stat Assoc",
    "impact": "3.0",
    "domain": "math"
  },
  {
    "issn": "0036-1445",
    "name": "SIAM Review",
    "abbr": "SIAM Rev Soc Ind Appl Math",
    "impact": "5.0",
    "domain": "math"
  },
  {
    "issn": "0025-5610",
    "name": "Mathematical Programming",
    "abbr": "Math Program",
    "impact": "2.5",
    "domain": "math"
  },
  {
    "issn": "0006-3444",
    "name": "Biometrika",
    "abbr": "Biometrika",
    "impact": "2.6",
    "domain": "math"
  }
]

/** 各领域高区分度特征词，用于按标题/摘要纠正分类 */
export const DOMAIN_SIGNALS: Record<string, string[]> = {
  "life": [
    "gene",
    "genom",
    "transcriptom",
    "proteom",
    "protein",
    "enzyme",
    "rna",
    "dna",
    "chromatin",
    "crispr",
    "knockout",
    "stem cell",
    "organoid",
    "neuron",
    "synap",
    "receptor",
    "signal transduction",
    "apoptosis",
    "mice",
    "mouse model",
    "in vivo",
    "bacteri",
    "microbi",
    "immune",
    "antibod",
    "biomarker",
    "sequencing",
    "phylogen"
  ],
  "medicine": [
    "patient",
    "clinical",
    "randomized",
    "placebo",
    "cohort",
    "diagnos",
    "therapy",
    "treatment outcome",
    "mortality",
    "hospital",
    "surgery",
    "vaccin",
    "infection",
    "syndrome",
    "cancer",
    "tumor",
    "oncolog",
    "cardiac",
    "diabet",
    "epidemi",
    "public health",
    "clinical trial",
    "comorbid"
  ],
  "pharm": [
    "pharmacokinet",
    "pharmacodynam",
    "pharmacolog",
    "drug delivery",
    "medicinal chemistry",
    "structure-activity",
    "lead compound",
    "dosage form",
    "formulation",
    "excipient",
    "bioavailability",
    "prodrug",
    "therapeutic drug monitoring",
    "adverse drug reaction",
    "herbal medicine",
    "natural product",
    "drug safety",
    "hepatotoxic",
    "nephrotoxic"
  ],
  "chemistry": [
    "synthesis",
    "catalys",
    "catalyst",
    "reagent",
    "solvent",
    "ligand",
    "nmr",
    "spectroscop",
    "chromatograph",
    "molecular orbital",
    "reaction mechanism",
    "stoichiometr",
    "enantioselect",
    "polymerization",
    "covalent"
  ],
  "physics": [
    "quantum",
    "photon",
    "laser",
    "electron beam",
    "magnetic field",
    "magnetometer",
    "spin",
    "superconduct",
    "thermal conductivity",
    "plasma",
    "neutrino",
    "gravitational",
    "optical",
    "dielectric",
    "ferroelectric",
    "antiferroelectric",
    "polariton",
    "solenoid"
  ],
  "materials": [
    "nanoparticle",
    "nanostructur",
    "thin film",
    "graphene",
    "perovskite",
    "alloy",
    "composite",
    "coating",
    "battery",
    "electrode",
    "tensile",
    "mechanical propert",
    "microstructure",
    "sintering",
    "hydrogel",
    "cathode",
    "electrolyte",
    "anode",
    "interphase",
    "solid-state"
  ],
  "cs": [
    "algorithm",
    "neural network",
    "deep learning",
    "machine learning",
    "dataset",
    "benchmark",
    "transformer",
    "segmentation",
    "natural language",
    "large language model",
    "computer vision",
    "style transfer",
    "generative adversarial",
    "diffusion model",
    "classification accuracy",
    "encryption",
    "blockchain",
    "compiler",
    "rendering",
    "embedding vector"
  ],
  "earth": [
    "climate",
    "carbon emission",
    "precipitation",
    "atmosphere",
    "ocean",
    "sea ice",
    "glacier",
    "geolog",
    "sediment",
    "earthquake",
    "ecosystem",
    "biodivers",
    "remote sensing",
    "land use",
    "groundwater",
    "aerosol"
  ],
  "math": [
    "theorem",
    "lemma",
    "proof",
    "algebraic",
    "topolog",
    "manifold",
    "differential equation",
    "numerical scheme",
    "convergence rate",
    "probability distribution",
    "bayesian inference",
    "stochastic process",
    "graph theory",
    "combinatorial"
  ]
}
