import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { headingToId, markdownToPlainText, renderMarkdown, stripFrontMatter } from "./docs/markdown.js";
import { docsPages, type DocsPageSlug } from "./i18n/content.js";
import { docsLocales, type DocsLocale } from "./i18n/index.js";
import {
  buildRegistryViewModel,
  filterRegistryItems,
  getLocalizedSourceCategory,
  getLocalizedRegistryItem,
  getPopularRegistryItems,
  paginateRegistryItems,
  type FreeForDevRegistryData,
  type FreeForDevRegistryItem,
  type LocalizedRegistryItem,
  type RegistrySourceCategory,
  type RegistrySummary
} from "./registry/free-for-dev.js";
import cliDocEn from "../content/en/cli.md?raw";
import mcpDocEn from "../content/en/mcp.md?raw";
import indexDocEn from "../content/en/index.md?raw";
import registryDocEn from "../content/en/registry.md?raw";
import cliDocEs from "../content/es/cli.md?raw";
import mcpDocEs from "../content/es/mcp.md?raw";
import indexDocEs from "../content/es/index.md?raw";
import registryDocEs from "../content/es/registry.md?raw";
import cliDocFr from "../content/fr/cli.md?raw";
import mcpDocFr from "../content/fr/mcp.md?raw";
import indexDocFr from "../content/fr/index.md?raw";
import registryDocFr from "../content/fr/registry.md?raw";
import cliDocJa from "../content/ja/cli.md?raw";
import mcpDocJa from "../content/ja/mcp.md?raw";
import indexDocJa from "../content/ja/index.md?raw";
import registryDocJa from "../content/ja/registry.md?raw";
import cliDocKo from "../content/ko/cli.md?raw";
import mcpDocKo from "../content/ko/mcp.md?raw";
import indexDocKo from "../content/ko/index.md?raw";
import registryDocKo from "../content/ko/registry.md?raw";
import cliDocZh from "../content/zh-CN/cli.md?raw";
import mcpDocZh from "../content/zh-CN/mcp.md?raw";
import indexDocZh from "../content/zh-CN/index.md?raw";
import registryDocZh from "../content/zh-CN/registry.md?raw";

const defaultLocale: DocsLocale = "zh-CN";
const fallbackLocale: DocsLocale = "en";
const docsBasePath = normalizeBasePath(import.meta.env.BASE_URL ?? "/");

const localeOptions: Array<{ locale: DocsLocale; label: string; shortLabel: string }> = [
  { locale: "zh-CN", label: "中文", shortLabel: "中文" },
  { locale: "en", label: "English", shortLabel: "EN" },
  { locale: "ja", label: "日本語", shortLabel: "JA" },
  { locale: "ko", label: "한국어", shortLabel: "KO" },
  { locale: "fr", label: "Français", shortLabel: "FR" },
  { locale: "es", label: "Español", shortLabel: "ES" }
];

const navItems = [
  { slug: "index", label: { "zh-CN": "快速开始", en: "Quick Start", ja: "クイックスタート", ko: "빠른 시작", fr: "Démarrage rapide", es: "Inicio rápido" } },
  { slug: "registry", label: { "zh-CN": "白嫖数据", en: "Registry", ja: "レジストリ", ko: "레지스트리", fr: "Registre", es: "Registro" } },
  { slug: "cli", label: { "zh-CN": "CLI", en: "CLI", ja: "CLI", ko: "CLI", fr: "CLI", es: "CLI" } },
  { slug: "mcp", label: { "zh-CN": "MCP", en: "MCP", ja: "MCP", ko: "MCP", fr: "MCP", es: "MCP" } }
] as const;

const setupCommandsForCopy = [
  "baipiao init",
  "baipiao search llm",
  "baipiao setup groq",
  "baipiao mcp install claude",
  "baipiao env generate"
].join("\n");

const setupCommandsForDisplay = setupCommandsForCopy
  .split("\n")
  .map((command) => `$ ${command}`)
  .join("\n");

type CommandCard = {
  label: string;
  title: string;
  commands: readonly string[];
  copyLabel: string;
};

type HubCard = {
  slug: DocsPageSlug;
  title: string;
  description: string;
  mark: string;
};

type LandingStep = readonly [string, string, string];

type LandingCopy = {
  heroTitle: string;
  heroSubtitle: string;
  commandCards: readonly CommandCard[];
  quickStartCta: string;
  registryCta: string;
  integrationCta: string;
  points: readonly string[];
  docsHubTitle: string;
  docsHubDescription: string;
  docsHubCards: readonly HubCard[];
  workflowTitle: string;
  workflowSteps: readonly LandingStep[];
  guardrailsTitle: string;
  guardrails: readonly LandingStep[];
  heroAria: string;
  docsHubKicker: string;
  statusGridAria: string;
  breadcrumb: string;
  copyStatusText: {
    setupCommands: string;
    status: string;
  };
  copySuccessText: string;
  sidebar: {
    title: string;
    docsLink: string;
    status: string;
    source: string;
    product: string;
    code: string;
    getStarted: string;
  };
  docsChrome: {
    docsLabel: string;
    mobileSummary: string;
    paginationAria: string;
    previous: string;
    next: string;
    onThisPage: string;
  };
  search: {
    trigger: string;
    triggerAria: string;
    placeholder: string;
    dialogAria: string;
    closeAria: string;
    empty: string;
  };
  navAria: string;
  homeAria: string;
  languageAria: string;
  githubAria: string;
  footerThanks: string;
  statusSummary: readonly string[];
};

const markdownDocs: Record<DocsLocale, Record<DocsPageSlug, string>> = {
  "zh-CN": {
    index: indexDocZh,
    cli: cliDocZh,
    mcp: mcpDocZh,
    registry: registryDocZh
  },
  en: {
    index: indexDocEn,
    cli: cliDocEn,
    mcp: mcpDocEn,
    registry: registryDocEn
  },
  ja: {
    index: indexDocJa,
    cli: cliDocJa,
    mcp: mcpDocJa,
    registry: registryDocJa
  },
  ko: {
    index: indexDocKo,
    cli: cliDocKo,
    mcp: mcpDocKo,
    registry: registryDocKo
  },
  fr: {
    index: indexDocFr,
    cli: cliDocFr,
    mcp: mcpDocFr,
    registry: registryDocFr
  },
  es: {
    index: indexDocEs,
    cli: cliDocEs,
    mcp: mcpDocEs,
    registry: registryDocEs
  }
};


export function App() {
  return renderAppForPath(window.location.pathname);
}

export function renderAppForPath(path: string): ReactElement {
  const appPath = stripBasePath(path);
  const isDocs = appPath.startsWith("/docs");
  const locale = isDocs ? resolveDocsRoute(appPath).locale : resolveLandingLocale(appPath);

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentPath={appPath} />
      {isDocs ? <DocsPage path={appPath} /> : <LandingPage locale={locale} />}
    </div>
  );
}

