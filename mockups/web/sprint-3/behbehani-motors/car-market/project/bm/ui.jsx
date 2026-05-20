/* eslint-disable */
// Shared UI primitives for Behbehani Motors

// ---------- Icons (Lucide-style, inline SVG) ----------
const Icon = ({name, size=20, color="currentColor", stroke=1.75, className=""}) => {
  const props = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:stroke, strokeLinecap:"round", strokeLinejoin:"round", className };
  switch(name){
    case "search":    return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "heart":     return <svg {...props}><path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z"/></svg>;
    case "heart-fill":return <svg {...props} fill={color}><path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z"/></svg>;
    case "user":      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "menu":      return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "x":         return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chevron-down":return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-right":return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-left":return <svg {...props}><path d="m15 6-6 6 6 6"/></svg>;
    case "arrow-right":return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-left":return <svg {...props}><path d="M19 12H5M11 19l-7-7 7-7"/></svg>;
    case "check":     return <svg {...props}><path d="M4 12.5 9 18l11-12"/></svg>;
    case "check-circle":return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>;
    case "shield":    return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "truck":     return <svg {...props}><path d="M2 17h14V6H2zM16 10h4l2 3v4h-6"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>;
    case "return":    return <svg {...props}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>;
    case "car":       return <svg {...props}><path d="M5 11 7 6h10l2 5M3 17h18M5 11h14v6H5z"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/></svg>;
    case "fuel":      return <svg {...props}><path d="M3 22V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v18"/><path d="M14 8h2a3 3 0 0 1 3 3v7a2 2 0 0 0 4 0V8l-3-3"/><path d="M3 22h12"/></svg>;
    case "gauge":     return <svg {...props}><path d="M12 14 19 7"/><circle cx="12" cy="14" r="9"/></svg>;
    case "calendar":  return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>;
    case "phone":     return <svg {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L7.9 9.7a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/></svg>;
    case "whatsapp":  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.5 3.5A11 11 0 0 0 2.2 16.6L1 22l5.6-1.5a11 11 0 0 0 5.3 1.3 11 11 0 0 0 8.6-18.3Zm-8.6 17a9 9 0 0 1-4.6-1.3l-.3-.2-3.3.9.9-3.2-.2-.3a9 9 0 1 1 7.5 4.1Zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.2-.7.9-.9 1-.3.2-.6 0a7.5 7.5 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5a.5.5 0 0 0 0-.5c-.1-.1-.6-1.4-.8-2s-.5-.5-.6-.5h-.6a1 1 0 0 0-.8.4 3 3 0 0 0-1 2.3c0 1.4 1 2.7 1.2 2.9a10.6 10.6 0 0 0 4.4 3.9c2.6 1 2.6.6 3 .6a2.6 2.6 0 0 0 1.7-1.2 2 2 0 0 0 .2-1.2c-.1-.2-.3-.2-.6-.3Z"/></svg>;
    case "globe":     return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>;
    case "camera":    return <svg {...props}><path d="M21 17V8a2 2 0 0 0-2-2h-3l-2-2H10L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case "map-pin":   return <svg {...props}><path d="M20 11c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="11" r="3"/></svg>;
    case "clock":     return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>;
    case "filter":    return <svg {...props}><path d="M3 5h18l-7 9v5l-4 2v-7L3 5Z"/></svg>;
    case "grid":      return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "list":      return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case "play":      return <svg {...props} fill={color}><path d="M6 4v16l14-8z"/></svg>;
    case "rotate":    return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "share":     return <svg {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case "star":      return <svg {...props} fill={color} stroke="none"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>;
    case "star-line": return <svg {...props}><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>;
    case "info":      return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/></svg>;
    case "dollar":    return <svg {...props}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "calc":      return <svg {...props}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>;
    case "doc":       return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></svg>;
    case "upload":    return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;
    case "sparkle":   return <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/></svg>;
    case "wrench":    return <svg {...props}><path d="M14 7a3 3 0 1 0 4 4l4 4-3 3-4-4a3 3 0 0 1-4-4l-3-3 3-3 3 3Z"/></svg>;
    case "logo":      return <svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M6 22 L6 10 L13 10 A4 4 0 0 1 13 18 L9 18 L9 22 Z M9 13 L9 15 L13 15 A1.5 1.5 0 0 0 13 13 Z" fill={color}/><circle cx="22" cy="16" r="6" stroke={color} strokeWidth="2.5"/><circle cx="22" cy="16" r="2" fill={color}/></svg>;
    default: return null;
  }
};

// ---------- Buttons ----------
const Button = ({variant="primary", size="md", as="button", icon, iconRight, children, ...rest}) => {
  const Tag = as;
  const cls = `btn btn-${variant} btn-${size} ${rest.className||""}`;
  return <Tag {...rest} className={cls}>
    {icon && <Icon name={icon} size={size==="lg"?20:16}/>}
    {children && <span>{children}</span>}
    {iconRight && <Icon name={iconRight} size={size==="lg"?20:16}/>}
  </Tag>;
};

const IconButton = ({icon, size=18, label, active=false, ...rest}) => (
  <button {...rest} aria-label={label} className={`icon-btn ${active?"is-active":""} ${rest.className||""}`}>
    <Icon name={icon} size={size}/>
  </button>
);

// ---------- Badge / Chip ----------
const Badge = ({variant="default", icon, children, ...rest}) => (
  <span {...rest} className={`badge badge-${variant} ${rest.className||""}`}>
    {icon && <Icon name={icon} size={12}/>}
    {children}
  </span>
);

const Chip = ({active, onClick, children, icon, count}) => (
  <button onClick={onClick} className={`chip ${active?"is-active":""}`}>
    {icon && <Icon name={icon} size={14}/>}
    <span>{children}</span>
    {count!==undefined && <span className="chip-count">{count}</span>}
  </button>
);

// ---------- Car image (with onError fallback) ----------
const CarImage = ({car, className="", style={}, sizes="800px"}) => {
  const [failed, setFailed] = React.useState(false);
  if (failed || !car.image) {
    return (
      <div className={`car-img-fallback ${className}`}
           style={{...style, background:`linear-gradient(135deg, ${car.color} 0%, ${car.color}cc 60%, #0b1220 100%)`}}>
        <svg viewBox="0 0 200 80" width="70%" preserveAspectRatio="xMidYMid meet" style={{opacity:.55}}>
          <path d="M10 60 Q15 55 25 55 L40 35 Q50 28 70 28 L120 28 Q140 28 155 38 L175 50 Q188 52 190 60 L190 65 L10 65 Z" fill="rgba(255,255,255,.85)"/>
          <circle cx="55" cy="65" r="11" fill="#101319"/>
          <circle cx="150" cy="65" r="11" fill="#101319"/>
          <circle cx="55" cy="65" r="4.5" fill="#d0d4dc"/>
          <circle cx="150" cy="65" r="4.5" fill="#d0d4dc"/>
        </svg>
      </div>
    );
  }
  return <img src={car.image} alt={`${car.year} ${car.model}`} loading="lazy" sizes={sizes}
              onError={()=>setFailed(true)}
              className={`car-img ${className}`} style={style}/>;
};

// ---------- Car Card ----------
const CarCard = ({car, locale, fav, onToggleFav, onOpen, compact=false}) => {
  const b = brandOf(car.brand);
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <article className={`car-card ${compact?"is-compact":""}`} onClick={()=>onOpen(car.id)}>
      <div className="car-card-media">
        <CarImage car={car}/>
        <div className="car-card-badges">
          {car.badge && <Badge variant={
            car.badge==="Premium"?"gold":
            car.badge==="Price Drop"?"red":
            car.badge==="Self-listed"?"slate":
            "royal"
          }>{car.badge}</Badge>}
          {car.inspected && <Badge variant="white" icon="shield">{t("Inspected","مفحوصة")}</Badge>}
        </div>
        <button className="car-card-fav" aria-label="Favorite"
                onClick={(e)=>{e.stopPropagation(); onToggleFav(car.id);}}>
          <Icon name={fav?"heart-fill":"heart"} size={18} color={fav?"#dc2626":"#fff"}/>
        </button>
      </div>
      <div className="car-card-body">
        <header className="car-card-head">
          <div>
            <div className="car-card-brand">{t(b.name, b.nameAr)} · {car.year}</div>
            <h3 className="car-card-title">{car.model}</h3>
          </div>
        </header>
        <div className="car-card-specs">
          <span><Icon name="gauge" size={13}/> {fmtKM(car.mileage, locale)}</span>
          <span><Icon name="fuel"  size={13}/> {car.fuel}</span>
          <span><Icon name="car"   size={13}/> {car.transmission==="Automatic"?"Auto":"Manual"}</span>
        </div>
        <footer className="car-card-foot">
          <div>
            <div className="car-card-price">{fmtKWD(car.price, locale)}</div>
            <div className="car-card-monthly">{t("from","من")} {fmtKWD(car.monthly, locale)}/{t("mo","شهر")}</div>
          </div>
          <button className="car-card-cta" onClick={(e)=>{e.stopPropagation(); onOpen(car.id);}}>
            <Icon name="arrow-right" size={16}/>
          </button>
        </footer>
      </div>
    </article>
  );
};

