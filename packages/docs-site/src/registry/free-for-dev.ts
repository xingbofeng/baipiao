import type { DocsLocale } from "../i18n/index.js";

export type RegistryLocalization = {
  name?: string;
  description?: string;
  freeTierText?: string;
  status?: string;
  reviewStatus?: string;
  translatedAt?: string;
};

export type FreeForDevRegistryItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  sourceCategory: string;
  description: string;
  url: string;
  capability: string[];
  freeTierText: string;
  freeTierStatus: string;
  source: {
    id: string;
    url: string;
    rawUrl: string;
    importedAt: string;
  };
  rawExcerptRef: {
    path: string;
    lineStart: number;
    lineEnd: number;
  };
  confidence: string;
  reviewStatus: string;
  matchedServiceId: string | null;
  warnings: string[];
  enrichment?: {
    localization?: Partial<Record<DocsLocale, RegistryLocalization>>;
  };
};

export type FreeForDevRegistryData = {
  schemaVersion: string;
  generatedAt: string;
  source: {
    id: string;
    url: string;
    rawUrl: string;
    importedAt: string;
  };
  parser: Record<string, unknown>;
  stats: {
    categoryCount: number;
    parsedItemCount: number;
    skippedItemCount: number;
    warningCount: number;
  };
  items: FreeForDevRegistryItem[];
};

export type RegistryFilters = {
  query?: string;
  sourceCategory?: string;
  freeTierStatus?: string;
  reviewStatus?: string;
  locale?: DocsLocale;
};

export type RegistrySummary = {
  itemCount: number;
  sourceCategoryCount: number;
  freeTierCount: number;
  unknownTierCount: number;
  limitedFreeCount: number;
  needsReviewCount: number;
  warningCount: number;
  generatedAt: string;
  importedAt: string;
};

export type RegistrySourceCategory = {
  name: string;
  count: number;
};

export type LocalizedRegistryItem = FreeForDevRegistryItem & {
  displayName: string;
  displayDescription: string;
};

const popularServiceSlugs = [
  "vercel",
  "cloudflare",
  "supabase",
  "openrouter",
  "huggingface-co",
  "google-colab",
  "r2",
  "namecheap-com"
] as const;

