const categories = [
  { label: 'All Items', count: 49, icon: '/icons/browse/grid.svg' },
  { label: 'Music', count: 15, icon: '/icons/browse/music.svg' },
  { label: 'Experiences', count: 1, icon: '/icons/browse/games.svg' },
  { label: 'Books', count: 1, icon: '/icons/browse/books.svg' },
  { label: 'Apparel', count: 31, icon: '/icons/browse/apparel.svg' },
  { label: 'Assets', count: 1, icon: '/icons/browse/assets.svg' },
];

const products = [
  {
    title: 'mask',
    creator: '44 Studios',
    price: 'Free',
    category: 'Music',
    artwork:
      'linear-gradient(135deg, rgba(17,22,25,.98), rgba(30,60,48,.85) 42%, rgba(235,96,156,.72))',
  },
  {
    title: 'Patch',
    creator: '44 Apparel',
    price: '$9.99',
    category: 'Apparel',
    artwork:
      'radial-gradient(circle at center, rgba(255,255,255,.98), rgba(210,210,210,.92) 46%, rgba(20,20,22,.96) 47%)',
  },
  {
    title: 'THE GREAT SHADOWSEA',
    creator: '44 Experiences',
    price: 'Free',
    category: 'Experiences',
    artwork:
      'linear-gradient(90deg, rgba(5,5,8,.98), rgba(245,245,245,.95) 48%, rgba(10,10,12,.98) 52%)',
  },
  {
    title: 'broken',
    creator: 'ØLSTEN',
    price: 'Free',
    category: 'Music',
    artwork:
      'linear-gradient(135deg, rgba(3,3,5,.98), rgba(235,235,240,.9) 58%, rgba(8,8,10,.96))',
  },
  {
    title: 'touch',
    creator: 'ØLSTEN',
    price: 'Free',
    category: 'Music',
    artwork:
      'linear-gradient(135deg, rgba(250,250,245,.95), rgba(40,40,42,.72) 46%, rgba(7,7,9,.98))',
  },
  {
    title: 'everything before',
    creator: 'ØLSTEN',
    price: 'Free',
    category: 'Music',
    artwork:
      'linear-gradient(135deg, rgba(42,68,62,.95), rgba(88,122,112,.72), rgba(12,20,22,.98))',
  },
  {
    title: 'here comes the feeling',
    creator: 'ØLSTEN',
    price: 'Free',
    category: 'Music',
    artwork:
      'linear-gradient(135deg, rgba(255,170,72,.82), rgba(118,74,42,.72) 52%, rgba(24,18,14,.92))',
  },
  {
    title: '44 Asset Kit',
    creator: '44 Resources',
    price: '$12',
    category: 'Assets',
    artwork:
      'linear-gradient(135deg, rgba(235,238,232,.92), rgba(165,175,170,.72), rgba(70,78,80,.82))',
  },
  {
    title: 'Digital Companion',
    creator: '44 Books',
    price: '$8',
    category: 'Books',
    artwork:
      'linear-gradient(135deg, rgba(238,226,204,.95), rgba(140,112,82,.68), rgba(40,32,26,.92))',
  },
  {
    title: 'Signal Pack',
    creator: 'Studio Tools',
    price: '$18',
    category: 'Assets',
    artwork:
      'linear-gradient(135deg, rgba(80,210,255,.78), rgba(52,70,120,.72), rgba(10,14,24,.96))',
  },
  {
    title: 'Night Archive',
    creator: 'Miro Systems',
    price: 'Free',
    category: 'Experiences',
    artwork:
      'linear-gradient(135deg, rgba(22,22,34,.98), rgba(100,80,180,.68), rgba(8,8,14,.98))',
  },
  {
    title: 'Core Hoodie',
    creator: '44 Apparel',
    price: '$64',
    category: 'Apparel',
    artwork:
      'linear-gradient(135deg, rgba(245,245,238,.94), rgba(170,172,166,.78), rgba(56,58,62,.92))',
  },
];