// ---------- Toast ----------
const Toast = ({msg, kind="info"}) => msg ? (
  <div className={`toast toast-${kind}`} role="status">
    <Icon name={kind==="success"?"check-circle":"info"} size={18}/>
    <span>{msg}</span>
  </div>
) : null;

// ---------- Section title ----------
const SectionHead = ({eyebrow, title, sub, action}) => (
  <header className="section-head">
    <div>
      {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
    {action}
  </header>
);

// ---------- Range slider with two thumbs (price / mileage) ----------
const RangeSlider = ({min, max, step=1, value, onChange, format}) => {
  const [lo, hi] = value;
  const pct = (v) => ((v-min)/(max-min))*100;
  return (
    <div className="rng">
      <div className="rng-track">
        <div className="rng-fill" style={{left:`${pct(lo)}%`, right:`${100-pct(hi)}%`}}/>
      </div>
      <input type="range" min={min} max={max} step={step} value={lo}
             onChange={(e)=>onChange([Math.min(+e.target.value, hi), hi])}/>
      <input type="range" min={min} max={max} step={step} value={hi}
             onChange={(e)=>onChange([lo, Math.max(+e.target.value, lo)])}/>
      <div className="rng-labels">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>
    </div>
  );
};

// Brand logo component — uses bundled blob URL when available, else Google favicon CDN
const BrandLogo = ({brand, size=32}) => {
  const [failed, setFailed] = React.useState(false);
  const b = typeof brand === "string" ? brandOf(brand) : brand;
  const bundled = (typeof window!=="undefined" && window.__resources && window.__resources["logo_"+b.id]);
  const src = bundled || (b.domain ? `https://www.google.com/s2/favicons?domain=${b.domain}&sz=128` : null);
  if (failed || !src) {
    return <span style={{fontFamily:"var(--f-display)", fontWeight:500, fontSize:size*0.7, color:"var(--ink)"}}>{b.name.charAt(0)}</span>;
  }
  return (
    <img src={src}
         alt={b.name}
         width={size} height={size}
         style={{width:size, height:size, objectFit:"contain"}}
         onError={()=>setFailed(true)}/>
  );
};
Object.assign(window, { BrandLogo });