function SiteHeader(props: { locale: DocsLocale; currentPath: string }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const copy = getLandingCopy(props.locale);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="site-header">
        <a className="brand-lockup" href={landingHref(props.locale)} aria-label={copy.homeAria}>
          <span className="brand-mark" aria-hidden="true">&gt;_</span>
          <span className="brand-text">{props.locale === defaultLocale ? "白嫖" : "baipiao"}</span>
        </a>
        <nav aria-label={copy.navAria}>
          {navItems.map((item) => (
            <a key={item.slug} href={docsHref(item.slug, props.locale)}>{item.label[props.locale]}</a>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="search-control search-trigger"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label={copy.search.triggerAria}
          >
            <span>{copy.search.trigger}</span>
            <kbd>⌘K</kbd>
          </button>
          <details className="locale-menu">
            <summary aria-label={copy.languageAria}>
              {localeShortLabel(props.locale)}
            </summary>
            <div className="locale-menu-panel">
              {localeOptions.map((option) => (
                <a
                  aria-current={option.locale === props.locale ? "true" : undefined}
                  href={localizedHref(props.currentPath, option.locale)}
                  key={option.locale}
                >
                  <span>{option.label}</span>
                  <code>{option.shortLabel}</code>
                </a>
              ))}
            </div>
          </details>
          <a
            href="https://github.com/xingbofeng/baipiao"
            className="github-link"
            aria-label={copy.githubAria}
            title={copy.githubAria}
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 .5a11.5 11.5 0 0 0-3.63 22.4c.57.1.78-.25.78-.56v-2.02c-3.18.7-3.85-1.53-3.85-1.53-.52-1.3-1.27-1.64-1.27-1.64-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.52-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.54.12-3.21 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.67.24 2.9.12 3.21.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.62-5.48 5.92.41.36.78 1.08.78 2.17v3.22c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
          </a>
        </div>
      </header>
      {isSearchOpen ? (
        <SearchDialog
          locale={props.locale}
          onClose={() => setIsSearchOpen(false)}
        />
      ) : undefined}
    </>
  );
}

function SearchDialog(props: { locale: DocsLocale; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [registryData, setRegistryData] = useState<FreeForDevRegistryData | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => getSearchResults(query, props.locale, registryData), [props.locale, query, registryData]);
  const copy = getLandingCopy(props.locale);
  const registryDataUrl = baseHref("/registry/free-for-dev/normalized.json");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch(registryDataUrl)
      .then((response) => response.ok ? response.json() as Promise<FreeForDevRegistryData> : undefined)
      .then((nextData) => {
        if (isMounted && nextData) {
          setRegistryData(nextData);
        }
      })
      .catch(() => {
        // Search still works for docs if the registry JSON is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, [registryDataUrl]);

  return (
    <div
      className="search-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      }}
    >
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={copy.search.dialogAria}
      >
        <div className="search-dialog-input">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search.placeholder}
          />
          <button type="button" className="search-close" onClick={props.onClose} aria-label={copy.search.closeAria}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z" />
            </svg>
          </button>
        </div>
        <div className="search-results" role="list">
          {results.map((result) => (
            <a
              className="search-result"
              href={result.href}
              key={result.href}
              onClick={props.onClose}
              role="listitem"
            >
              <span>
                <strong>{result.title}</strong>
              </span>
              <p>{result.excerpt}</p>
            </a>
          ))}
          {results.length === 0 ? (
            <p className="search-empty">{copy.search.empty}</p>
          ) : undefined}
        </div>
      </section>
    </div>
  );
}

function LandingPage(props: { locale: DocsLocale }) {
  const copy = getLandingCopy(props.locale);

  return (
    <main className="landing">
      <section className="hero" data-scroll-section="hero">
        <div className="hero-copy">
          <h1>{props.locale === defaultLocale ? "白嫖" : "baipiao"}</h1>
          <p className="hero-title">{copy.heroTitle}</p>
          <p className="hero-subtitle">{copy.heroSubtitle}</p>
          <div className="install-commands" aria-label={copy.heroAria}>
            {copy.commandCards.map((card) => (
              <div className={`install-command ${card.label.toLowerCase()}`} key={card.label}>
                <div className="install-command-header">
                  <span>{card.label}</span>
                  <small>{card.title}</small>
                  <CopyButton value={card.commands.join("\n")} label={card.copyLabel} successLabel={copy.copySuccessText} />
                </div>
                <code>{card.commands.join("\n")}</code>
              </div>
            ))}
          </div>
          <div className="cta-row">
            <a className="button primary" href={docsHref("index", props.locale)}>
              <span>{copy.quickStartCta}</span>
            </a>
            <a className="button secondary terminal-button" href={docsHref("registry", props.locale)}>
              <span>{copy.registryCta}</span>
            </a>
            <a className="button secondary terminal-button mcp-button" href={docsHref("cli", props.locale)}>
              <span>{copy.integrationCta}</span>
            </a>
          </div>
          <div className="hero-points" aria-label={copy.statusGridAria}>
            {copy.points.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>
        <div className="hero-preview">
          <img
            src={baseHref("/assets/cli-preview.gif")}
            alt="CLI Preview: baipiao init, search llm, setup groq, env generate, test groq"
            className="cli-preview-gif"
          />
        </div>
      </section>

      <section className="docs-hub" data-scroll-section="docs-hub" aria-labelledby="docs-hub-title">
        <div className="section-heading">
          <p className="terminal-kicker">{copy.docsHubKicker}</p>
          <h2 id="docs-hub-title">{copy.docsHubTitle}</h2>
          <p>{copy.docsHubDescription}</p>
        </div>
        <div className="hub-grid">
          {copy.docsHubCards.map((card) => (
            <a className="hub-card" href={docsHref(card.slug, props.locale)} key={card.slug}>
              <span className="card-mark">{card.mark}</span>
              <strong>{card.title}</strong>
              <span>{card.description}</span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </section>

      <section className="status-grid" data-scroll-section="status-grid" aria-label={copy.statusGridAria}>
        <section className="info-panel workflow-panel green">
          <p className="panel-kicker">&gt; NEXT</p>
          <h2>{copy.workflowTitle}</h2>
          <div className="workflow-steps">
            {copy.workflowSteps.map(([index, title, description]) => (
              <div className="workflow-step" key={index}>
                <code>{index}</code>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="info-panel guardrail-panel cyan">
          <p className="panel-kicker">SAFE BY DEFAULT</p>
          <h2>{copy.guardrailsTitle}</h2>
          <div className="guardrail-list">
            {copy.guardrails.map(([name, state, description]) => (
              <div className="guardrail-row" key={name}>
                <code>{name}</code>
                <strong>{state}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <div className="capability-strip" aria-label="baipiao capability summary">
            {copy.statusSummary.map((status) => (
              <span key={status}>{status}</span>
            ))}
          </div>
        </section>
      </section>
      <SiteFooter locale={props.locale} />
    </main>
  );
}

function SiteFooter(props: { locale: DocsLocale }) {
  const copy = getLandingCopy(props.locale);
  return (
    <footer className="site-footer">
      <span>{copy.footerThanks}</span>
      <span>MIT License</span>
      <a href="https://github.com/xingbofeng/baipiao">GitHub</a>
    </footer>
  );
}

function CopyButton(props: { value: string; label: string; successLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const successLabel = props.successLabel ?? "复制成功";

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    setCopied(true);
    copyText(props.value);
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      className={`copy-icon-button${copied ? " copied" : ""}`}
      type="button"
      onClick={handleCopy}
      aria-label={copied ? successLabel : props.label}
      title={copied ? successLabel : props.label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7.5A2.5 2.5 0 0 1 10.5 5H18a2.5 2.5 0 0 1 2.5 2.5V15A2.5 2.5 0 0 1 18 17.5h-7.5A2.5 2.5 0 0 1 8 15V7.5Zm2.5-.5a.5.5 0 0 0-.5.5V15a.5.5 0 0 0 .5.5H18a.5.5 0 0 0 .5-.5V7.5A.5.5 0 0 0 18 7h-7.5ZM5.5 9A.5.5 0 0 0 5 9.5V18a1 1 0 0 0 1 1h8.5a.5.5 0 0 0 .5-.5v-.25h2v.25A2.5 2.5 0 0 1 14.5 21H6a3 3 0 0 1-3-3V9.5A2.5 2.5 0 0 1 5.5 7H6v2h-.5Z" />
      </svg>
      <span className="copy-success" role="status" aria-hidden={!copied} aria-live="polite">
        {successLabel}
      </span>
    </button>
  );
}

function DocsPage(props: { path: string }) {
  const route = resolveDocsRoute(props.path);
  const pages = docsPages[route.locale];
  const currentIndex = pages.findIndex((page) => page.slug === route.slug);
  const current = pages[currentIndex] ?? requiredIndexPage();
  const previous = currentIndex > 0 ? pages[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 ? pages[currentIndex + 1] : undefined;
  const tocItems = useMemo(() => getToc(current.slug, route.locale), [current.slug, route.locale]);
  const copy = getLandingCopy(route.locale);
  const [activeTocId, setActiveTocId] = useState(tocItems[0]?.id ?? "");
  const [tocScrollbar, setTocScrollbar] = useState({ height: 0, top: 0, visible: false });
  const tocRef = useRef<HTMLElement>(null);

  const updateTocScrollbar = () => {
    const tocElement = tocRef.current;
    if (!tocElement) {
      return;
    }

    const scrollableHeight = tocElement.scrollHeight - tocElement.clientHeight;
    if (scrollableHeight <= 1) {
      setTocScrollbar({ height: 0, top: 0, visible: false });
      return;
    }

    const thumbHeight = Math.max(44, Math.round((tocElement.clientHeight / tocElement.scrollHeight) * tocElement.clientHeight));
    const maxThumbTop = tocElement.clientHeight - thumbHeight;
    const thumbTop = Math.round((tocElement.scrollTop / scrollableHeight) * maxThumbTop);
    setTocScrollbar({ height: thumbHeight, top: thumbTop, visible: true });
  };

  useEffect(() => {
    const firstTocId = tocItems[0]?.id ?? "";
    const syncActiveHeading = () => {
      const headings = tocItems
        .map((item) => document.getElementById(item.id))
        .filter((heading): heading is HTMLElement => heading !== null);

      if (headings.length === 0) {
        setActiveTocId(firstTocId);
        return;
      }

      const activationLine = 118;
      const activeHeading = headings.reduce((currentHeading, heading) => {
        return heading.getBoundingClientRect().top <= activationLine ? heading : currentHeading;
      }, headings[0]!);

      setActiveTocId(activeHeading.id);
    };

    syncActiveHeading();
    window.addEventListener("hashchange", syncActiveHeading);
    window.addEventListener("scroll", syncActiveHeading, { passive: true });

    return () => {
      window.removeEventListener("hashchange", syncActiveHeading);
      window.removeEventListener("scroll", syncActiveHeading);
    };
  }, [current.slug, route.locale, tocItems]);

  useEffect(() => {
    updateTocScrollbar();
    window.addEventListener("resize", updateTocScrollbar);

    return () => {
      window.removeEventListener("resize", updateTocScrollbar);
    };
  }, [current.slug, route.locale, tocItems]);

  useEffect(() => {
    if (!activeTocId) {
      return;
    }

    const tocElement = tocRef.current;
    const activeLink = tocElement?.querySelector<HTMLElement>(`[data-toc-id="${activeTocId}"]`);
    if (!tocElement || !activeLink) {
      return;
    }

    const stickyHeaderOffset = 56;
    const lowerPadding = 96;
    const linkTop = activeLink.offsetTop;
    const linkBottom = linkTop + activeLink.offsetHeight;
    const visibleTop = tocElement.scrollTop + stickyHeaderOffset;
    const visibleBottom = tocElement.scrollTop + tocElement.clientHeight - lowerPadding;

    if (linkTop < visibleTop) {
      tocElement.scrollTo({ top: Math.max(0, linkTop - stickyHeaderOffset), behavior: "smooth" });
    } else if (linkBottom > visibleBottom) {
      tocElement.scrollTo({ top: linkBottom - tocElement.clientHeight + lowerPadding, behavior: "smooth" });
    }
    window.setTimeout(updateTocScrollbar, 180);
  }, [activeTocId]);

  useEffect(() => {
    const handleCopyCode = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLButtonElement>("[data-copy-code]");
      if (!button) {
        return;
      }

      const originalLabel = getDocsCodeCopyLabel(route.locale);
      const copiedLabel = getDocsCodeCopySuccessLabel(route.locale);
      copyText(button.dataset.copyCode ?? "");
      button.classList.add("copied");
      button.textContent = copiedLabel;
      window.setTimeout(() => {
        button.classList.remove("copied");
        button.textContent = originalLabel;
      }, 1400);
    };

    document.addEventListener("click", handleCopyCode);
    return () => document.removeEventListener("click", handleCopyCode);
  }, [route.locale]);

  if (current.slug === "registry") {
    return <RegistryDocsPage locale={route.locale} />;
  }

  return (
    <>
      <main className="docs-layout">
        <aside className="sidebar">
        <div className="sidebar-title">{copy.sidebar.title}</div>
        {pages.map((page) => (
          <a
            key={page.slug}
            className={page.slug === current.slug ? "active" : ""}
            href={docsHref(page.slug, route.locale)}
            aria-current={page.slug === current.slug ? "page" : undefined}
          >
            <span className="nav-mark">{getNavMark(page.slug)}</span>
            <span>
              {getSidebarLabel(page.slug, route.locale)}
            </span>
          </a>
        ))}
        <DocsUtilityCards locale={route.locale} />
      </aside>

      <article className="doc-content">
        <details className="mobile-nav">
          <summary>{copy.docsChrome.mobileSummary}</summary>
          {pages.map((page) => (
            <a key={page.slug} href={docsHref(page.slug, route.locale)}>{page.title}</a>
          ))}
        </details>
        <div className="mobile-doc-tools">
          <DocsUtilityCards locale={route.locale} />
        </div>
        <div className="breadcrumb">{copy.breadcrumb} {current.slug}</div>
        <div className="doc-title-row">
          <div>
            <h1>{current.title}</h1>
            <p>{getDocDescription(current.slug, route.locale)}</p>
          </div>
          {current.translationStatus !== "translated" ? (
            <span className="badge warning">{current.translationStatus}</span>
          ) : undefined}
        </div>
        <div className="badge-row">
          <span className="badge">baipiao</span>
          <span className="badge cyan">Prompt-first</span>
          <span className="badge purple">MCP integration</span>
        </div>
        <section
          className="doc-markdown"
          dangerouslySetInnerHTML={{ __html: renderDocBody(current.slug, route.locale) }}
        />
        <nav className="pager" aria-label={copy.docsChrome.paginationAria}>
          {previous ? <a href={docsHref(previous.slug, route.locale)}>{copy.docsChrome.previous}{getSidebarLabel(previous.slug, route.locale)}</a> : <span />}
          {next ? <a href={docsHref(next.slug, route.locale)}>{copy.docsChrome.next}{getSidebarLabel(next.slug, route.locale)} →</a> : <span />}
        </nav>
      </article>

        <aside className="toc" ref={tocRef} onScroll={updateTocScrollbar}>
        <span>{current.title}</span>
        {tocItems.map((item, index) => (
          <a
            className={item.id === activeTocId ? "active" : ""}
            data-toc-id={item.id}
            href={`#${item.id}`}
            key={item.id}
            onClick={() => setActiveTocId(item.id)}
            aria-current={item.id === activeTocId ? "location" : undefined}
          >
            <span className="toc-link-index">{index + 1}.</span>
            <span className="toc-link-label">{item.label}</span>
          </a>
        ))}
        <div className="toc-card">
          <strong>{copy.sidebar.source}</strong>
          <dl>
            <div>
              <dt>{copy.sidebar.product}</dt>
              <dd>docs/PRD.md</dd>
            </div>
            <div>
              <dt>{copy.sidebar.code}</dt>
              <dd>packages/cli / packages/mcp-server / packages/core</dd>
            </div>
          </dl>
          <a href={docsHref("cli", route.locale)}>{copy.sidebar.docsLink}</a>
        </div>
        {tocScrollbar.visible ? (
          <div className="toc-scrollbar" aria-hidden="true">
            <i style={{ height: tocScrollbar.height, transform: `translateY(${tocScrollbar.top}px)` }} />
          </div>
        ) : undefined}
        </aside>
      </main>
      <SiteFooter locale={route.locale} />
    </>
  );
}

function DocsUtilityCards(props: { locale: DocsLocale }) {
  const copy = getLandingCopy(props.locale);
  return (
    <>
      <div className="sidebar-card">
        <div className="sidebar-card-heading">
          <strong>{copy.sidebar.getStarted}</strong>
          <CopyButton
            value={setupCommandsForCopy}
            label={copy.copyStatusText.setupCommands}
            successLabel={copy.copySuccessText}
          />
        </div>
        <code>{setupCommandsForDisplay}</code>
        <a href={docsHref("cli", props.locale)}>{copy.sidebar.docsLink}</a>
      </div>
      <div className="sidebar-status">
        <div className="sidebar-card-heading">
          <strong>{copy.sidebar.status}</strong>
          <CopyButton
            value={copy.statusSummary.join("\n")}
            label={copy.copyStatusText.status}
            successLabel={copy.copySuccessText}
          />
        </div>
        {copy.statusSummary.map((status) => (
          <span key={status}>{status}</span>
        ))}
      </div>
    </>
  );
}

function RegistryDocsPage(props: { locale: DocsLocale }) {
  const copy = getRegistryCopy(props.locale);
  const dataUrl = baseHref("/registry/free-for-dev/normalized.json");
  const [data, setData] = useState<FreeForDevRegistryData | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState(() => getInitialRegistryQuery());
  const [sourceCategory, setSourceCategory] = useState("All services");
  const [freeTierStatus, setFreeTierStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const pageSize = 50;

  useEffect(() => {
    let isMounted = true;
    setError(undefined);

    fetch(dataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load registry JSON: ${response.status}`);
        }
        return response.json() as Promise<FreeForDevRegistryData>;
      })
      .then((nextData) => {
        if (isMounted) {
          setData(nextData);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : copy.loadError);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, dataUrl]);

  const viewModel = useMemo(() => data ? buildRegistryViewModel(data) : undefined, [data]);
  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return filterRegistryItems(data.items, {
      query,
      sourceCategory,
      freeTierStatus,
      locale: props.locale
    });
  }, [data, freeTierStatus, props.locale, query, sourceCategory]);
  const popularItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return getPopularRegistryItems(data.items).map((item) => getLocalizedRegistryItem(item, props.locale));
  }, [data, props.locale]);
  const pageItems = useMemo(() => paginateRegistryItems(filteredItems, { page, pageSize }), [filteredItems, page]);
  const selectedItem = useMemo(() => {
    const selected = filteredItems.find((item) => item.id === selectedItemId) ?? pageItems.items[0];
    return selected ? getLocalizedRegistryItem(selected, props.locale) : undefined;
  }, [filteredItems, pageItems.items, props.locale, selectedItemId]);

  useEffect(() => {
    setPage(1);
  }, [freeTierStatus, query, sourceCategory]);

  useEffect(() => {
    if (!selectedItemId && pageItems.items[0]) {
      setSelectedItemId(pageItems.items[0].id);
    }
  }, [pageItems.items, selectedItemId]);

  return (
    <main className="registry-layout" data-source={dataUrl}>
      <aside className="registry-category-rail" aria-label={copy.categoryRailLabel}>
        <div className="registry-rail-title">{copy.railTitle}</div>
        <label className="sr-only" htmlFor="registry-category-search">{copy.categorySearch}</label>
        <input
          className="registry-category-search"
          id="registry-category-search"
          placeholder={copy.categorySearch}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="registry-category-list">
          {(viewModel?.sourceCategories ?? [{ name: "All services", count: 0 }]).slice(0, 58).map((category) => (
            <button
              className={category.name === sourceCategory ? "active" : ""}
              key={category.name}
              type="button"
              onClick={() => setSourceCategory(category.name)}
            >
              <span>{getRegistryCategoryLabel(category, copy, props.locale)}</span>
              <small>{formatCount(category.count, props.locale)}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="registry-main">
        <div className="breadcrumb">{getLandingCopy(props.locale).breadcrumb} registry</div>
        <div className="registry-title-row">
          <div>
            <p className="terminal-kicker">&gt;_ {copy.title}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
        </div>

        <RegistrySummaryStrip summary={viewModel?.summary} locale={props.locale} copy={copy} />
        <RegistryPopularStrip
          items={popularItems}
          copy={copy}
          locale={props.locale}
          onSelect={(item) => {
            setSourceCategory("All services");
            setFreeTierStatus("all");
            setQuery(item.name);
            setSelectedItemId(item.id);
          }}
        />

        <div className="registry-toolbar">
          <label className="registry-search">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              type="search"
              value={query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <RegistryFilterGroup
            ariaLabel={copy.tierFilter}
            value={freeTierStatus}
            onChange={setFreeTierStatus}
            options={["all", "free_tier", "limited_free", "unknown"].map((value) => ({ value, label: copy.tierLabels[value] ?? value }))}
          />
        </div>

        <div className="registry-result-meta">
          <span>{data ? copy.resultCount.replace("{count}", formatCount(filteredItems.length, props.locale)) : copy.loading}</span>
          <span>{copy.pageMeta.replace("{page}", String(pageItems.page)).replace("{pages}", String(pageItems.totalPages))}</span>
        </div>

        <div className="registry-table" role="table" aria-label={copy.tableLabel}>
          <div className="registry-table-head" role="row">
            <span>{copy.columns.name}</span>
            <span>{copy.columns.category}</span>
            <span>{copy.columns.tier}</span>
          </div>
          <div className="registry-table-body">
            {!data ? (
              <div className="registry-loading">{error ?? `${copy.loading} ${dataUrl}`}</div>
            ) : pageItems.items.length > 0 ? (
              pageItems.items.map((item) => {
                const localizedItem = getLocalizedRegistryItem(item, props.locale);
                return (
                  <button
                    className={`registry-row${item.id === selectedItem?.id ? " active" : ""}`}
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <span className="registry-name-cell">
                      <strong>{localizedItem.displayName}</strong>
                      <small>{localizedItem.displayDescription || item.url}</small>
                    </span>
                    <span>{getLocalizedSourceCategory(item.sourceCategory, props.locale)}</span>
                    <RegistryStatusBadge value={copy.tierLabels[item.freeTierStatus] ?? item.freeTierStatus} tone={item.freeTierStatus === "free_tier" ? "green" : "warning"} />
                  </button>
                );
              })
            ) : (
              <div className="registry-loading">{copy.empty}</div>
            )}
          </div>
          <div className="registry-pager">
            <button type="button" disabled={pageItems.page <= 1} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}>
              {copy.previousPage}
            </button>
            <span>{copy.rowsPerPage.replace("{size}", String(pageSize))}</span>
            <button type="button" disabled={pageItems.page >= pageItems.totalPages} onClick={() => setPage((currentPage) => Math.min(pageItems.totalPages, currentPage + 1))}>
              {copy.nextPage}
            </button>
          </div>
        </div>
      </section>

      <aside className="registry-detail" aria-label={copy.detailLabel}>
        {selectedItem ? (
          <RegistryDetail item={selectedItem} locale={props.locale} copy={copy} />
        ) : (
          <div className="registry-detail-empty">{copy.detailEmpty}</div>
        )}
      </aside>
    </main>
  );
}

function RegistrySummaryStrip(props: { summary: RegistrySummary | undefined; locale: DocsLocale; copy: RegistryCopy }) {
  const summary = props.summary;
  const cards = [
    [props.copy.stats.items, summary?.itemCount],
    [props.copy.stats.categories, summary?.sourceCategoryCount],
    [props.copy.stats.freeTier, summary?.freeTierCount],
    [props.copy.stats.limitedFree, summary?.limitedFreeCount]
  ] as const;

  return (
    <div className="registry-stats">
      {cards.map(([label, value]) => (
        <div className="registry-stat" key={label}>
          <span>{label}</span>
          <strong>{value === undefined ? "..." : formatCount(value, props.locale)}</strong>
        </div>
      ))}
    </div>
  );
}

function RegistryPopularStrip(props: {
  items: LocalizedRegistryItem[];
  copy: RegistryCopy;
  locale: DocsLocale;
  onSelect: (item: LocalizedRegistryItem) => void;
}) {
  return (
    <section className="registry-popular" aria-label={props.copy.popular.title}>
      <div className="registry-section-heading">
        <span>{props.copy.popular.kicker}</span>
        <h2>{props.copy.popular.title}</h2>
      </div>
      <div className="registry-popular-grid">
        {props.items.length > 0 ? props.items.map((item) => (
          <button key={item.id} type="button" onClick={() => props.onSelect(item)}>
            <strong>{item.displayName}</strong>
            <span>{getLocalizedSourceCategory(item.sourceCategory, props.locale)}</span>
            <RegistryStatusBadge value={props.copy.tierLabels[item.freeTierStatus] ?? item.freeTierStatus} tone={item.freeTierStatus === "free_tier" ? "green" : "warning"} />
          </button>
        )) : (
          <div className="registry-popular-loading">{props.copy.loading}</div>
        )}
      </div>
    </section>
  );
}

function RegistryFilterGroup(props: {
  ariaLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="registry-filter-group" aria-label={props.ariaLabel} role="group">
      {props.options.map((option) => (
        <button
          aria-pressed={option.value === props.value}
          className={option.value === props.value ? "active" : ""}
          key={option.value}
          type="button"
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RegistryStatusBadge(props: { value: string; tone: "green" | "warning" | "cyan" }) {
  return <span className={`registry-badge ${props.tone}`}>{props.value}</span>;
}

function RegistryDetail(props: { item: FreeForDevRegistryItem; locale: DocsLocale; copy: RegistryCopy }) {
  const item = props.item;
  return (
    <>
      <p className="panel-kicker">{props.copy.selectedEntry}</p>
      <h2>{item.name}</h2>
      <p>{item.description || item.freeTierText || props.copy.noDescription}</p>
      <div className="registry-detail-actions">
        <a href={item.url}>{props.copy.openService}</a>
      </div>
      <dl className="registry-detail-list">
        <div>
          <dt>{props.copy.detailFields.url}</dt>
          <dd><a href={item.url} target="_blank" rel="noreferrer">{item.url}</a></dd>
        </div>
        <div>
          <dt>{props.copy.detailFields.sourceCategory}</dt>
          <dd>{getLocalizedSourceCategory(item.sourceCategory, props.locale)}</dd>
        </div>
        <div>
          <dt>{props.copy.detailFields.freeTier}</dt>
          <dd><RegistryStatusBadge value={props.copy.tierLabels[item.freeTierStatus] ?? item.freeTierStatus} tone={item.freeTierStatus === "free_tier" ? "green" : "warning"} /></dd>
        </div>
      </dl>
    </>
  );
}

function renderDocBody(slug: DocsPageSlug, locale: DocsLocale): string {
  return renderMarkdown(markdownDocs[locale][slug], slug, locale);
}

function getDocsCodeCopyLabel(locale: DocsLocale): string {
  return {
    "zh-CN": "复制",
    en: "Copy",
    ja: "コピー",
    ko: "복사",
    fr: "Copier",
    es: "Copiar"
  }[locale];
}

function getDocsCodeCopySuccessLabel(locale: DocsLocale): string {
  return {
    "zh-CN": "已复制",
    en: "Copied",
    ja: "コピーしました",
    ko: "복사됨",
    fr: "Copié",
    es: "Copiado"
  }[locale];
}

export function getSearchResults(query: string, locale: DocsLocale, registryData?: FreeForDevRegistryData): Array<{ title: string; href: string; excerpt: string }> {
  const normalizedQuery = normalizeSearchQuery(query);
  const entries = docsPages[locale].map((page, index) => {
    const description = getDocDescription(page.slug, locale);
    const plainText = markdownToPlainText(markdownDocs[locale][page.slug]);
    const title = getSidebarLabel(page.slug, locale);
    const haystack = normalizeSearchQuery(`${page.title} ${title} ${description} ${plainText}`);
    const score = normalizedQuery
      ? scoreSearchResult(normalizedQuery, normalizeSearchQuery(`${page.title} ${title}`), normalizeSearchQuery(description), haystack)
      : docsPages[locale].length - index;

    return {
      title,
      href: docsHref(page.slug, locale),
      excerpt: createSearchExcerpt(plainText, description, normalizedQuery),
      score
    };
  });

  const docResults = entries
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, normalizedQuery ? 4 : 6)
    .map((entry) => ({
      title: entry.title,
      href: entry.href,
      excerpt: entry.excerpt
    }));

  if (!normalizedQuery || !registryData) {
    return docResults;
  }

  const registryResults = filterRegistryItems(registryData.items, { query, locale })
    .slice(0, 6)
    .map((item) => {
      const localizedItem = getLocalizedRegistryItem(item, locale);
      return {
        title: `${getSidebarLabel("registry", locale)} / ${localizedItem.displayName}`,
        href: registrySearchHref(localizedItem.displayName, locale),
        excerpt: localizedItem.displayDescription || localizedItem.url
      };
    });

  return [...docResults, ...registryResults].slice(0, 8);
}

function scoreSearchResult(query: string, title: string, description: string, haystack: string): number {
  let score = 0;
  if (title.includes(query)) score += 8;
  if (description.includes(query)) score += 4;
  if (haystack.includes(query)) score += 1;
  return score;
}

function createSearchExcerpt(text: string, fallback: string, query: string): string {
  if (!query) {
    return fallback;
  }

  const normalizedText = normalizeSearchQuery(text);
  const index = normalizedText.indexOf(query);
  if (index === -1) {
    return fallback;
  }

  const start = Math.max(0, index - 42);
  const end = Math.min(text.length, index + query.length + 92);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function normalizeSearchQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function copyText(value: string): void {
  let copiedWithTextarea = false;
  try {
    copiedWithTextarea = copyTextWithTextarea(value);
  } catch {
    copiedWithTextarea = false;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(value).catch(() => {
      if (!copiedWithTextarea) {
        try {
          copyTextWithTextarea(value);
        } catch {
          // Visual feedback should not be blocked by browser clipboard restrictions.
        }
      }
    });
  }
}

function copyTextWithTextarea(value: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  try {
    document.body.append(textArea);
    textArea.focus();
    textArea.select();
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

function InfoPanel(props: { title: string; tone: "green" | "cyan"; children: ReactNode }) {
  return (
    <section className={`info-panel ${props.tone}`}>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function StatusRows(props: { rows: Array<[string, string, string]> }) {
  return (
    <div className="status-rows">
      {props.rows.map(([name, kind, state]) => (
        <div className="status-row" key={name}>
          <span>{name}</span>
          <code>{kind}</code>
          <strong className={state === "connected" ? "ok" : "muted"}>{state}</strong>
        </div>
      ))}
    </div>
  );
}

const englishLandingCopy: LandingCopy = {
  heroTitle: "Free-stack setup for Agents",
  heroSubtitle: "Prompt-first / MCP-first CLI for configuring free services",
  commandCards: [
    { label: "CLI", title: "Install command", commands: ["npm install -g baipiao"], copyLabel: "Copy install command" },
    {
      label: "MCP",
      title: "Agent integration",
      commands: [
        "baipiao mcp install codex",
        "baipiao mcp install claude",
        "baipiao mcp install cursor"
      ],
      copyLabel: "Copy MCP setup commands"
    }
  ],
  quickStartCta: "Quick Start",
  registryCta: "Registry",
  integrationCta: "CLI / MCP Setup",
  points: ["Free first", "Ready to use", "Composable", "Safe by default"],
  docsHubTitle: "Core Entrypoints",
  docsHubDescription: "Start with the registry, then choose the CLI or MCP integration path.",
  docsHubCards: [
    {
      slug: "index",
      title: "Quick Start",
      description: "Run Groq end to end: install, search, generate a prompt, save config, and hand it to your Agent.",
      mark: "⌂"
    },
    {
      slug: "registry",
      title: "Registry",
      description: "Browse the full free-service catalog before choosing a CLI or MCP setup path.",
      mark: "RG"
    },
    {
      slug: "cli",
      title: "CLI",
      description: "The terminal entrypoint for service search, prompt generation, config storage, tests, and env output.",
      mark: ">_"
    },
    {
      slug: "mcp",
      title: "MCP",
      description: "Expose service search, prompts, Vault, env, and connection tests to external AI coding tools.",
      mark: "MC"
    }
  ],
  workflowTitle: "From install to Agent-ready",
  workflowSteps: [
    ["01", "Install CLI", "Install globally, then run baipiao init to create the local workspace."],
    ["02", "Browse the registry", "Use the free-service catalog to pick a stack before generating setup commands."],
    ["03", "Generate Agent task", "Setup outputs an actionable prompt for service-console configuration."],
    ["04", "Import and integrate", "Parse the Agent result, store Vault entries, generate env, and expose tools through MCP."]
  ],
  guardrailsTitle: "Safety Boundaries",
  guardrails: [
    ["Vault", "local encryption", "Secrets only go into local credential storage."],
    ["MCP", "no plaintext leaks", "Agents only receive status, templates, and controlled operations."],
    ["Human", "sensitive actions confirmed", "Login, captcha, 2FA, billing, and paid actions stay under human control."]
  ],
  heroAria: "Install CLI and MCP setup commands",
  docsHubKicker: ">_ DOCS HUB",
  statusGridAria: "Recommended workflow",
  breadcrumb: "⌂ / docs /",
  copyStatusText: {
    setupCommands: "Copy setup commands",
    status: "Copy status summary"
  },
  copySuccessText: "Copied",
  sidebar: {
    title: "Get started",
    docsLink: "See CLI docs →",
    status: "Status",
    source: "Source",
    product: "Product",
    code: "Code",
    getStarted: "Get started"
  },
  docsChrome: {
    docsLabel: "DOCS",
    mobileSummary: "Browse docs",
    paginationAria: "Docs pagination",
    previous: "← Previous: ",
    next: "Next: ",
    onThisPage: "On this page"
  },
  search: {
    trigger: "Search docs and registry...",
    triggerAria: "Search docs and registry",
    placeholder: "Search docs and registry...",
    dialogAria: "Search docs and registry",
    closeAria: "Close search",
    empty: "No matching docs."
  },
  navAria: "Primary",
  homeAria: "baipiao home",
  languageAria: "Select language",
  githubAria: "GitHub Repository",
  footerThanks: "Special thanks to free-for-dev for the candidate catalog.",
  statusSummary: [
    "MCP tools: 16",
    "CLI commands: 14",
    "Registry: local JSON artifacts"
  ]
};

const landingCopy: Record<DocsLocale, LandingCopy> = {
  "zh-CN": {
    ...englishLandingCopy,
    heroTitle: "让 Agent 配白嫖栈",
    heroSubtitle: "Prompt-first / MCP-first 的白嫖服务配置 CLI",
    commandCards: [
      { label: "CLI", title: "安装命令", commands: ["npm install -g baipiao"], copyLabel: "复制安装命令" },
      {
        label: "MCP",
        title: "接入 Agent",
        commands: [
          "baipiao mcp install codex",
          "baipiao mcp install claude",
          "baipiao mcp install cursor"
        ],
        copyLabel: "复制 MCP 接入命令"
      }
    ],
    quickStartCta: "快速开始",
    registryCta: "白嫖数据",
    integrationCta: "CLI / MCP 接入",
    points: ["白嫖优先", "开箱即用", "可组合", "安全可控"],
    docsHubTitle: "核心入口",
    docsHubDescription: "先从白嫖数据里挑服务，再按 CLI 或 MCP 选择接入路线。",
    docsHubCards: [
      {
        slug: "index",
        title: "快速开始",
        description: "五步跑通 Groq：安装、搜索、生成提示词、保存配置、交给 Agent 使用。",
        mark: "⌂"
      },
      {
        slug: "registry",
        title: "白嫖数据",
        description: "先逛完整候选库：按类型、白嫖状态和热门服务筛选，再决定接入哪一个。",
        mark: "RG"
      },
      {
        slug: "cli",
        title: "CLI",
        description: "服务搜索、提示词生成、配置落库、测试连接与环境变量生成的完整入口。",
        mark: ">_"
      },
      {
        slug: "mcp",
        title: "MCP",
        description: "给 Agent 暴露服务查询、提示词生成、Vault 与 env 操作与连接测试。",
        mark: "MC"
      }
    ],
    workflowTitle: "从安装到 Agent 可用",
    workflowSteps: [
      ["01", "安装 CLI", "全局安装后先跑 baipiao init，生成本地工作区。"],
      ["02", "查白嫖数据", "先在白嫖数据里筛候选服务，再决定生成哪条接入任务。"],
      ["03", "生成 Agent 任务", "setup 输出可执行提示词，让 Agent 去服务商控制台完成配置。"],
      ["04", "回收并接入", "解析 Agent 返回结果，写入 Vault、生成 env，并通过 MCP 暴露给工具。"]
    ],
    guardrailsTitle: "安全边界",
    guardrails: [
      ["Vault", "本地加密", "密钥只进入本机凭据管理器。"],
      ["MCP", "不暴露明文", "Agent 只能拿到状态、模板和可控操作。"],
      ["Human", "敏感动作确认", "登录、验证码、2FA、账单与付费操作保留人工确认。"]
    ],
    heroAria: "安装并接入 CLI 与 MCP 的命令",
    docsHubKicker: "⌂ DOCS HUB",
    statusGridAria: "推荐流程",
    copySuccessText: "复制成功",
    sidebar: {
      title: "快速开始",
      docsLink: "查看 CLI 文档 →",
      status: "状态",
      source: "文档来源",
      product: "产品定义",
      code: "实现源代码",
      getStarted: "快速开始"
    },
    docsChrome: {
      docsLabel: "文档",
      mobileSummary: "浏览文档",
      paginationAria: "文档分页",
      previous: "← 上一页: ",
      next: "下一页: ",
      onThisPage: "当前页面"
    },
    search: {
      trigger: "搜索文档和数据...",
      triggerAria: "搜索文档和白嫖数据",
      placeholder: "搜索文档和白嫖数据...",
      dialogAria: "搜索文档和白嫖数据",
      closeAria: "关闭搜索",
      empty: "没有匹配的文档。"
    },
    navAria: "主导航",
    homeAria: "返回主页",
    languageAria: "选择语言",
    githubAria: "GitHub 仓库",
    footerThanks: "特别鸣谢 free-for-dev 提供候选目录源。",
    copyStatusText: {
      setupCommands: "复制 setup 命令",
      status: "复制状态摘要"
    },
    statusSummary: [
      "MCP 工具: 16",
      "CLI 命令: 14",
      "注册表: 本地 JSON 数据"
    ]
  },
  en: englishLandingCopy,
  ja: {
    ...englishLandingCopy,
    heroTitle: "エージェント向け無料スタックのセットアップ",
    heroSubtitle: "無料サービス設定のための Prompt-first / MCP-first CLI",
    commandCards: [
      { label: "CLI", title: "インストールコマンド", commands: ["npm install -g baipiao"], copyLabel: "インストールコマンドをコピー" },
      {
        label: "MCP",
        title: "Agent 接続",
        commands: [
          "baipiao mcp install codex",
          "baipiao mcp install claude",
          "baipiao mcp install cursor"
        ],
        copyLabel: "MCP 接続コマンドをコピー"
      }
    ],
    docsHubCards: [
      {
        slug: "index",
        title: "クイックスタート",
        description: "Groq を最後まで実行：インストール、検索、プロンプト生成、設定保存、Agent へ引き渡し。",
        mark: "⌂"
      },
      {
        slug: "cli",
        title: "CLI",
        description: "サービス検索、プロンプト生成、設定保存、接続テスト、env 出力の入り口。",
        mark: ">_"
      },
      {
        slug: "mcp",
        title: "MCP",
        description: "サービス検索、プロンプト、Vault、env、接続テストを外部 AI ツールに公開。",
        mark: "MC"
      }
    ],
    quickStartCta: "クイックスタート",
    registryCta: "レジストリ",
    integrationCta: "CLI / MCP 導入",
    points: ["無料優先", "すぐ使える", "組み合わせ可能", "安全デフォルト"],
    docsHubTitle: "主要エントリ",
    docsHubDescription: "先にインストールしてから CLI または MCP を選択します。",
    workflowTitle: "インストールから Agent 利用まで",
    workflowSteps: [
      ["01", "CLI インストール", "グローバルインストール後に `baipiao init` を実行してローカル作業区を作成します。"],
      ["02", "無料サービス検索", "search / info で現在のプロジェクト向けの無料スタックを見つけます。"],
      ["03", "Agent タスク生成", "setup が実行可能なプロンプトを出力します。"],
      ["04", "取り込みと接続", "Agent 結果を取り込み、Vault と env を作成し MCP を通じて公開します。"]
    ],
    guardrailsTitle: "安全境界",
    guardrails: [
      ["Vault", "ローカル暗号化", "秘密はローカル資格情報管理にのみ保存。"],
      ["MCP", "平文は露出なし", "Agent は状態、テンプレート、制御可能な操作のみ受け取ります。"],
      ["Human", "重要操作の確認", "ログイン・CAPTCHA・2FA・課金操作は必ず人の確認を要します。"]
    ],
    heroAria: "CLI と MCP のインストール・接続コマンド",
    docsHubKicker: ">_ ドキュメント",
    statusGridAria: "推奨ワークフロー",
    sidebar: {
      ...englishLandingCopy.sidebar,
      title: "はじめに",
      docsLink: "CLI ドキュメントを開く →",
      status: "ステータス",
      source: "ソース",
      product: "製品定義",
      code: "実装コード",
      getStarted: "はじめる"
    },
    docsChrome: {
      ...englishLandingCopy.docsChrome,
      docsLabel: "DOCS",
      mobileSummary: "ドキュメントを表示",
      paginationAria: "ドキュメントページネーション",
      previous: "← 前へ: ",
      next: "次へ: ",
      onThisPage: "このページ"
    },
    search: {
      trigger: "ドキュメント検索...",
      triggerAria: "ドキュメント検索",
      placeholder: "ドキュメントを検索...",
      dialogAria: "ドキュメントを検索",
      closeAria: "検索を閉じる",
      empty: "一致するドキュメントはありません。"
    },
    navAria: "メインナビ",
    homeAria: "baipiao ホーム",
    languageAria: "言語選択",
    githubAria: "GitHub リポジトリ",
    footerThanks: "候補カタログの提供元として free-for-dev に特別な感謝を。",
    copySuccessText: "コピーしました",
    statusSummary: ["MCP ツール: 16", "CLI コマンド: 14", "レジストリ: ローカル JSON"]
  },
  ko: {
    ...englishLandingCopy,
    heroTitle: "에이전트용 무료 스택 설정",
    heroSubtitle: "무료 서비스를 구성하는 Prompt-first / MCP-first CLI",
    commandCards: [
      { label: "CLI", title: "설치 명령", commands: ["npm install -g baipiao"], copyLabel: "설치 명령 복사" },
      {
        label: "MCP",
        title: "에이전트 연동",
        commands: [
          "baipiao mcp install codex",
          "baipiao mcp install claude",
          "baipiao mcp install cursor"
        ],
        copyLabel: "MCP 연동 명령 복사"
      }
    ],
    docsHubCards: [
      {
        slug: "index",
        title: "빠른 시작",
        description: "Groq를 끝까지 실행합니다: 설치, 검색, 프롬프트 생성, 설정 저장, Agent 전달.",
        mark: "⌂"
      },
      {
        slug: "cli",
        title: "CLI",
        description: "서비스 검색, 프롬프트 생성, 구성 저장, 연결 테스트, env 출력 진입점.",
        mark: ">_"
      },
      {
        slug: "mcp",
        title: "MCP",
        description: "서비스 검색, 프롬프트, Vault, env, 연결 테스트를 외부 AI 도구에 노출.",
        mark: "MC"
      }
    ],
    quickStartCta: "빠른 시작",
    registryCta: "레지스트리",
    integrationCta: "CLI / MCP 연동",
    points: ["무료 우선", "즉시 사용", "조합 가능", "안전 기본"],
    docsHubTitle: "주요 진입점",
    docsHubDescription: "먼저 설치하고 CLI 또는 MCP 통합 경로를 선택하세요.",
    workflowTitle: "설치부터 Agent 준비까지",
    workflowSteps: [
      ["01", "CLI 설치", "전역 설치 후 `baipiao init`으로 로컬 작업영역을 만듭니다."],
      ["02", "무료 서비스 검색", "search / info로 현재 프로젝트에 맞는 무료 스택을 찾습니다."],
      ["03", "Agent 작업 생성", "`setup`이 실행 가능한 프롬프트를 출력합니다."],
      ["04", "가져오기 및 통합", "Agent 결과를 파싱해 Vault를 저장하고 env를 생성 후 MCP로 노출합니다."]
    ],
    guardrailsTitle: "안전 경계",
    guardrails: [
      ["Vault", "로컬 암호화", "비밀키는 로컬 자격 증명 저장소에만 저장됩니다."],
      ["MCP", "평문 미노출", "Agent는 상태, 템플릿, 통제 가능한 동작만 받습니다."],
      ["Human", "민감 동작 승인", "로그인, CAPTCHA, 2FA, 과금/결제 액션은 사람 확인 필요."]
    ],
    heroAria: "CLI 및 MCP 설치 연동 명령",
    docsHubKicker: ">_ 문서 허브",
    statusGridAria: "권장 워크플로우",
    sidebar: {
      ...englishLandingCopy.sidebar,
      title: "빠른 시작",
      docsLink: "CLI 문서 보기 →",
      status: "상태",
      source: "출처",
      product: "제품 정의",
      code: "구현 코드",
      getStarted: "빠른 시작"
    },
    docsChrome: {
      ...englishLandingCopy.docsChrome,
      mobileSummary: "문서 탐색",
      paginationAria: "문서 페이지네이션",
      previous: "← 이전: ",
      next: "다음: ",
      onThisPage: "현재 페이지"
    },
    search: {
      trigger: "문서 검색...",
      triggerAria: "문서 검색",
      placeholder: "문서 검색...",
      dialogAria: "문서 검색",
      closeAria: "검색 닫기",
      empty: "일치하는 문서가 없습니다."
    },
    navAria: "기본 네비게이션",
    homeAria: "baipiao 홈",
    languageAria: "언어 선택",
    githubAria: "GitHub 저장소",
    footerThanks: "후보 카탈로그 제공처로 free-for-dev 에 특별히 감사드립니다.",
    copySuccessText: "복사됨",
    statusSummary: ["MCP 도구: 16", "CLI 명령: 14", "레지스트리: 로컬 JSON"]
  },
  fr: {
    ...englishLandingCopy,
    heroTitle: "Configuration de stack gratuite pour votre Agent",
    heroSubtitle: "CLI Prompt-first / MCP-first pour configurer des services gratuits",
    commandCards: [
      { label: "CLI", title: "Commande d’installation", commands: ["npm install -g baipiao"], copyLabel: "Copier la commande d’installation" },
      {
        label: "MCP",
        title: "Connexion Agent",
        commands: [
          "baipiao mcp install codex",
          "baipiao mcp install claude",
          "baipiao mcp install cursor"
        ],
        copyLabel: "Copier les commandes MCP"
      }
    ],
    docsHubCards: [
      {
        slug: "index",
        title: "Démarrage rapide",
        description: "Parcourez Groq de bout en bout : installation, recherche, prompt, sauvegarde config, et remise à l’Agent.",
        mark: "⌂"
      },
      {
        slug: "cli",
        title: "CLI",
        description: "Point d’entrée terminal pour recherche de services, génération de prompts, stockage config, tests et env.",
        mark: ">_"
      },
      {
        slug: "mcp",
        title: "MCP",
        description: "Expose la recherche de services, prompts, Vault, env et tests de connexion vers des outils IA externes.",
        mark: "MC"
      }
    ],
    quickStartCta: "Démarrage rapide",
    registryCta: "Registre",
    integrationCta: "Configurer CLI / MCP",
    points: ["Gratuit d’abord", "Prêt à l’emploi", "Composable", "Sécurisé par défaut"],
    docsHubTitle: "Points d’entrée clés",
    docsHubDescription: "Installez d’abord, puis choisissez CLI ou MCP.",
    workflowTitle: "De l’installation à l’usage Agent",
    workflowSteps: [
      ["01", "Installer CLI", "Installez globalement, puis `baipiao init` pour créer l’espace de travail."],
      ["02", "Rechercher services gratuits", "Utilisez search / info pour trouver un stack adapté."],
      ["03", "Générer tâche Agent", "setup produit un prompt exécutable pour la configuration."],
      ["04", "Importer et intégrer", "Analysez le résultat Agent, mettez à jour Vault, générez env, puis exposez via MCP."]
    ],
    guardrailsTitle: "Limites de sécurité",
    guardrails: [
      ["Vault", "chiffrement local", "Les clés restent dans le stockage local des identifiants."],
      ["MCP", "pas de fuite de texte brut", "Les Agents n’obtiennent que l’état, les modèles et des actions contrôlées."],
      ["Human", "actions sensibles confirmées", "Login, CAPTCHA, 2FA, facturation et paiement restent sous contrôle humain."]
    ],
    heroAria: "Commandes d’installation et de connexion pour CLI/MCP",
    docsHubKicker: ">_ DOCS",
    statusGridAria: "Flux recommandé",
    sidebar: {
      ...englishLandingCopy.sidebar,
      title: "Bien démarrer",
      docsLink: "Voir docs CLI →",
      status: "Statut",
      source: "Source",
      product: "Produit",
      code: "Code",
      getStarted: "Bien démarrer"
    },
    docsChrome: {
      ...englishLandingCopy.docsChrome,
      mobileSummary: "Parcourir la doc",
      paginationAria: "Pagination docs",
      previous: "← Précédent: ",
      next: "Suivant: ",
      onThisPage: "Sur cette page"
    },
    search: {
      trigger: "Rechercher la doc...",
      triggerAria: "Rechercher la doc",
      placeholder: "Rechercher la doc...",
      dialogAria: "Recherche docs",
      closeAria: "Fermer la recherche",
      empty: "Aucun résultat."
    },
    navAria: "Navigation principale",
    homeAria: "Accueil baipiao",
    languageAria: "Sélection de langue",
    githubAria: "Dépôt GitHub",
    footerThanks: "Merci spécial à free-for-dev pour le catalogue de candidats.",
    copySuccessText: "Copié",
    statusSummary: ["Outils MCP: 16", "Commandes CLI: 14", "Registre: JSON local"]
  },
  es: {
    ...englishLandingCopy,
    heroTitle: "Configuración de stack gratuito para tu Agente",
    heroSubtitle: "CLI Prompt-first / MCP-first para configurar servicios gratis",
    commandCards: [
      { label: "CLI", title: "Comando de instalación", commands: ["npm install -g baipiao"], copyLabel: "Copiar comando de instalación" },
      {
        label: "MCP",
        title: "Conectar Agent",
        commands: [
          "baipiao mcp install codex",
          "baipiao mcp install claude",
          "baipiao mcp install cursor"
        ],
        copyLabel: "Copiar comandos MCP"
      }
    ],
    docsHubCards: [
      {
        slug: "index",
        title: "Inicio rápido",
        description: "Completa el flujo de Groq: instalar, buscar, generar prompt, guardar configuración y entregar al Agent.",
        mark: "⌂"
      },
      {
        slug: "cli",
        title: "CLI",
        description: "Entrada de terminal para búsqueda de servicios, generación de prompt, guardado de configuración, pruebas y env.",
        mark: ">_"
      },
      {
        slug: "mcp",
        title: "MCP",
        description: "Expone búsqueda, prompts, Vault, env y pruebas de conexión a herramientas de IA externas.",
        mark: "MC"
      }
    ],
    quickStartCta: "Inicio rápido",
    registryCta: "Registro",
    integrationCta: "Configurar CLI / MCP",
    points: ["Primero gratis", "Listo para usar", "Composable", "Seguro por defecto"],
    docsHubTitle: "Entradas clave",
    docsHubDescription: "Instala primero y luego elige la integración CLI o MCP.",
    workflowTitle: "De instalación a uso con Agent",
    workflowSteps: [
      ["01", "Instalar CLI", "Instálalo globalmente y ejecuta `baipiao init` para crear workspace."],
      ["02", "Buscar servicios gratis", "Usa search / info para encontrar un stack para tu proyecto."],
      ["03", "Generar tarea Agent", "`setup` produce un prompt ejecutable para configurar el servicio."],
      ["04", "Importar e integrar", "Parsea el resultado del Agent, guarda Vault/env y expón por MCP."]
    ],
    guardrailsTitle: "Límites de seguridad",
    guardrails: [
      ["Vault", "cifrado local", "Las claves solo van al almacén local de credenciales."],
      ["MCP", "sin fuga de texto plano", "Los Agents solo reciben estado, plantillas y acciones controladas."],
      ["Human", "acciones sensibles confirmadas", "Login, CAPTCHA, 2FA, facturación y pagos permanecen bajo control humano."]
    ],
    heroAria: "Comandos de instalación y conexión para CLI y MCP",
    docsHubKicker: ">_ DOCUMENTACIÓN",
    statusGridAria: "Flujo recomendado",
    sidebar: {
      ...englishLandingCopy.sidebar,
      title: "Primeros pasos",
      docsLink: "Ver docs CLI →",
      status: "Estado",
      source: "Fuente",
      product: "Producto",
      code: "Código",
      getStarted: "Primeros pasos"
    },
    docsChrome: {
      ...englishLandingCopy.docsChrome,
      mobileSummary: "Abrir docs",
      paginationAria: "Paginación docs",
      previous: "← Anterior: ",
      next: "Siguiente: ",
      onThisPage: "En esta página"
    },
    search: {
      trigger: "Buscar docs...",
      triggerAria: "Buscar docs",
      placeholder: "Buscar docs...",
      dialogAria: "Búsqueda docs",
      closeAria: "Cerrar búsqueda",
      empty: "No se encontraron docs coincidentes."
    },
    navAria: "Navegación principal",
    homeAria: "Inicio baipiao",
    languageAria: "Seleccionar idioma",
    githubAria: "Repositorio GitHub",
    footerThanks: "Agradecimiento especial a free-for-dev por el catálogo de candidatos.",
    copySuccessText: "Copiado",
    statusSummary: ["Herramientas MCP: 16", "Comandos CLI: 14", "Registro: artefactos JSON locales"]
  }
};

type RegistryCopy = {
  title: string;
  description: string;
  railTitle: string;
  categoryRailLabel: string;
  categorySearch: string;
  allServices: string;
  searchPlaceholder: string;
  tierFilter: string;
  allTiers: string;
  tierLabels: Record<string, string>;
  resultCount: string;
  pageMeta: string;
  tableLabel: string;
  loading: string;
  loadError: string;
  empty: string;
  previousPage: string;
  nextPage: string;
  rowsPerPage: string;
  detailLabel: string;
  detailEmpty: string;
  selectedEntry: string;
  openService: string;
  noDescription: string;
  popular: {
    kicker: string;
    title: string;
  };
  stats: {
    items: string;
    categories: string;
    freeTier: string;
    limitedFree: string;
  };
  columns: {
    name: string;
    category: string;
    tier: string;
    source: string;
  };
  detailFields: {
    url: string;
    sourceCategory: string;
    freeTier: string;
  };
};

const englishRegistryCopy: RegistryCopy = {
  title: "Registry",
  description: "Explore a curated free-service catalog for agents and developers, grouped by source category, free status, and popular picks.",
  railTitle: "Source Categories",
  categoryRailLabel: "Source categories",
  categorySearch: "Filter categories or services...",
  allServices: "All services",
  searchPlaceholder: "Search name, URL, catalog text...",
  tierFilter: "Filter by status",
  allTiers: "All tiers",
  tierLabels: {
    all: "All tiers",
    free_tier: "Free tier",
    limited_free: "Limited free",
    unknown: "Unknown"
  },
  resultCount: "{count} results",
  pageMeta: "Page {page} / {pages}",
  tableLabel: "registry entries",
  loading: "Loading registry data",
  loadError: "Unable to load registry data.",
  empty: "No matching services.",
  previousPage: "Previous",
  nextPage: "Next",
  rowsPerPage: "{size} rows per page",
  detailLabel: "Selected registry entry details",
  detailEmpty: "Select a service to inspect its service link, category, and free status.",
  selectedEntry: "Service Details",
  openService: "Open service",
  noDescription: "No description yet.",
  popular: {
    kicker: ">_ POPULAR",
    title: "Popular Services"
  },
  stats: {
    items: "items",
    categories: "source categories",
    freeTier: "free tier",
    limitedFree: "limited free"
  },
  columns: {
    name: "Name",
    category: "Source category",
    tier: "Free tier",
    source: "Source"
  },
  detailFields: {
    url: "URL",
    sourceCategory: "Source category",
    freeTier: "Free tier"
  }
};

const registryCopy: Record<DocsLocale, RegistryCopy> = {
  "zh-CN": {
    ...englishRegistryCopy,
    title: "白嫖数据",
    description: "收录整理后的白嫖服务，按来源分类、白嫖状态和热门服务快速浏览。",
    railTitle: "来源分类",
    categoryRailLabel: "来源分类",
    categorySearch: "筛选分类或服务...",
    allServices: "全部服务",
    searchPlaceholder: "搜索名称、URL、白嫖说明...",
    tierFilter: "按白嫖状态筛选",
    allTiers: "全部状态",
    tierLabels: {
      all: "全部状态",
      free_tier: "白嫖",
      limited_free: "部分白嫖",
      unknown: "未确认"
    },
    resultCount: "{count} 条结果",
    pageMeta: "第 {page} / {pages} 页",
    tableLabel: "白嫖数据条目",
    loading: "正在加载数据",
    loadError: "无法加载白嫖数据。",
    empty: "没有匹配的服务。",
    previousPage: "上一页",
    nextPage: "下一页",
    rowsPerPage: "每页 {size} 条",
    detailLabel: "选中的白嫖数据条目详情",
    detailEmpty: "选择一个服务查看链接、来源分类和白嫖状态。",
    selectedEntry: "服务详情",
    openService: "打开服务",
    noDescription: "暂无描述。",
    popular: {
      kicker: ">_ 热门",
      title: "热门服务"
    },
    stats: {
      items: "条目",
      categories: "来源分类",
      freeTier: "白嫖",
      limitedFree: "部分白嫖"
    },
    columns: {
      name: "名称",
      category: "来源分类",
      tier: "白嫖",
      source: "来源"
    },
    detailFields: {
      url: "URL",
      sourceCategory: "来源分类",
      freeTier: "白嫖状态"
    }
  },
  en: englishRegistryCopy,
  ja: {
    ...englishRegistryCopy,
    title: "レジストリ",
    description: "整理済みの無料サービスを、ソースカテゴリ、無料ステータス、人気サービスからすばやく探せます。",
    railTitle: "ソースカテゴリ",
    categoryRailLabel: "ソースカテゴリ",
    categorySearch: "カテゴリまたはサービスを絞り込み...",
    allServices: "すべてのサービス",
    searchPlaceholder: "名前、URL、無料枠の説明を検索...",
    tierFilter: "無料ステータスで絞り込み",
    allTiers: "すべてのステータス",
    tierLabels: {
      all: "すべてのステータス",
      free_tier: "無料枠あり",
      limited_free: "一部無料",
      unknown: "未確認"
    },
    resultCount: "{count} 件",
    pageMeta: "{page} / {pages} ページ",
    tableLabel: "レジストリ項目",
    loading: "データを読み込み中",
    loadError: "レジストリデータを読み込めません。",
    empty: "一致するサービスはありません。",
    previousPage: "前へ",
    nextPage: "次へ",
    rowsPerPage: "1 ページ {size} 件",
    detailLabel: "選択中のレジストリ項目",
    detailEmpty: "サービスを選択すると、リンク、ソースカテゴリ、無料ステータスを確認できます。",
    selectedEntry: "サービス詳細",
    openService: "サービスを開く",
    noDescription: "説明はまだありません。",
    popular: {
      kicker: ">_ 人気",
      title: "人気サービス"
    },
    stats: {
      items: "項目",
      categories: "ソースカテゴリ",
      freeTier: "無料枠あり",
      limitedFree: "一部無料"
    },
    columns: {
      name: "名前",
      category: "ソースカテゴリ",
      tier: "無料枠",
      source: "ソース"
    },
    detailFields: {
      url: "URL",
      sourceCategory: "ソースカテゴリ",
      freeTier: "無料ステータス"
    }
  },
  ko: {
    ...englishRegistryCopy,
    title: "레지스트리",
    description: "정리된 무료 서비스를 소스 카테고리, 무료 상태, 인기 서비스 기준으로 빠르게 살펴볼 수 있습니다.",
    railTitle: "소스 카테고리",
    categoryRailLabel: "소스 카테고리",
    categorySearch: "카테고리 또는 서비스 필터링...",
    allServices: "전체 서비스",
    searchPlaceholder: "이름, URL, 무료 플랜 설명 검색...",
    tierFilter: "무료 상태로 필터링",
    allTiers: "전체 상태",
    tierLabels: {
      all: "전체 상태",
      free_tier: "무료 플랜",
      limited_free: "일부 무료",
      unknown: "미확인"
    },
    resultCount: "{count}개 결과",
    pageMeta: "{page} / {pages}페이지",
    tableLabel: "레지스트리 항목",
    loading: "데이터 로딩 중",
    loadError: "레지스트리 데이터를 불러올 수 없습니다.",
    empty: "일치하는 서비스가 없습니다.",
    previousPage: "이전",
    nextPage: "다음",
    rowsPerPage: "페이지당 {size}개",
    detailLabel: "선택한 레지스트리 항목",
    detailEmpty: "서비스를 선택하면 링크, 소스 카테고리, 무료 상태를 확인할 수 있습니다.",
    selectedEntry: "서비스 상세",
    openService: "서비스 열기",
    noDescription: "아직 설명이 없습니다.",
    popular: {
      kicker: ">_ 인기",
      title: "인기 서비스"
    },
    stats: {
      items: "항목",
      categories: "소스 카테고리",
      freeTier: "무료 플랜",
      limitedFree: "일부 무료"
    },
    columns: {
      name: "이름",
      category: "소스 카테고리",
      tier: "무료 플랜",
      source: "소스"
    },
    detailFields: {
      url: "URL",
      sourceCategory: "소스 카테고리",
      freeTier: "무료 상태"
    }
  },
  fr: {
    ...englishRegistryCopy,
    title: "Registre",
    description: "Parcourez les services gratuits déjà organisés par catégorie source, statut gratuit et services populaires.",
    railTitle: "Catégories source",
    categoryRailLabel: "Catégories source",
    categorySearch: "Filtrer catégories ou services...",
    allServices: "Tous les services",
    searchPlaceholder: "Rechercher nom, URL ou texte d'offre gratuite...",
    tierFilter: "Filtrer par statut gratuit",
    allTiers: "Tous les statuts",
    tierLabels: {
      all: "Tous les statuts",
      free_tier: "Offre gratuite",
      limited_free: "Gratuit limité",
      unknown: "À confirmer"
    },
    resultCount: "{count} résultats",
    pageMeta: "Page {page} / {pages}",
    tableLabel: "Entrées du registre",
    loading: "Chargement des données",
    loadError: "Impossible de charger les données du registre.",
    empty: "Aucun service correspondant.",
    previousPage: "Précédent",
    nextPage: "Suivant",
    rowsPerPage: "{size} lignes par page",
    detailLabel: "Entrée sélectionnée",
    detailEmpty: "Sélectionnez un service pour voir son lien, sa catégorie source et son statut gratuit.",
    selectedEntry: "Détails du service",
    openService: "Ouvrir le service",
    noDescription: "Pas encore de description.",
    popular: {
      kicker: ">_ Populaire",
      title: "Services populaires"
    },
    stats: {
      items: "entrées",
      categories: "catégories source",
      freeTier: "offre gratuite",
      limitedFree: "gratuit limité"
    },
    columns: {
      name: "Nom",
      category: "Catégorie source",
      tier: "Offre gratuite",
      source: "Source"
    },
    detailFields: {
      url: "URL",
      sourceCategory: "Catégorie source",
      freeTier: "Statut gratuit"
    }
  },
  es: {
    ...englishRegistryCopy,
    title: "Registro",
    description: "Explora servicios gratis ya organizados por categoría de origen, estado gratuito y servicios populares.",
    railTitle: "Categorías de origen",
    categoryRailLabel: "Categorías de origen",
    categorySearch: "Filtrar categorías o servicios...",
    allServices: "Todos los servicios",
    searchPlaceholder: "Buscar nombre, URL o texto del plan gratis...",
    tierFilter: "Filtrar por estado gratis",
    allTiers: "Todos los estados",
    tierLabels: {
      all: "Todos los estados",
      free_tier: "Plan gratis",
      limited_free: "Gratis limitado",
      unknown: "Por confirmar"
    },
    resultCount: "{count} resultados",
    pageMeta: "Página {page} / {pages}",
    tableLabel: "Entradas del registro",
    loading: "Cargando datos",
    loadError: "No se pudieron cargar los datos del registro.",
    empty: "No hay servicios coincidentes.",
    previousPage: "Anterior",
    nextPage: "Siguiente",
    rowsPerPage: "{size} filas por página",
    detailLabel: "Entrada seleccionada",
    detailEmpty: "Selecciona un servicio para ver su enlace, categoría de origen y estado gratis.",
    selectedEntry: "Detalles del servicio",
    openService: "Abrir servicio",
    noDescription: "Aún no hay descripción.",
    popular: {
      kicker: ">_ Popular",
      title: "Servicios populares"
    },
    stats: {
      items: "entradas",
      categories: "categorías de origen",
      freeTier: "plan gratis",
      limitedFree: "gratis limitado"
    },
    columns: {
      name: "Nombre",
      category: "Categoría de origen",
      tier: "Plan gratis",
      source: "Origen"
    },
    detailFields: {
      url: "URL",
      sourceCategory: "Categoría de origen",
      freeTier: "Estado gratis"
    }
  }
};

function getLandingCopy(locale: DocsLocale): LandingCopy {
  return landingCopy[locale] ?? landingCopy[fallbackLocale];
}

function getRegistryCopy(locale: DocsLocale): RegistryCopy {
  return registryCopy[locale] ?? registryCopy[fallbackLocale];
}

function resolveDocsRoute(path: string): { locale: DocsLocale; slug: DocsPageSlug } {
  const segments = path.split("/").filter(Boolean);
  const maybeLocale = segments[1];
  if (isDocsLocale(maybeLocale)) {
    return { locale: maybeLocale, slug: normalizeSlug(segments[2]) };
  }

  return { locale: defaultLocale, slug: normalizeSlug(segments[1]) };
}

function docsHref(slug: DocsPageSlug, locale: DocsLocale): string {
  if (locale === defaultLocale) {
    return baseHref(slug === "index" ? "/docs" : `/docs/${slug}`);
  }

  return baseHref(slug === "index" ? `/docs/${locale}` : `/docs/${locale}/${slug}`);
}

function registrySearchHref(query: string, locale: DocsLocale): string {
  return `${docsHref("registry", locale)}?q=${encodeURIComponent(query)}`;
}

function getInitialRegistryQuery(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function landingHref(locale: DocsLocale): string {
  return baseHref(locale === defaultLocale ? "/" : `/${locale}`);
}

function localizedHref(path: string, locale: DocsLocale): string {
  if (path.startsWith("/docs")) {
    const { slug } = resolveDocsRoute(path);
    return docsHref(slug, locale);
  }

  return landingHref(locale);
}

function resolveLandingLocale(path: string): DocsLocale {
  const [maybeLocale] = path.split("/").filter(Boolean);
  return isDocsLocale(maybeLocale) ? maybeLocale : defaultLocale;
}

function normalizeSlug(value: string | undefined): DocsPageSlug {
  if (isDocsSlug(value)) {
    return value;
  }

  return "index";
}

function isDocsLocale(value: string | undefined): value is DocsLocale {
  return docsLocales.includes(value as DocsLocale);
}

function isDocsSlug(value: string | undefined): value is DocsPageSlug {
  return docsPages[defaultLocale].some((page) => page.slug === value);
}

function requiredIndexPage() {
  const page = docsPages[defaultLocale].find((item) => item.slug === "index");
  if (!page) {
    throw new Error("Docs index page is missing");
  }
  return page;
}

function getNavMark(slug: DocsPageSlug): string {
  const marks: Record<DocsPageSlug, string> = {
    index: "⌂",
    cli: ">_",
    mcp: "MC",
    registry: "RG"
  };
  return marks[slug];
}

function getSidebarLabel(slug: DocsPageSlug, locale: DocsLocale = defaultLocale): string {
  return {
  "zh-CN": {
    index: "快速开始",
    cli: "CLI",
    mcp: "MCP",
    registry: "白嫖数据"
  },
    en: {
      index: "Quick Start",
      cli: "CLI",
      mcp: "MCP",
      registry: "Registry"
    },
    ja: {
      index: "クイックスタート",
      cli: "CLI",
      mcp: "MCP",
      registry: "レジストリ"
    },
    ko: {
      index: "빠른 시작",
      cli: "CLI",
      mcp: "MCP",
      registry: "레지스트리"
    },
    fr: {
      index: "Démarrage rapide",
      cli: "CLI",
      mcp: "MCP",
      registry: "Registre"
    },
    es: {
      index: "Inicio rápido",
      cli: "CLI",
      mcp: "MCP",
      registry: "Registro"
    }
  }[locale]![slug];
}

function getDocDescription(slug: DocsPageSlug, locale: DocsLocale): string {
  if (slug === "index") {
    return {
      "zh-CN": "从零到跑通第一个白嫖服务的完整快速开始指南：搜索、提示词、配置、测试、集成。",
      en: "Five steps to go from zero to a working free-service setup — search, prompt, configure, test, and integrate.",
      ja: "無料サービスの導入を最短で開始できるための流れ: 検索、プロンプト作成、設定、テスト、統合。",
      ko: "무료 서비스 구성의 시작 가이드: 검색, 프롬프트, 설정, 테스트, 통합까지의 5단계.",
      fr: "Parcours en 5 étapes pour passer d’un projet vide à un service gratuit opérationnel : recherche, prompt, configuration, test, intégration.",
      es: "Guía de 5 pasos para ir de cero a un servicio gratuito en funcionamiento: buscar, generar prompts, configurar, probar e integrar."
    }[locale];
  }

  if (slug === "registry") {
    return {
      "zh-CN": "浏览整理后的白嫖服务清单，按来源分类、白嫖状态和热门服务快速筛选。",
      en: "Browse the service catalog by source category, status, and popular picks.",
      ja: "Browse the service catalog by source category, status, and popular picks.",
      ko: "Browse the service catalog by source category, status, and popular picks.",
      fr: "Browse the service catalog by source category, status, and popular picks.",
      es: "Browse the service catalog by source category, status, and popular picks."
    }[locale];
  }

  return {
    "zh-CN": slug === "cli"
      ? "服务发现、提示词生成、配置落库、env 与测试的一站式终端入口。"
      : "为 Agent 提供安全可控的服务查询、提示词与 Vault、env 操作工具。",
    en: slug === "cli"
      ? "Structured CLI commands for searching services, generating prompts, and saving env and secrets."
      : "Safe MCP tools for catalog search, prompts, vault and env operations.",
    ja: slug === "cli"
      ? "サービス検索、プロンプト生成、env とシークレット保存を行う構造化 CLI コマンド。"
      : "カタログ検索、プロンプト、Vault、env 操作を安全に行う MCP ツール。",
    ko: slug === "cli"
      ? "서비스 검색、프롬프트 생성、env/비밀情報保存を提供する 구조화 CLI."
      : "카탈로그 검색, 프롬프트, Vault, env 작업을 안전하게 제공하는 MCP 도구.",
    fr: slug === "cli"
      ? "Commandes CLI structurées pour rechercher des services, générer des prompts, et stocker env/secrets."
      : "Outils MCP sécurisés pour la recherche de catalogue, prompts, Vault et opérations env.",
    es: slug === "cli"
      ? "Comandos CLI estructurados para buscar servicios, generar prompts y guardar env/secretos."
      : "Herramientas MCP seguras para búsqueda de catálogo, prompts y operaciones de Vault/env."
  }[locale];
}

function getRegistryCategoryLabel(category: RegistrySourceCategory, copy: RegistryCopy, locale: DocsLocale): string {
  return category.name === "All services" ? copy.allServices : getLocalizedSourceCategory(category.name, locale);
}

function formatCount(value: number, locale: DocsLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

function getToc(slug: DocsPageSlug, locale: DocsLocale): Array<{ id: string; label: string }> {
  const source = markdownDocs[locale][slug];
  if (!source) {
    return [];
  }

  const stripped = stripFrontMatter(source);
  const lines = stripped.split("\n");
  const items: Array<{ id: string; label: string }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    const headingMatch = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const title = headingMatch[2]!;
      const id = headingToId(slug, locale, title);
      items.push({ id, label: title });
    }
  }

  return items;
}

function localeShortLabel(locale: DocsLocale): string {
  return localeOptions.find((option) => option.locale === locale)?.shortLabel ?? locale.toUpperCase();
}

function baseHref(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("#")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (docsBasePath === "/") {
    return normalizedPath;
  }

  return `${docsBasePath.slice(0, -1)}${normalizedPath}`;
}

function stripBasePath(path: string): string {
  if (docsBasePath === "/") {
    return path;
  }

  const baseWithoutTrailingSlash = docsBasePath.slice(0, -1);
  if (path === baseWithoutTrailingSlash) {
    return "/";
  }
  if (path.startsWith(`${baseWithoutTrailingSlash}/`)) {
    return path.slice(baseWithoutTrailingSlash.length) || "/";
  }

  return path;
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