const navItems = ['Store', 'Services', 'Resources', 'Community', 'Library'];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m16.2 16.2 4.1 4.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12.2a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4.8 20.1c1.2-3.7 3.6-5.5 7.2-5.5s6 1.8 7.2 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FortyOSBrowseDesignPage() {
  return (
    <main
      className="page-scroll"
      style={{
        padding: 0,
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      <style>{`
        .nav-shell {
          display: none !important;
        }

        .app-main {
          height: 100vh;
        }

        .forty-browse-nav-item,
        .forty-browse-category,
        .forty-browse-card,
        .forty-browse-icon-button,
        .forty-browse-favorite {
          transition:
            transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
            background 180ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 180ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .forty-browse-nav-item:hover {
          background: rgba(255,255,255,.13) !important;
          border-color: rgba(255,255,255,.2) !important;
        }

        .forty-browse-category:hover {
          background: rgba(255,255,255,.12) !important;
          border-color: rgba(255,255,255,.22) !important;
        }

        .forty-browse-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,.34) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.26),
            0 24px 54px rgba(40,44,44,.2) !important;
        }

        .forty-browse-card:hover .forty-browse-artwork {
          transform: scale(1.018);
        }

        .forty-browse-icon-button:hover,
        .forty-browse-favorite:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,.22) !important;
          border-color: rgba(255,255,255,.36) !important;
        }

        .forty-browse-artwork {
          transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .forty-browse-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .forty-browse-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .forty-browse-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.22);
          border-radius: 999px;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          padding: 18,
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 18% 12%, rgba(255,255,255,.88), transparent 30%), radial-gradient(circle at 82% 16%, rgba(198,214,206,.62), transparent 34%), radial-gradient(circle at 50% 88%, rgba(170,160,132,.38), transparent 44%), linear-gradient(135deg, #e4e5df 0%, #c7cbc3 44%, #92958c 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -48,
            pointerEvents: 'none',
            backdropFilter: 'blur(24px) saturate(1.06)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.06)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.02)), radial-gradient(circle at center, rgba(255,255,255,.14), rgba(72,76,74,.32) 82%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.14,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.28) 1px, transparent 1px)',
            backgroundSize: '3px 3px',
            maskImage: 'radial-gradient(circle at center, black, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 78%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: 'calc(100vh - 36px)',
            display: 'grid',
            gridTemplateRows: '56px minmax(0, 1fr)',
            gap: 18,
          }}
        >
          <header
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
            }}
          >
            <button
              className="forty-browse-icon-button"
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                color: 'rgba(255,255,255,.92)',
                background: 'rgba(82,88,90,.42)',
                border: '1px solid rgba(255,255,255,.34)',
                backdropFilter: 'blur(22px) saturate(1.14)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.14)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,.32), 0 14px 34px rgba(70,72,68,.16)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <UserIcon />
            </button>

            <nav
              style={{
                gridColumn: 2,
                justifySelf: 'center',
                display: 'flex',
                gap: 4,
                padding: 5,
                borderRadius: 999,
                background: 'rgba(82,88,90,.42)',
                border: '1px solid rgba(255,255,255,.34)',
                backdropFilter: 'blur(22px) saturate(1.14)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.14)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,.32), 0 18px 46px rgba(70,72,68,.16)',
              }}
            >
              {navItems.map((item, index) => (
                <span
                  key={item}
                  className="forty-browse-nav-item"
                  style={{
                    minWidth: 112,
                    minHeight: 34,
                    padding: '0 17px',
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    color: index === 0 ? '#fff' : 'rgba(255,255,255,.78)',
                    background: index === 0 ? 'rgba(255,255,255,.2)' : 'transparent',
                    border:
                      index === 0
                        ? '1px solid rgba(255,255,255,.32)'
                        : '1px solid transparent',
                    fontSize: 11,
                    fontWeight: 760,
                    letterSpacing: '.13em',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 12px rgba(0,0,0,.18)',
                  }}
                >
                  {item}
                </span>
              ))}
            </nav>

            <div
              style={{
                gridColumn: 3,
                justifySelf: 'end',
                width: 276,
                minHeight: 38,
                borderRadius: 999,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                padding: '0 13px 0 16px',
                background: 'rgba(68,74,76,.34)',
                border: '1px solid rgba(255,255,255,.22)',
                boxShadow:
                  'inset 0 1px 3px rgba(0,0,0,.16), inset 0 -1px 0 rgba(255,255,255,.14), 0 1px 0 rgba(255,255,255,.18)',
                backdropFilter: 'blur(18px) saturate(1.08)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.08)',
                color: 'rgba(255,255,255,.72)',
                fontSize: 12,
                fontWeight: 560,
                textShadow: '0 1px 12px rgba(0,0,0,.14)',
              }}
            >
              Search products...
              <span style={{ color: '#fff', display: 'grid', placeItems: 'center' }}>
                <SearchIcon />
              </span>
            </div>
          </header>

          <section
            style={{
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: '300px minmax(0, 1fr)',
              gap: 18,
            }}
          >
            <aside
              style={{
                minHeight: 0,
                borderRadius: 30,
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(76,84,88,.46)',
                border: '1px solid rgba(255,255,255,.28)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 0 rgba(0,0,0,.16), 0 24px 70px rgba(56,58,56,.18)',
                backdropFilter: 'blur(32px) saturate(1.12)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.12)',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 31,
                  lineHeight: 0.98,
                  fontWeight: 760,
                  letterSpacing: '-.052em',
                  color: '#fff',
                  textShadow: '0 1px 18px rgba(0,0,0,.18)',
                }}
              >
                Browse
              </h1>

              <div
                style={{
                  height: 1,
                  margin: '22px 0 18px',
                  background: 'rgba(255,255,255,.2)',
                }}
              />

              <div style={{ display: 'grid', gap: 7 }}>
                {categories.map((category, index) => (
                  <div
                    key={category.label}
                    className="forty-browse-category"
                    style={{
                      minHeight: 52,
                      display: 'grid',
                      gridTemplateColumns: '30px minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '0 12px',
                      borderRadius: 15,
                      color: index === 0 ? '#fff' : 'rgba(255,255,255,.8)',
                      background: index === 0 ? 'rgba(255,255,255,.18)' : 'transparent',
                      border:
                        index === 0
                          ? '1px solid rgba(255,255,255,.3)'
                          : '1px solid transparent',
                      boxShadow:
                        index === 0
                          ? 'inset 0 1px 0 rgba(255,255,255,.28), 0 10px 24px rgba(40,44,44,.12)'
                          : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={category.icon}
                      alt=""
                      style={{
                        width: 21,
                        height: 21,
                        opacity: index === 0 ? 0.98 : 0.76,
                        filter: 'brightness(0) invert(1)',
                      }}
                    />

                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 740,
                        letterSpacing: '-.024em',
                      }}
                    >
                      {category.label}
                    </span>

                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,.64)',
                      }}
                    >
                      {category.count}
                    </span>
                  </div>
                ))}
              </div>
            </aside>

            <section

  style={{

    minHeight: 0,

    overflow: 'hidden',

  }}

                >
              <div
                className="forty-browse-scroll"
                 style={{
                     height: '100%',
                    overflow: 'auto',
                    paddingRight: 4,
                    paddingBottom: 24,
                }}
                >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  {products.map((product) => (
                    <article
                      key={product.title}
                      className="forty-browse-card"
                      style={{
                        minHeight: 302,
                        borderRadius: 22,
                        overflow: 'hidden',
                       background: 'rgba(236,235,224,.82)',

border: '1px solid rgba(255,255,255,.42)',

boxShadow:

  'inset 0 1px 0 rgba(255,255,255,.54), 0 20px 48px rgba(54,58,56,.18)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        className="forty-browse-artwork"
                        style={{
                          aspectRatio: '1 / 1',
                          position: 'relative',
                          background: product.artwork,
                        }}
                      >
                        <button
                          className="forty-browse-favorite"
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            color: '#fff',
                            background: 'rgba(18,22,28,.28)',
                            border: '1px solid rgba(255,255,255,.24)',
                            fontSize: 18,
                            cursor: 'pointer',
                          }}
                        >
                          ♡
                        </button>
                      </div>

                      <div
                        style={{
                          minHeight: 82,
                          padding: '14px 16px',
                          display: 'grid',
                          gridTemplateRows: 'auto auto',
                          gap: 8,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: '#fff',
                            fontSize: 17,
                            lineHeight: 1.08,
                            fontWeight: 730,
                            letterSpacing: '-.038em',
                            textShadow: '0 1px 14px rgba(0,0,0,.18)',
                          }}
                        >
                          {product.title}
                        </h3>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            gap: 10,
                            alignItems: 'baseline',
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: 'rgba(255,255,255,.66)',
                              fontSize: 12,
                              fontWeight: 560,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {product.creator}
                          </p>

                          <strong
                            style={{
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 760,
                              letterSpacing: '-.03em',
                            }}
                          >
                            {product.price}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}