export function buildRegistryViewModel(data: FreeForDevRegistryData): {
  summary: RegistrySummary;
  sourceCategories: RegistrySourceCategory[];
} {
  const sourceCategoryCounts = new Map<string, number>();
  let freeTierCount = 0;
  let unknownTierCount = 0;
  let limitedFreeCount = 0;
  let needsReviewCount = 0;

  for (const item of data.items) {
    sourceCategoryCounts.set(item.sourceCategory, (sourceCategoryCounts.get(item.sourceCategory) ?? 0) + 1);

    if (item.freeTierStatus === "free_tier") {
      freeTierCount += 1;
    } else if (item.freeTierStatus === "unknown") {
      unknownTierCount += 1;
    } else if (item.freeTierStatus === "limited_free") {
      limitedFreeCount += 1;
    }

    if (item.reviewStatus === "needs_review") {
      needsReviewCount += 1;
    }
  }

  const sourceCategories = [...sourceCategoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return {
    summary: {
      itemCount: data.items.length,
      sourceCategoryCount: sourceCategoryCounts.size,
      freeTierCount,
      unknownTierCount,
      limitedFreeCount,
      needsReviewCount,
      warningCount: data.stats.warningCount,
      generatedAt: data.generatedAt,
      importedAt: data.source.importedAt
    },
    sourceCategories: [{ name: "All services", count: data.items.length }, ...sourceCategories]
  };
}

export function getPopularRegistryItems(items: FreeForDevRegistryItem[]): FreeForDevRegistryItem[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  return popularServiceSlugs
    .map((slug) => bySlug.get(slug))
    .filter((item): item is FreeForDevRegistryItem => item !== undefined);
}

export function filterRegistryItems(items: FreeForDevRegistryItem[], filters: RegistryFilters): FreeForDevRegistryItem[] {
  const query = normalizeQuery(filters.query ?? "");
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const locale = filters.locale ?? "en";

  return items.filter((item) => {
    if (filters.sourceCategory && filters.sourceCategory !== "All services" && item.sourceCategory !== filters.sourceCategory) {
      return false;
    }

    if (filters.freeTierStatus && filters.freeTierStatus !== "all" && item.freeTierStatus !== filters.freeTierStatus) {
      return false;
    }

    if (filters.reviewStatus && filters.reviewStatus !== "all" && item.reviewStatus !== filters.reviewStatus) {
      return false;
    }

    if (queryTerms.length === 0) {
      return true;
    }

    const haystack = searchableText(item, locale);
    return queryTerms.every((term) => haystack.includes(term));
  });
}

export function getLocalizedRegistryItem(item: FreeForDevRegistryItem, locale: DocsLocale): LocalizedRegistryItem {
  const localization = item.enrichment?.localization?.[locale];
  const name = localization?.name?.trim() || item.name;
  const description = localization?.description?.trim() || item.description;
  const freeTierText = localization?.freeTierText?.trim() || item.freeTierText;

  return {
    ...item,
    name,
    description,
    freeTierText,
    displayName: name,
    displayDescription: description || freeTierText
  };
}

export function paginateRegistryItems<T>(items: T[], options: { page: number; pageSize: number }): {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} {
  const pageSize = Math.max(1, options.pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages
  };
}

export function getLocalizedSourceCategory(sourceCategory: string, locale: DocsLocale): string {
  return sourceCategoryTranslations[sourceCategory]?.[locale] ?? sourceCategory;
}

function searchableText(item: FreeForDevRegistryItem, locale: DocsLocale): string {
  const localized = getLocalizedRegistryItem(item, locale);
  return normalizeQuery([
    item.name,
    localized.name,
    localized.description,
    localized.freeTierText,
    item.slug,
    item.url,
    item.sourceCategory,
    getLocalizedSourceCategory(item.sourceCategory, locale),
    item.category,
    item.description,
    item.freeTierText,
    item.freeTierStatus,
    item.reviewStatus,
    ...item.capability,
    ...item.warnings
  ].join(" "));
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

const sourceCategoryTranslations: Record<string, Partial<Record<DocsLocale, string>>> = {
  "Major Cloud Providers": { "zh-CN": "主要云服务商", ja: "主要クラウドプロバイダー", ko: "주요 클라우드 제공업체", fr: "Principaux fournisseurs cloud", es: "Principales nubes" },
  "Cloud management solutions": { "zh-CN": "云管理方案", ja: "クラウド管理ソリューション", ko: "클라우드 관리 솔루션", fr: "Solutions de gestion cloud", es: "Soluciones de gestión cloud" },
  "Source Code Repos": { "zh-CN": "源码仓库", ja: "ソースコードリポジトリ", ko: "소스 코드 저장소", fr: "Dépôts de code source", es: "Repositorios de código" },
  "APIs, Data, and ML": { "zh-CN": "API、数据与机器学习", ja: "API・データ・機械学習", ko: "API, 데이터 및 ML", fr: "API, données et ML", es: "API, datos y ML" },
  "Artifact Repos": { "zh-CN": "制品仓库", ja: "アーティファクトリポジトリ", ko: "아티팩트 저장소", fr: "Dépôts d'artefacts", es: "Repositorios de artefactos" },
  "Tools for Teams and Collaboration": { "zh-CN": "团队协作工具", ja: "チーム・コラボレーション", ko: "팀 협업 도구", fr: "Outils d'équipe et collaboration", es: "Herramientas de equipo" },
  CMS: { "zh-CN": "内容管理系统", ja: "CMS", ko: "CMS", fr: "CMS", es: "CMS" },
  "Code Generation": { "zh-CN": "代码生成", ja: "コード生成", ko: "코드 생성", fr: "Génération de code", es: "Generación de código" },
  "Code Quality": { "zh-CN": "代码质量", ja: "コード品質", ko: "코드 품질", fr: "Qualité du code", es: "Calidad de código" },
  "Code Search and Browsing": { "zh-CN": "代码搜索与浏览", ja: "コード検索・閲覧", ko: "코드 검색 및 탐색", fr: "Recherche et navigation de code", es: "Búsqueda y exploración de código" },
  "CI and CD": { "zh-CN": "持续集成与交付", ja: "CI/CD", ko: "CI/CD", fr: "CI/CD", es: "CI/CD" },
  Testing: { "zh-CN": "测试", ja: "テスト", ko: "테스트", fr: "Tests", es: "Pruebas" },
  "Security and PKI": { "zh-CN": "安全与 PKI", ja: "セキュリティと PKI", ko: "보안 및 PKI", fr: "Sécurité et PKI", es: "Seguridad y PKI" },
  "Authentication, Authorization, and User Management": { "zh-CN": "认证、授权与用户管理", ja: "認証・認可・ユーザー管理", ko: "인증, 권한 및 사용자 관리", fr: "Authentification et gestion utilisateur", es: "Autenticación y usuarios" },
  "Mobile App Distribution and Feedback": { "zh-CN": "移动应用分发与反馈", ja: "モバイル配布・フィードバック", ko: "모바일 앱 배포 및 피드백", fr: "Distribution mobile et retours", es: "Distribución móvil y feedback" },
  "Management System": { "zh-CN": "管理系统", ja: "管理システム", ko: "관리 시스템", fr: "Systèmes de gestion", es: "Sistemas de gestión" },
  "Messaging and Streaming": { "zh-CN": "消息与流处理", ja: "メッセージング・ストリーミング", ko: "메시징 및 스트리밍", fr: "Messagerie et streaming", es: "Mensajería y streaming" },
  "Log Management": { "zh-CN": "日志管理", ja: "ログ管理", ko: "로그 관리", fr: "Gestion des logs", es: "Gestión de logs" },
  "Translation Management": { "zh-CN": "翻译管理", ja: "翻訳管理", ko: "번역 관리", fr: "Gestion de traduction", es: "Gestión de traducción" },
  Monitoring: { "zh-CN": "监控", ja: "監視", ko: "모니터링", fr: "Supervision", es: "Monitorización" },
  "Crash and Exception Handling": { "zh-CN": "崩溃与异常处理", ja: "クラッシュ・例外処理", ko: "크래시 및 예외 처리", fr: "Crashs et exceptions", es: "Fallos y excepciones" },
  Search: { "zh-CN": "搜索", ja: "検索", ko: "검색", fr: "Recherche", es: "Búsqueda" },
  "Education and Career Development": { "zh-CN": "教育与职业发展", ja: "教育・キャリア開発", ko: "교육 및 커리어 개발", fr: "Éducation et carrière", es: "Educación y carrera" },
  Email: { "zh-CN": "邮件", ja: "メール", ko: "이메일", fr: "E-mail", es: "Correo" },
  "Feature Toggles Management Platforms": { "zh-CN": "功能开关管理平台", ja: "機能フラグ管理", ko: "기능 플래그 관리", fr: "Gestion de feature flags", es: "Gestión de feature flags" },
  Font: { "zh-CN": "字体", ja: "フォント", ko: "폰트", fr: "Polices", es: "Fuentes" },
  Forms: { "zh-CN": "表单", ja: "フォーム", ko: "양식", fr: "Formulaires", es: "Formularios" },
  "Generative AI": { "zh-CN": "生成式 AI", ja: "生成 AI", ko: "생성형 AI", fr: "IA générative", es: "IA generativa" },
  "CDN and Protection": { "zh-CN": "CDN 与防护", ja: "CDN と保護", ko: "CDN 및 보호", fr: "CDN et protection", es: "CDN y protección" },
  PaaS: { "zh-CN": "PaaS", ja: "PaaS", ko: "PaaS", fr: "PaaS", es: "PaaS" },
  BaaS: { "zh-CN": "BaaS", ja: "BaaS", ko: "BaaS", fr: "BaaS", es: "BaaS" },
  "Low-code Platform": { "zh-CN": "低代码平台", ja: "ローコードプラットフォーム", ko: "로우코드 플랫폼", fr: "Plateformes low-code", es: "Plataformas low-code" },
  "Web Hosting": { "zh-CN": "Web 托管", ja: "Web ホスティング", ko: "웹 호스팅", fr: "Hébergement web", es: "Hosting web" },
  DNS: { "zh-CN": "DNS", ja: "DNS", ko: "DNS", fr: "DNS", es: "DNS" },
  Domain: { "zh-CN": "域名", ja: "ドメイン", ko: "도메인", fr: "Domaines", es: "Dominios" },
  IaaS: { "zh-CN": "IaaS", ja: "IaaS", ko: "IaaS", fr: "IaaS", es: "IaaS" },
  "Managed Data Services": { "zh-CN": "托管数据服务", ja: "マネージドデータサービス", ko: "관리형 데이터 서비스", fr: "Services de données managés", es: "Servicios de datos gestionados" },
  "Tunneling, WebRTC, Web Socket Servers and Other Routers": { "zh-CN": "隧道、WebRTC、WebSocket 与路由", ja: "トンネル・WebRTC・WebSocket", ko: "터널, WebRTC, WebSocket", fr: "Tunnels, WebRTC et WebSocket", es: "Túneles, WebRTC y WebSocket" },
  "Issue Tracking and Project Management": { "zh-CN": "问题跟踪与项目管理", ja: "課題管理・プロジェクト管理", ko: "이슈 추적 및 프로젝트 관리", fr: "Suivi d'incidents et projet", es: "Issues y gestión de proyectos" },
  "Storage and Media Processing": { "zh-CN": "存储与媒体处理", ja: "ストレージ・メディア処理", ko: "스토리지 및 미디어 처리", fr: "Stockage et traitement média", es: "Almacenamiento y medios" },
  "Design and UI": { "zh-CN": "设计与 UI", ja: "デザイン・UI", ko: "디자인 및 UI", fr: "Design et UI", es: "Diseño y UI" },
  "Data Visualization on Maps": { "zh-CN": "地图数据可视化", ja: "地図データ可視化", ko: "지도 데이터 시각화", fr: "Visualisation cartographique", es: "Visualización en mapas" },
  "Package Build System": { "zh-CN": "包构建系统", ja: "パッケージビルド", ko: "패키지 빌드 시스템", fr: "Systèmes de build de paquets", es: "Build de paquetes" },
  "IDE and Code Editing": { "zh-CN": "IDE 与代码编辑", ja: "IDE・コード編集", ko: "IDE 및 코드 편집", fr: "IDE et édition de code", es: "IDE y edición de código" },
  "Analytics, Events and Statistics": { "zh-CN": "分析、事件与统计", ja: "分析・イベント・統計", ko: "분석, 이벤트 및 통계", fr: "Analytics, événements et stats", es: "Analítica, eventos y estadísticas" },
  "Visitor Session Recording": { "zh-CN": "访客会话录制", ja: "訪問者セッション録画", ko: "방문자 세션 녹화", fr: "Enregistrement de sessions", es: "Grabación de sesiones" },
  "International Mobile Number Verification API and SDK": { "zh-CN": "国际手机号验证 API 与 SDK", ja: "国際電話番号検証 API・SDK", ko: "국제 휴대폰 인증 API 및 SDK", fr: "API et SDK de vérification mobile", es: "API y SDK de verificación móvil" },
  "Payment and Billing Integration": { "zh-CN": "支付与账单集成", ja: "決済・請求連携", ko: "결제 및 청구 연동", fr: "Paiement et facturation", es: "Pagos y facturación" },
  "Docker Related": { "zh-CN": "Docker 相关", ja: "Docker 関連", ko: "Docker 관련", fr: "Autour de Docker", es: "Relacionado con Docker" },
  "Dev Blogging Sites": { "zh-CN": "开发者博客平台", ja: "開発者ブログ", ko: "개발자 블로그 플랫폼", fr: "Blogs développeurs", es: "Blogs para desarrolladores" },
  "Commenting Platforms": { "zh-CN": "评论平台", ja: "コメント平台", ko: "댓글 플랫폼", fr: "Plateformes de commentaires", es: "Plataformas de comentarios" },
  "Screenshot APIs": { "zh-CN": "截图 API", ja: "スクリーンショット API", ko: "스크린샷 API", fr: "API de captures d'écran", es: "API de capturas" },
  "Flutter Related and Building IOS Apps without Mac": { "zh-CN": "Flutter 与免 Mac 构建 iOS 应用", ja: "Flutter と Mac なし iOS ビルド", ko: "Flutter 및 Mac 없는 iOS 빌드", fr: "Flutter et build iOS sans Mac", es: "Flutter y builds iOS sin Mac" },
  "Privacy Management": { "zh-CN": "隐私管理", ja: "プライバシー管理", ko: "개인정보 관리", fr: "Gestion de la confidentialité", es: "Gestión de privacidad" },
  Miscellaneous: { "zh-CN": "其他杂项", ja: "その他", ko: "기타", fr: "Divers", es: "Miscelánea" },
  "Remote Desktop Tools": { "zh-CN": "远程桌面工具", ja: "リモートデスクトップ", ko: "원격 데스크톱 도구", fr: "Bureau à distance", es: "Escritorio remoto" },
  "Other Free Resources": { "zh-CN": "其他白嫖资源", ja: "その他の無料リソース", ko: "기타 무료 리소스", fr: "Autres ressources gratuites", es: "Otros recursos gratis" }
};
