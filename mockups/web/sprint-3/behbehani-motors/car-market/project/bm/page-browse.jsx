/* eslint-disable */
// Browse / Listings page — Carvana-inspired rich filters, sort, grid/list

const FILTER_SECTIONS = [
  "price","monthly","year","mileage","make","body","transmission","fuel","drive","cylinders","color","interior","seats","specs","seller","features","trust"
];

const FilterPanel = ({filters, setF, count, locale, onReset}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [open, setOpen] = React.useState(new Set([
    "price","monthly","year","mileage","make","body"
  ]));
  const toggleSec = (k) => {
    const n = new Set(open);
    n.has(k) ? n.delete(k) : n.add(k);
    setOpen(n);
  };
  const toggle = (key, val) => {
    const set = new Set(filters[key] || []);
    set.has(val) ? set.delete(val) : set.add(val);
    setF({...filters, [key]: [...set]});
  };
  const has = (key, val) => (filters[key] || []).includes(val);

  // Carvana-style filter section wrapper
  const Sec = ({id, title, children, count}) => (
    <div className={`fp-sec ${open.has(id)?"open":""}`}>
      <button className="fp-sec-head" onClick={()=>toggleSec(id)}>
        <span className="fp-sec-title">{title}</span>
        {count > 0 && <span className="fp-sec-count">{count}</span>}
        <Icon name={open.has(id)?"chevron-down":"chevron-right"} size={14}/>
      </button>
      {open.has(id) && <div className="fp-sec-body">{children}</div>}
    </div>
  );

  const COLORS = [
    {id:"black",   n:"Black",  hex:"#0F172A"},
    {id:"white",   n:"White",  hex:"#FFFFFF", ring:true},
    {id:"silver",  n:"Silver", hex:"#C0C4C9"},
    {id:"gray",    n:"Gray",   hex:"#6B7280"},
    {id:"blue",    n:"Blue",   hex:"#1E3A8A"},
    {id:"red",     n:"Red",    hex:"#B91C1C"},
    {id:"green",   n:"Green",  hex:"#15803D"},
    {id:"beige",   n:"Beige",  hex:"#D4C9A8"},
    {id:"brown",   n:"Brown",  hex:"#78350F"},
    {id:"gold",    n:"Gold",   hex:"#B7791F"},
    {id:"orange",  n:"Orange", hex:"#EA580C"},
    {id:"yellow",  n:"Yellow", hex:"#FBBF24"},
  ];
  const BODY_SVG = {
    sedan:    "M5 30 Q7 25 12 24 L20 18 Q26 14 36 14 L48 14 Q58 14 64 20 L70 26 Q74 26 76 30 L76 34 L5 34 Z",
    suv:      "M6 28 Q8 22 14 22 L20 14 Q26 10 38 10 L52 10 Q62 10 68 16 L74 22 Q78 22 80 26 L80 34 L6 34 Z",
    coupe:    "M6 30 Q8 26 12 25 L24 16 Q34 13 46 14 L58 14 Q68 16 72 22 L76 28 L76 34 L6 34 Z",
    convertible: "M6 30 Q8 26 12 25 L20 22 Q28 19 38 19 L52 19 Q60 19 64 22 L72 26 Q76 26 78 30 L78 34 L6 34 Z",
    pickup:   "M5 28 L18 28 L24 18 L40 18 L42 28 L80 28 L80 34 L5 34 Z",
    hatchback:"M6 30 Q8 26 12 25 L22 16 Q28 14 38 14 L50 14 L68 28 L80 30 L80 34 L6 34 Z",
    minivan:  "M6 28 Q8 22 14 21 L18 14 Q24 11 40 11 L58 11 Q70 11 74 18 L78 24 L82 28 L82 34 L6 34 Z",
  };

  const FEATURES = [
    {id:"sunroof",     n:t("Sunroof / Moonroof","فتحة سقف")},
    {id:"leather",     n:t("Leather seats","مقاعد جلد")},
    {id:"heated",      n:t("Heated seats","مقاعد دافئة")},
    {id:"cooled",      n:t("Ventilated seats","مقاعد مبردة")},
    {id:"adaptive",    n:t("Adaptive cruise","تثبيت سرعة تكيفي")},
    {id:"camera360",   n:t("360° camera","كاميرا ٣٦٠")},
    {id:"blindspot",   n:t("Blind-spot monitor","مراقبة الزوايا")},
    {id:"carplay",     n:t("Apple CarPlay","آبل كاربلاي")},
    {id:"android",     n:t("Android Auto","أندرويد أوتو")},
    {id:"navigation",  n:t("Navigation","ملاحة")},
    {id:"bluetooth",   n:t("Bluetooth","بلوتوث")},
    {id:"keyless",     n:t("Keyless entry","دخول بلا مفتاح")},
    {id:"premium",     n:t("Premium audio","صوت ممتاز")},
    {id:"awd",         n:t("All-wheel drive","دفع كلي")},
    {id:"towhitch",    n:t("Tow hitch","قطر مقطورة")},
  ];

  // Active filter count by section
  const activeIn = (k) => (filters[k] || []).length;

  return (
    <aside className="filter-panel">
      <div className="filter-head">
        <h3>{t("Filters","الفلاتر")}</h3>
        <button className="link-btn" onClick={onReset}>{t("Clear all","مسح")}</button>
      </div>

      <Sec id="price" title={t("Price","السعر")}>
        <RangeSlider min={0} max={50000} step={500} value={filters.price}
                     onChange={(v)=>setF({...filters, price:v})}
                     format={(v)=>v>=1000?`KWD ${(v/1000).toFixed(0)}k`:`KWD ${v}`}/>
        <div className="fp-quick-row">
          {[[0,5000,"≤5K"],[5000,10000,"5-10K"],[10000,20000,"10-20K"],[20000,50000,"20K+"]].map(([lo,hi,l])=>(
            <button key={l} className="fp-quick-pill"
                    onClick={()=>setF({...filters, price:[lo,hi]})}>{l}</button>
          ))}
        </div>
      </Sec>

      <Sec id="monthly" title={t("Monthly payment","القسط الشهري")}>
        <RangeSlider min={0} max={1000} step={20} value={filters.monthly}
                     onChange={(v)=>setF({...filters, monthly:v})}
                     format={(v)=>`KWD ${v}`}/>
        <div className="fp-hint">{t("Based on 60-month, 20% down","مدة ٦٠ شهر، مقدم ٢٠٪")}</div>
      </Sec>

      <Sec id="year" title={t("Year","السنة")}>
        <RangeSlider min={2015} max={2026} step={1} value={filters.year}
                     onChange={(v)=>setF({...filters, year:v})}
                     format={(v)=>v}/>
      </Sec>

      <Sec id="mileage" title={t("Mileage","الممشى")}>
        <RangeSlider min={0} max={200000} step={5000} value={filters.mileage}
                     onChange={(v)=>setF({...filters, mileage:v})}
                     format={(v)=>v>=1000?`${(v/1000).toFixed(0)}k km`:`${v}`}/>
      </Sec>

      <Sec id="make" title={t("Make & model","الماركة والموديل")} count={activeIn("brands")}>
        <div className="fp-search">
          <Icon name="search" size={14} color="var(--muted)"/>
          <input placeholder={t("Search makes…","ابحث الماركات…")}/>
        </div>
        <div className="filter-checks scroll">
          {BRANDS.map(b=>(
            <label key={b.id}>
              <input type="checkbox" checked={has("brands",b.id)} onChange={()=>toggle("brands",b.id)}/>
              <span className="fp-make-line">
                <span className="fp-make-logo"><BrandLogo brand={b} size={18}/></span>
                <span>{t(b.name, b.nameAr)}</span>
                <em>{CARS.filter(c=>c.brand===b.id).length}</em>
              </span>
            </label>
          ))}
        </div>
      </Sec>

      <Sec id="body" title={t("Body style","الشكل")} count={activeIn("bodies")}>
        <div className="fp-body-grid">
          {BODY_TYPES.map(b=>(
            <button key={b.id}
                    className={`fp-body-tile ${has("bodies",b.id)?"on":""}`}
                    onClick={()=>toggle("bodies",b.id)}>
              <svg viewBox="0 0 86 40">
                <g fill="currentColor"><path d={BODY_SVG[b.id]}/></g>
                <circle cx="22" cy="34" r="4" fill="#0b1220"/>
                <circle cx="60" cy="34" r="4" fill="#0b1220"/>
              </svg>
              <span>{t(b.name, b.nameAr)}</span>
            </button>
          ))}
        </div>
      </Sec>

      <Sec id="transmission" title={t("Transmission","ناقل الحركة")} count={activeIn("transmission")}>
        <div className="filter-pills">
          {["Automatic","Manual","CVT"].map(x=>(
            <button key={x} className={`pill ${has("transmission",x)?"on":""}`}
                    onClick={()=>toggle("transmission",x)}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="fuel" title={t("Fuel type","الوقود")} count={activeIn("fuel")}>
        <div className="filter-pills">
          {[
            ["Petrol", "⛽"],["Diesel","🛢️"],["Hybrid","🌱"],["Electric","⚡"],
          ].map(([x,e])=>(
            <button key={x} className={`pill ${has("fuel",x)?"on":""}`}
                    onClick={()=>toggle("fuel",x)}>{e} {x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="drive" title={t("Drivetrain","الجر")} count={activeIn("drive")}>
        <div className="filter-pills">
          {["FWD","RWD","AWD","4WD"].map(x=>(
            <button key={x} className={`pill ${has("drive",x)?"on":""}`}
                    onClick={()=>toggle("drive",x)}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="cylinders" title={t("Cylinders","الأسطوانات")} count={activeIn("cyl")}>
        <div className="filter-pills">
          {["EV","3","4","6","8","10","12"].map(x=>(
            <button key={x} className={`pill ${has("cyl",x)?"on":""}`}
                    onClick={()=>toggle("cyl",x)}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="color" title={t("Exterior color","اللون الخارجي")} count={activeIn("color")}>
        <div className="fp-color-grid">
          {COLORS.map(c=>(
            <button key={c.id}
                    className={`fp-color ${has("color",c.id)?"on":""} ${c.ring?"ring":""}`}
                    title={c.n}
                    onClick={()=>toggle("color",c.id)}>
              <span className="fp-color-sw" style={{background:c.hex}}>
                {has("color",c.id) && <Icon name="check" size={12} color={c.id==="white"||c.id==="yellow"||c.id==="silver"?"#0F172A":"#fff"}/>}
              </span>
              <span className="fp-color-name">{c.n}</span>
            </button>
          ))}
        </div>
      </Sec>

      <Sec id="interior" title={t("Interior color","اللون الداخلي")} count={activeIn("intColor")}>
        <div className="filter-pills">
          {["Black","Beige","Gray","Brown","White","Red"].map(x=>(
            <button key={x} className={`pill ${has("intColor",x)?"on":""}`}
                    onClick={()=>toggle("intColor",x)}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="seats" title={t("Seats","المقاعد")} count={activeIn("seats")}>
        <div className="filter-pills">
          {[2,4,5,7,8].map(x=>(
            <button key={x} className={`pill ${has("seats",String(x))?"on":""}`}
                    onClick={()=>toggle("seats",String(x))}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="specs" title={t("Regional specs","المواصفات")} count={activeIn("specs")}>
        <div className="filter-pills">
          {["GCC","American","European","Japanese"].map(x=>(
            <button key={x} className={`pill ${has("specs",x)?"on":""}`}
                    onClick={()=>toggle("specs",x)}>{x}</button>
          ))}
        </div>
      </Sec>

      <Sec id="features" title={t("Features","الميزات")} count={activeIn("features")}>
        <div className="filter-checks scroll">
          {FEATURES.map(f=>(
            <label key={f.id}>
              <input type="checkbox" checked={has("features",f.id)} onChange={()=>toggle("features",f.id)}/>
              <span>{f.n}</span>
            </label>
          ))}
        </div>
      </Sec>

      <Sec id="seller" title={t("Seller type","البائع")} count={activeIn("seller")}>
        <div className="filter-pills">
          {[
            ["Platform",t("Behbehani","بهبهاني")],
            ["Dealer",t("Dealer","معرض")],
            ["Private",t("Private","خاص")],
          ].map(([v,l])=>(
            <button key={v} className={`pill ${has("seller",v)?"on":""}`}
                    onClick={()=>toggle("seller",v)}>{l}</button>
          ))}
        </div>
      </Sec>

      <Sec id="trust" title={t("Trust & convenience","الثقة والراحة")}>
        <div className="filter-checks">
          <label><input type="checkbox" checked={!!filters.inspected} onChange={e=>setF({...filters, inspected:e.target.checked})}/>
            <span className="fp-trust-line"><Icon name="shield" size={14} color="var(--royal)"/> {t("71-pt inspected","فحص ٧١ نقطة")}</span></label>
          <label><input type="checkbox" checked={!!filters.warranty} onChange={e=>setF({...filters, warranty:e.target.checked})}/>
            <span className="fp-trust-line"><Icon name="check-circle" size={14} color="var(--green)"/> {t("Warranty","ضمان")}</span></label>
          <label><input type="checkbox" checked={!!filters.return} onChange={e=>setF({...filters, return:e.target.checked})}/>
            <span className="fp-trust-line"><Icon name="return" size={14} color="var(--royal)"/> {t("3-day return","إرجاع ٣ أيام")}</span></label>
          <label><input type="checkbox" checked={!!filters.delivery} onChange={e=>setF({...filters, delivery:e.target.checked})}/>
            <span className="fp-trust-line"><Icon name="truck" size={14} color="var(--royal)"/> {t("Home delivery","توصيل")}</span></label>
        </div>
      </Sec>

      <div className="fp-foot-cta">
        <Button variant="primary" size="lg" style={{width:"100%"}}>
          {t("Show","عرض")} {count} {t("cars","سيارة")}
        </Button>
        <button className="fp-save-search">
          <Icon name="heart" size={14}/> {t("Save this search","احفظ هذا البحث")}
        </button>
      </div>
    </aside>
  );
};

const SORTS = [
  ["best",  "Best match"],
  ["new",   "Newest first"],
  ["lowp",  "Price: low → high"],
  ["highp", "Price: high → low"],
  ["lowkm", "Lowest mileage"],
  ["year",  "Year: newest first"],
];

const defaultFilters = () => ({
  price:[0,50000],
  monthly:[0,1000],
  year:[2015,2026],
  mileage:[0,200000],
  brands:[],
  bodies:[],
  transmission:[],
  fuel:[],
  drive:[],
  cyl:[],
  color:[],
  intColor:[],
  seats:[],
  specs:[],
  features:[],
  seller:[],
  inspected:false,
  warranty:false,
  return:false,
  delivery:false,
  q:"",
});

const applyFilters = (cars, f) => {
  return cars.filter(c=>{
    if (c.price < f.price[0] || c.price > f.price[1]) return false;
    if (c.monthly < f.monthly[0] || c.monthly > f.monthly[1]) return false;
    if (c.year < f.year[0] || c.year > f.year[1]) return false;
    if (c.mileage < f.mileage[0] || c.mileage > f.mileage[1]) return false;
    if (f.brands.length && !f.brands.includes(c.brand)) return false;
    if (f.bodies.length && !f.bodies.includes(c.body)) return false;
    if (f.transmission.length && !f.transmission.includes(c.transmission)) return false;
    if (f.fuel.length && !f.fuel.includes(c.fuel)) return false;
    if (f.seller.length && !f.seller.includes(c.sellerType)) return false;
    if (f.inspected && !c.inspected) return false;
    if (f.warranty  && !c.warranty)  return false;
    if (f.return    && !c.return)    return false;
    if (f.delivery  && !c.delivery)  return false;
    if (f.q) {
      const s = `${brandOf(c.brand).name} ${c.model} ${c.year}`.toLowerCase();
      if (!s.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
};

const applySort = (list, sort) => {
  const a = [...list];
  switch(sort){
    case "lowp":  return a.sort((x,y)=>x.price-y.price);
    case "highp": return a.sort((x,y)=>y.price-x.price);
    case "lowkm": return a.sort((x,y)=>x.mileage-y.mileage);
    case "year":  return a.sort((x,y)=>y.year-x.year);
    case "new":   return a.sort((x,y)=>y.id.localeCompare(x.id));
    default:      return a;
  }
};

// ---------- Listing row (for list view) ----------
const CarRow = ({car, locale, fav, onToggleFav, onOpen}) => {
  const b = brandOf(car.brand);
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <article className="car-row" onClick={()=>onOpen(car.id)}>
      <div className="car-row-media">
        <CarImage car={car}/>
        {car.badge && <Badge variant="royal">{car.badge}</Badge>}
      </div>
      <div className="car-row-body">
        <div className="car-row-head">
          <h3>{car.year} {t(b.name,b.nameAr)} {car.model}</h3>
          <button className="car-row-fav" onClick={(e)=>{e.stopPropagation(); onToggleFav(car.id);}}>
            <Icon name={fav?"heart-fill":"heart"} size={20} color={fav?"#dc2626":"#6b7280"}/>
          </button>
        </div>
        <div className="car-row-specs">
          <span><Icon name="gauge" size={14}/> {fmtKM(car.mileage,locale)}</span>
          <span><Icon name="fuel" size={14}/> {car.fuel}</span>
          <span><Icon name="car" size={14}/> {car.transmission}</span>
          <span><Icon name="map-pin" size={14}/> {car.location}</span>
        </div>
        <div className="car-row-tags">
          {car.inspected && <Badge variant="royal-soft" icon="shield">{t("Inspected","مفحوصة")}</Badge>}
          {car.warranty  && <Badge variant="green-soft" icon="check-circle">{t("Warranty","ضمان")}</Badge>}
          {car.return    && <Badge variant="amber-soft" icon="return">{t("3-day return","إرجاع")}</Badge>}
          {car.delivery  && <Badge variant="slate-soft" icon="truck">{t("Delivery","توصيل")}</Badge>}
        </div>
        <div className="car-row-bottom">
          <div>
            <div className="car-row-price">{fmtKWD(car.price,locale)}</div>
            <div className="car-row-monthly">{t("or","أو")} {fmtKWD(car.monthly,locale)}/{t("mo","شهر")}</div>
          </div>
          <Button variant="primary" onClick={(e)=>{e.stopPropagation(); onOpen(car.id);}} iconRight="arrow-right">
            {t("View details","عرض التفاصيل")}
          </Button>
        </div>
      </div>
    </article>
  );
};

const BrowsePage = ({locale, go, route, favs, toggleFav}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [filters, setFilters] = React.useState(()=>{
    const f = defaultFilters();
    if (route.brand) f.brands = [route.brand];
    if (route.body)  f.bodies = [route.body];
    if (route.budgetMin || route.budgetMax) f.price = [route.budgetMin||0, route.budgetMax||50000];
    if (route.fuel)  f.fuel = [route.fuel];
    if (route.inspected) f.inspected = true;
    if (route.under) f.price = [0, route.under];
    if (route.q)     f.q = route.q;
    return f;
  });
  const [sort, setSort] = React.useState("best");
  const [view, setView] = React.useState("grid");
  const [showFilters, setShowFilters] = React.useState(false);

  const results = React.useMemo(()=>applySort(applyFilters(CARS, filters), sort), [filters, sort]);
  const onReset = () => setFilters(defaultFilters());

  // Active filter chips
  const activeChips = [];
  filters.brands.forEach(b=>activeChips.push({label:brandOf(b).name, clear:()=>setFilters({...filters, brands:filters.brands.filter(x=>x!==b)})}));
  filters.bodies.forEach(b=>activeChips.push({label:bodyOf(b).name,  clear:()=>setFilters({...filters, bodies:filters.bodies.filter(x=>x!==b)})}));
  filters.fuel.forEach(b=>activeChips.push({label:b,                  clear:()=>setFilters({...filters, fuel:filters.fuel.filter(x=>x!==b)})}));
  filters.seller.forEach(b=>activeChips.push({label:b,                clear:()=>setFilters({...filters, seller:filters.seller.filter(x=>x!==b)})}));
  if (filters.price[0]>0 || filters.price[1]<50000) activeChips.push({label:`KWD ${filters.price[0]} – ${filters.price[1]===50000?'50K+':filters.price[1]}`, clear:()=>setFilters({...filters, price:[0,50000]})});
  if (filters.inspected) activeChips.push({label:t("Inspected","مفحوصة"), clear:()=>setFilters({...filters, inspected:false})});
  if (filters.warranty) activeChips.push({label:t("Warranty","ضمان"), clear:()=>setFilters({...filters, warranty:false})});
  if (filters.return) activeChips.push({label:t("3-day return","إرجاع"), clear:()=>setFilters({...filters, return:false})});

  return (
    <div className="browse-wrap">
      <div className="browse-head">
        <div className="container">
          <div className="breadcrumb">
            <button onClick={()=>go({page:"home"})}>{t("Home","الرئيسية")}</button>
            <Icon name="chevron-right" size={12}/>
            <span>{t("Buy a Car","شراء سيارة")}</span>
            {filters.brands.length===1 && <>
              <Icon name="chevron-right" size={12}/>
              <span>{brandOf(filters.brands[0]).name}</span>
            </>}
          </div>
          <h1>
            {filters.brands.length===1
              ? `${brandOf(filters.brands[0]).name} ${t("cars in Kuwait","سيارات في الكويت")}`
              : t("Used cars in Kuwait","سيارات مستعملة في الكويت")}
          </h1>
          <p className="browse-sub">
            {results.length} {t("cars match · all KWD prices · Kuwait-wide delivery available","سيارة مطابقة · جميع الأسعار بالدينار · توصيل في كل الكويت")}
          </p>
        </div>
      </div>

      <div className="container browse-body">
        <FilterPanel filters={filters} setF={setFilters} count={results.length} locale={locale} onReset={onReset}/>
        {showFilters && (
          <div className="filter-drawer-bg" onClick={()=>setShowFilters(false)}>
            <div className="filter-drawer" onClick={e=>e.stopPropagation()}>
              <div className="filter-drawer-head">
                <h3>{t("Filters","الفلاتر")}</h3>
                <button onClick={()=>setShowFilters(false)}><Icon name="x" size={20}/></button>
              </div>
              <FilterPanel filters={filters} setF={setFilters} count={results.length} locale={locale} onReset={onReset}/>
            </div>
          </div>
        )}

        <main className="browse-main">
          <div className="browse-toolbar">
            <div className="browse-toolbar-l">
              <button className="filter-mobile-btn" onClick={()=>setShowFilters(true)}>
                <Icon name="filter" size={16}/>
                {t("Filters","الفلاتر")}
              </button>
              <div className="browse-input">
                <Icon name="search" size={16} color="var(--muted)"/>
                <input value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})}
                       placeholder={t("Search make, model, year…","ابحث بالماركة، الموديل، السنة…")}/>
              </div>
            </div>
            <div className="browse-toolbar-r">
              <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
                {SORTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <div className="view-toggle">
                <button className={view==="grid"?"on":""} onClick={()=>setView("grid")} aria-label="Grid"><Icon name="grid" size={16}/></button>
                <button className={view==="list"?"on":""} onClick={()=>setView("list")} aria-label="List"><Icon name="list" size={16}/></button>
              </div>
            </div>
          </div>

          {activeChips.length>0 && (
            <div className="active-chips">
              {activeChips.map((c,i)=>(
                <button key={i} className="active-chip" onClick={c.clear}>
                  {c.label} <Icon name="x" size={12}/>
                </button>
              ))}
              <button className="link-btn" onClick={onReset}>{t("Clear all","مسح الكل")}</button>
            </div>
          )}

          {results.length===0 ? (
            <div className="browse-empty">
              <div className="browse-empty-icon"><Icon name="search" size={36} color="var(--muted)"/></div>
              <h3>{t("No cars match your filters","لا توجد سيارات مطابقة")}</h3>
              <p>{t("Try widening the price range or removing a brand.","حاول توسيع نطاق السعر أو إزالة ماركة.")}</p>
              <Button variant="secondary" onClick={onReset}>{t("Reset filters","مسح الفلاتر")}</Button>
            </div>
          ) : view==="grid" ? (
            <div className="browse-grid">
              {results.map(c=>(
                <CarCard key={c.id} car={c} locale={locale}
                         fav={favs.has(c.id)} onToggleFav={toggleFav}
                         onOpen={(id)=>go({page:"vdp", id})}/>
              ))}
            </div>
          ) : (
            <div className="browse-list">
              {results.map(c=>(
                <CarRow key={c.id} car={c} locale={locale}
                        fav={favs.has(c.id)} onToggleFav={toggleFav}
                        onOpen={(id)=>go({page:"vdp", id})}/>
              ))}
            </div>
          )}

          {results.length>0 && (
            <nav className="pager">
              <button disabled><Icon name="chevron-left" size={16}/> {t("Previous","السابق")}</button>
              <div className="pager-pages">
                <button className="on">1</button>
                <button>2</button>
                <button>3</button>
                <span>…</span>
                <button>12</button>
              </div>
              <button>{t("Next","التالي")} <Icon name="chevron-right" size={16}/></button>
            </nav>
          )}
        </main>
      </div>
    </div>
  );
};

Object.assign(window, { BrowsePage });
