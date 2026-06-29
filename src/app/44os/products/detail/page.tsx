const navItems = ['Store', 'Services', 'Resources', 'Community', 'Library'];

const includedItems = [
  '12 audio tracks',
  'Digital booklet',
  'Interactive world',
  'Achievements',
  'Downloadable artwork',
];

const relatedItems = [
  {
    title: 'everything before',
    creator: 'ØLSTEN',
    price: 'Free',
    artwork:
      'linear-gradient(135deg, rgba(42,68,62,.95), rgba(88,122,112,.72), rgba(12,20,22,.98))',
  },
  {
    title: 'touch',
    creator: 'ØLSTEN',
    price: 'Free',
    artwork:
      'linear-gradient(135deg, rgba(250,250,245,.95), rgba(40,40,42,.72) 46%, rgba(7,7,9,.98))',
  },
  {
    title: 'broken',
    creator: 'ØLSTEN',
    price: 'Free',
    artwork:
      'linear-gradient(135deg, rgba(3,3,5,.98), rgba(235,235,240,.9) 58%, rgba(8,8,10,.96))',
  },
];

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

export default function FortyOSProductDetailDesignPage() {
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

        .forty-detail-nav-item,
        .forty-detail-card,
        .forty-detail-button,
        .forty-detail-icon-button,
        .forty-detail-row {
          transition:
            transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
            background 180ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 180ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .forty-detail-nav-item:hover {
          background: rgba(255,255,255,.13) !important;
          border-color: rgba(255,255,255,.2) !important;
        }

        .forty-detail-button:hover,
        .forty-detail-icon-button:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,.22) !important;
          border-color: rgba(255,255,255,.36) !important;
        }

        .forty-detail-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,.36) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.26),
            0 24px 54px rgba(40,44,44,.2) !important;
        }

        .forty-detail-row:hover {
          background: rgba(255,255,255,.12) !important;
          border-color: rgba(255,255,255,.22) !important;
        }

        .forty-detail-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .forty-detail-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .forty-detail-scroll::-webkit-scrollbar-thumb {
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
              className="forty-detail-icon-button"
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
                  className="forty-detail-nav-item"
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
              gridTemplateColumns: 'minmax(0, 1fr) 330px',
              gap: 18,
            }}
          >
            <section
              className="forty-detail-scroll"
              style={{
                minHeight: 0,
                overflow: 'auto',
                paddingRight: 4,
                paddingBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 18,
                }}
              >
                <section
                  style={{
                    minHeight: 500,
                    borderRadius: 34,
                    overflow: 'hidden',
                    position: 'relative',
                    background:
                      'linear-gradient(135deg, rgba(255,170,72,.82), rgba(118,74,42,.72) 52%, rgba(24,18,14,.92))',
                    boxShadow: '0 28px 70px rgba(48,50,46,.2)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(90deg, rgba(0,0,0,.44), rgba(0,0,0,.1) 58%, rgba(0,0,0,.18))',
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      minHeight: 500,
                      padding: 42,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      maxWidth: 720,
                    }}
                  >
                    <div
                      style={{
                        color: 'rgba(255,255,255,.72)',
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '.14em',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                      }}
                    >
                      Music release
                    </div>

                    <h1
                      style={{
                        margin: 0,
                        color: '#fff',
                        fontSize: 64,
                        lineHeight: 0.94,
                        fontWeight: 760,
                        letterSpacing: '-.064em',
                        textShadow: '0 2px 28px rgba(0,0,0,.24)',
                      }}
                    >
                      here comes the feeling
                    </h1>

                    <p
                      style={{
                        margin: '18px 0 0',
                        color: 'rgba(255,255,255,.78)',
                        fontSize: 18,
                        lineHeight: 1.45,
                        fontWeight: 520,
                        maxWidth: 520,
                      }}
                    >
                      A flagship release by ØLSTEN. Stream the music, unlock discoveries,
                      and enter the world around the album.
                    </p>
                  </div>
                </section>

                <section
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 14,
                  }}
                >
                  {relatedItems.map((item) => (
                    <article
                      key={item.title}
                      className="forty-detail-card"
                      style={{
                        minHeight: 280,
                        borderRadius: 22,
                        overflow: 'hidden',
                        background: 'rgba(236,235,224,.84)',
                        border: '1px solid rgba(255,255,255,.42)',
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,.54), 0 20px 48px rgba(54,58,56,.18)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: '1 / 1',
                          background: item.artwork,
                        }}
                      />

                      <div
                        style={{
                          padding: '14px 16px',
                          display: 'grid',
                          gap: 8,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: 'rgba(30,32,30,.92)',
                            fontSize: 17,
                            lineHeight: 1.08,
                            fontWeight: 730,
                            letterSpacing: '-.038em',
                          }}
                        >
                          {item.title}
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
                              color: 'rgba(30,32,30,.58)',
                              fontSize: 12,
                              fontWeight: 560,
                            }}
                          >
                            {item.creator}
                          </p>

                          <strong
                            style={{
                              color: 'rgba(30,32,30,.92)',
                              fontSize: 14,
                              fontWeight: 760,
                              letterSpacing: '-.03em',
                            }}
                          >
                            {item.price}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            </section>

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
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 24,
                  background:
                    'linear-gradient(135deg, rgba(255,170,72,.82), rgba(118,74,42,.72) 52%, rgba(24,18,14,.92))',
                  boxShadow: '0 18px 48px rgba(40,44,44,.18)',
                  marginBottom: 20,
                }}
              />

              <div
                style={{
                  color: 'rgba(255,255,255,.72)',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                ØLSTEN
              </div>

              <h2
                style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: 28,
                  lineHeight: 1,
                  fontWeight: 760,
                  letterSpacing: '-.052em',
                  textShadow: '0 1px 18px rgba(0,0,0,.18)',
                }}
              >
                here comes the feeling
              </h2>

              <p
                style={{
                  margin: '10px 0 18px',
                  color: 'rgba(255,255,255,.72)',
                  fontSize: 13,
                  lineHeight: 1.45,
                  fontWeight: 520,
                }}
              >
                Includes audio, downloads, achievements, and unlockable content.
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <button
                  className="forty-detail-button"
                  style={{
                    minHeight: 46,
                    borderRadius: 999,
                    color: 'rgba(30,32,28,.92)',
                    background: 'rgba(255,255,255,.92)',
                    border: '1px solid rgba(255,255,255,.42)',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Add to Library
                </button>

                <button
                  className="forty-detail-button"
                  style={{
                    minHeight: 42,
                    borderRadius: 999,
                    color: '#fff',
                    background: 'rgba(255,255,255,.12)',
                    border: '1px solid rgba(255,255,255,.22)',
                    fontSize: 13,
                    fontWeight: 760,
                    cursor: 'pointer',
                  }}
                >
                  Preview
                </button>
              </div>

              <div
                style={{
                  height: 1,
                  background: 'rgba(255,255,255,.18)',
                  margin: '4px 0 16px',
                }}
              />

              <div style={{ display: 'grid', gap: 8 }}>
                {includedItems.map((item) => (
                  <div
                    key={item}
                    className="forty-detail-row"
                    style={{
                      minHeight: 42,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      color: 'rgba(255,255,255,.78)',
                      background: 'rgba(255,255,255,.07)',
                      border: '1px solid rgba(255,255,255,.1)',
                      fontSize: 13,
                      fontWeight: 620,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div
                  style={{
                    color: 'rgba(255,255,255,.56)',
                    fontSize: 11,
                    fontWeight: 760,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Status
                </div>

                <div
                  style={{
                    minHeight: 44,
                    borderRadius: 16,
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#fff',
                    background: 'rgba(255,255,255,.1)',
                    border: '1px solid rgba(255,255,255,.14)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Free release
                  <span>Free</span>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}