'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadPlatformSearchIndex } from '@/lib/domain/search';
import { productBrowseHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { searchSupportArticles } from '@/lib/supportArticles';
import { Ui44TextInput } from '@/components/ui44/Inputs';

const BASE_SEARCH_SUGGESTIONS = [
  'Music',
  'Books',
  'Games',
  'Merch',
  'Sample Packs',
  'Community',
];

type SearchSuggestion = {
  key: string;
  primary: string;
  secondary?: string;
  submitValue: string;
  searchValues: string[];
  href?: string;
};

let suggestionIndexCache: SearchSuggestion[] | null = null;
let suggestionIndexRequest: Promise<SearchSuggestion[]> | null = null;

function normalizeSuggestion(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function createTextSuggestions(values: Array<string | null | undefined>): SearchSuggestion[] {
  const seen = new Set<string>();
  return values.flatMap(value => {
    const suggestion = normalizeSuggestion(value);
    const key = suggestion.toLocaleLowerCase();
    if (!suggestion || seen.has(key)) return [];
    seen.add(key);
    return [{
      key: `text:${key}`,
      primary: suggestion,
      submitValue: suggestion,
      searchValues: [suggestion],
    } satisfies SearchSuggestion];
  });
}

function loadSuggestionIndex() {
  if (suggestionIndexCache) return Promise.resolve(suggestionIndexCache);
  if (suggestionIndexRequest) return suggestionIndexRequest;

  suggestionIndexRequest = loadPlatformSearchIndex()
    .then(index => {
      const profiles = index.profiles.flatMap<SearchSuggestion>(profile => {
        const displayName = normalizeSuggestion(profile.display_name);
        const username = normalizeSuggestion(profile.username).replace(/^@/, '');
        if (!displayName && !username) return [];

        const primary = displayName || `@${username}`;
        const secondary = username && username.toLocaleLowerCase() !== displayName.toLocaleLowerCase()
          ? `@${username}`
          : undefined;

        return [{
          key: `profile:${profile.id}`,
          primary,
          secondary,
          submitValue: displayName || username,
          searchValues: [displayName, username].filter(Boolean),
          href: creatorHref(profile),
        }];
      });
      const profileTerms = new Set(
        profiles.flatMap(profile => profile.searchValues.map(value => value.toLocaleLowerCase())),
      );
      const itemSuggestions = index.products.flatMap<SearchSuggestion>(item => {
        const title = normalizeSuggestion(item.title);
        if (!title) return [];
        return [{
          key: `item:${item.id}`,
          primary: title,
          submitValue: title,
          searchValues: [title],
          href: productBrowseHref(item),
        }];
      });
      const textSuggestions = createTextSuggestions([
        ...BASE_SEARCH_SUGGESTIONS,
        ...index.products.flatMap(item => [
          item.creators?.display_name,
          item.creator,
        ]),
      ]).filter(suggestion => (
        !suggestion.searchValues.some(value => profileTerms.has(value.toLocaleLowerCase()))
      ));

      return [...profiles, ...itemSuggestions, ...textSuggestions];
    })
    .then(suggestions => {
      suggestionIndexCache = suggestions;
      return suggestions;
    })
    .finally(() => {
      suggestionIndexRequest = null;
    });

  return suggestionIndexRequest;
}

function rankSuggestion(value: string, query: string) {
  const normalizedSuggestion = value.toLocaleLowerCase();
  const normalizedQuery = query.toLocaleLowerCase();
  if (normalizedSuggestion === normalizedQuery) return 0;
  if (normalizedSuggestion.startsWith(normalizedQuery)) return 1;
  const wordIndex = normalizedSuggestion.split(/\s+/).findIndex(word => word.startsWith(normalizedQuery));
  if (wordIndex >= 0) return 2 + wordIndex;
  return 20 + normalizedSuggestion.indexOf(normalizedQuery);
}

export function MobileSearchOverlay({
  open,
  value,
  onValueChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (value: string, href?: string) => void;
}) {
  const [suggestionIndex, setSuggestionIndex] = useState<SearchSuggestion[]>(
    createTextSuggestions(BASE_SEARCH_SUGGESTIONS),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    document.body.classList.add('os-mobile-search-active');
    void loadSuggestionIndex()
      .then(suggestions => {
        if (alive) setSuggestionIndex(suggestions);
      })
      .catch(() => {
        if (alive) setSuggestionIndex(createTextSuggestions(BASE_SEARCH_SUGGESTIONS));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      alive = false;
      document.body.classList.remove('os-mobile-search-active');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const query = value.trim();
  const suggestions = useMemo(() => {
    if (!query) return [];
    const supportSuggestions = createTextSuggestions(
      searchSupportArticles(query, 6).map(article => article.title),
    );
    const seen = new Set<string>();
    return [...suggestionIndex, ...supportSuggestions]
      .filter(suggestion => {
        if (seen.has(suggestion.key)) return false;
        seen.add(suggestion.key);
        return suggestion.searchValues.some(value => (
          value.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        ));
      })
      .sort((a, b) => (
        Math.min(...a.searchValues.map(value => rankSuggestion(value, query)))
        - Math.min(...b.searchValues.map(value => rankSuggestion(value, query)))
        || a.primary.localeCompare(b.primary)
      ))
      .slice(0, 8);
  }, [query, suggestionIndex]);

  if (!open) return null;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <div className="os-mobile-search-overlay" role="dialog" aria-modal="true" aria-label="Search 44OS">
      <form className="os-mobile-search-overlay-bar" role="search" onSubmit={submitSearch}>
        <button
          type="button"
          className="os-mobile-search-overlay-back"
          aria-label="Close search"
          onClick={onClose}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <div className="os-mobile-search-overlay-field ui44-composed-field ui44-composed-field-search">
          <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
          <Ui44TextInput
            surface="bare"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={event => onValueChange(event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onSubmit(value);
            }}
            placeholder="Search"
            aria-label="Search 44OS"
          />
          {value && (
            <button
              type="button"
              className="os-topbar-search-clear"
              aria-label="Clear search"
              onClick={() => onValueChange('')}
            >
              ×
            </button>
          )}
        </div>
      </form>

      <div className="os-mobile-search-suggestions" aria-live="polite">
        {query && loading && suggestions.length === 0 ? (
          <div className="os-mobile-search-status">Finding suggestions…</div>
        ) : query && suggestions.length === 0 ? (
          <button
            type="button"
            className="os-mobile-search-suggestion"
            onClick={() => onSubmit(query)}
          >
            <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            <span>{query}</span>
          </button>
        ) : (
          suggestions.map(suggestion => (
            <button
              key={suggestion.key}
              type="button"
              className="os-mobile-search-suggestion"
              onClick={() => onSubmit(suggestion.submitValue, suggestion.href)}
            >
              <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
              <span className="os-mobile-search-suggestion-label">
                <span>{suggestion.primary}</span>
                {suggestion.secondary && (
                  <span className="os-mobile-search-suggestion-secondary">
                    {suggestion.secondary}
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
