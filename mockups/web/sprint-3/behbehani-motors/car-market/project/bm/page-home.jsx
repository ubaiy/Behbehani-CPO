/* eslint-disable */
// Home page — hero, browse modes, featured cars, sell CTA, how it works, trust

const HomeHero = ({locale, go, onSearchOpen, favs, toggleFav}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;

  // Slides — each one a self-contained banner with its own pitch & CTAs
  const slides = [
    {
      key: "buy",
      eyebrow: t("Now serving all of Kuwait", "نخدم جميع مناطق الكويت"),
      titleA:  t("Sell & Buy Your Car",       "بيع واشترِ سيارتك"),
      titleB:  t("For The Best Price.",        "بأفضل سعر."),
      sub:     t("Kuwait's all-in-one marketplace, connecting buyers with their dream cars and sellers with the perfect platform to showcase their offerings.",
                 "سوق الكويت المتكامل، يربط المشترين بسيارات أحلامهم والبائعين بالمنصة المثالية لعرض سياراتهم."),
      ctaPrimary:   { label: t("Get Started",   "ابدأ الآن"), onClick: ()=>go({page:"browse"}) },
      ctaSecondary: { label: t("Sell Your Car", "بيع سيارتك"), onClick: ()=>go({page:"sell"})   },
    },
    {
      key: "inspect",
      eyebrow: t("Every car. 71-point inspected.", "كل سيارة. مفحوصة بـ ٧١ نقطة."),
      titleA:  t("No surprises.",         "بلا مفاجآت."),
      titleB:  t("Delivered to your door.","نوصلها لباب بيتك."),
      sub:     t("Certified technicians inspect every car before it lists. Reserve in minutes, test-drive at home, and return within 3 days for a full refund.",
                 "فنيون معتمدون يفحصون كل سيارة قبل عرضها. احجز خلال دقائق، اختبرها في بيتك، وأعدها خلال ٣ أيام لاسترداد كامل."),
      ctaPrimary:   { label: t("Browse inspected cars", "تصفح المفحوصة"), onClick: ()=>go({page:"browse", inspected:true}) },
      ctaSecondary: { label: t("How it works",          "كيف يعمل"),       onClick: ()=>go({page:"browse"}) },
    },
    {
      key: "finance",
      eyebrow: t("Real bank offers, no impact on credit", "عروض بنوك حقيقية، بدون أثر على السجل"),
      titleA:  t("Pre-qualify with 5 banks",      "تأهل مع ٥ بنوك"),
      titleB:  t("In 6 minutes.",                  "خلال ٦ دقائق."),
      sub:     t("Compare APRs side-by-side, pick the best monthly payment and e-sign your contract online. No paperwork, no branch visits.",
                 "قارن نسب الفائدة جنباً إلى جنب، اختر أفضل قسط شهري، ووقّع العقد إلكترونياً. بدون أوراق ولا زيارات للفروع."),
      ctaPrimary:   { label: t("Calculate financing", "احسب التمويل"), onClick: ()=>go({page:"finance"}) },
      ctaSecondary: { label: t("Browse cars",         "تصفح السيارات"),  onClick: ()=>go({page:"browse"}) },
    },
  ];

  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const total = slides.length;

  const goTo = (i) => setIdx(((i % total) + total) % total);
  const next = () => goTo(idx + 1);
  const prev = () => goTo(idx - 1);

  // Auto-advance every 6s; pause on hover / focus
  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 6000);
    return () => clearInterval(id);
  }, [paused, total]);

  // Touch swipe
  const touch = React.useRef({x: 0, active: false});
  const onTouchStart = (e) => { touch.current = {x: e.touches[0].clientX, active: true}; };
  const onTouchMove  = (e) => {
    if (!touch.current.active) return;
    const dx = e.touches[0].clientX - touch.current.x;
    if (Math.abs(dx) > 50) {
      touch.current.active = false;
      dx > 0 ? prev() : next();
    }
  };
  const onTouchEnd = () => { touch.current.active = false; };

  // Keyboard arrows when the slider is focused
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { next(); e.preventDefault(); }
    if (e.key === "ArrowLeft")  { prev(); e.preventDefault(); }
  };

  return (
    <section
      className="hero hero-slider"
      onMouseEnter={()=>setPaused(true)}
      onMouseLeave={()=>setPaused(false)}
      onFocus={()=>setPaused(true)}
      onBlur={()=>setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={t("Behbehani Motors highlights", "أبرز ما يميز بهبهاني")}
    >
      <div className="hero-blobs">
        <div className="hero-blob hero-blob-1"/>
        <div className="hero-blob hero-blob-2"/>
        <div className="hero-blob hero-blob-3"/>
        <span className="hero-dot hero-dot-1"/>
        <span className="hero-dot hero-dot-2"/>
        <span className="hero-dot hero-dot-3"/>
      </div>

      <div className="hero-inner">
        <div className="hero-slides">
          <div className="hero-slide" key={slides[idx].key} role="group" aria-roledescription="slide" aria-label={`${idx+1} ${t("of","من")} ${total}`}>
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span className="ribbon-dot"/>
                <span>{slides[idx].eyebrow}</span>
              </div>

              <h1 className="hero-title">
                {slides[idx].titleA} <br/>
                <em>{slides[idx].titleB}</em>
              </h1>

              <p className="hero-sub">{slides[idx].sub}</p>

              <div className="hero-cta-row">
                <Button variant="primary" size="lg" onClick={slides[idx].ctaPrimary.onClick}>
                  <span>{slides[idx].ctaPrimary.label}</span>
                  <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
                </Button>
                <Button variant="secondary" size="lg" onClick={slides[idx].ctaSecondary.onClick}>
                  {slides[idx].ctaSecondary.label}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Slider controls — dots + arrows */}
        <div className="hero-slider-controls">
          <button
            type="button"
            className="hero-slider-arrow"
            onClick={prev}
            aria-label={t("Previous slide","الشريحة السابقة")}
          >
            <Icon name="chevron-left" size={18}/>
          </button>
          <div className="hero-slider-dots" role="tablist">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`hero-slider-dot ${i===idx ? "is-on" : ""}`}
                onClick={()=>goTo(i)}
                aria-label={`${t("Go to slide","انتقل إلى الشريحة")} ${i+1}`}
                aria-selected={i===idx}
                role="tab"
              >
                <span className="hero-slider-dot-bar"/>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="hero-slider-arrow"
            onClick={next}
            aria-label={t("Next slide","الشريحة التالية")}
          >
            <Icon name="chevron-right" size={18}/>
          </button>
        </div>

        {/* Persistent trust chips — apply to every slide */}
        <div className="hero-trust-row">
          <div className="hero-trust-chip">
            <Icon name="shield" size={14}/>
            <span><strong>71-pt</strong> {t("inspection","فحص")}</span>
          </div>
          <div className="hero-trust-chip">
            <Icon name="truck" size={14}/>
            <span><strong>48 hr</strong> {t("delivery","توصيل")}</span>
          </div>
          <div className="hero-trust-chip">
            <Icon name="return" size={14}/>
            <span><strong>3-day</strong> {t("return","إرجاع")}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const TrustStrip = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const items = [
    { icon:"shield", title:t("Inspected","مفحوصة"), sub:t("71-point report","تقرير ٧١ نقطة") },
    { icon:"return", title:t("Returnable","قابلة للإرجاع"), sub:t("3 days / 300 km","٣ أيام / ٣٠٠ كم") },
    { icon:"truck",  title:t("Home delivery","توصيل منزلي"), sub:t("Live GPS tracking","تتبع مباشر") },
    { icon:"check-circle", title:t("Insured","مؤمَّنة"), sub:t("One-click activation","تفعيل بنقرة") },
    { icon:"sparkle", title:t("Financed","ممولة"), sub:t("Side-by-side bank offers","عروض بنوك متعددة") },
  ];
  return (
    <section className="trust-strip">
      <div className="trust-strip-inner">
        {items.map(i=>(
          <div key={i.title} className="trust-strip-item">
            <div className="trust-strip-icon"><Icon name={i.icon} size={22}/></div>
            <div>
              <div className="trust-strip-title">{i.title}</div>
              <div className="trust-strip-sub">{i.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const BrowseByBrand = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <section className="container section">
      <SectionHead
        eyebrow={t("Browse by brand","تصفح حسب الماركة")}
        title={t("Find your dream brand","ابحث عن ماركتك المفضلة")}
        sub={t("Hand-picked inventory from the top brands sold in Kuwait.","مخزون منتقى من أبرز الماركات في الكويت.")}
        action={<button className="link-arrow" onClick={()=>go({page:"browse"})}>{t("View all","عرض الكل")} <Icon name="arrow-right" size={14}/></button>}
      />
      <div className="brand-grid">
        {BRANDS.slice(0,12).map(b=>(
          <button key={b.id} className="brand-tile" onClick={()=>go({page:"browse", brand:b.id})}>
            <span className="brand-tile-mark"><BrandLogo brand={b} size={40}/></span>
            <span className="brand-tile-name">{t(b.name, b.nameAr)}</span>
            <span className="brand-tile-count">{CARS.filter(c=>c.brand===b.id).length || Math.floor(Math.random()*80+20)} {t("cars","سيارة")}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

const BrowseByBody = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  // simple SVG glyphs per body type
  const glyph = (id) => ({
    sedan:       <path d="M5 30 Q7 25 12 24 L20 18 Q26 14 36 14 L48 14 Q58 14 64 20 L70 26 Q74 26 76 30 L76 34 L5 34 Z"/>,
    suv:         <path d="M6 28 Q8 22 14 22 L20 14 Q26 10 38 10 L52 10 Q62 10 68 16 L74 22 Q78 22 80 26 L80 34 L6 34 Z"/>,
    coupe:       <path d="M6 30 Q8 26 12 25 L24 16 Q34 13 46 14 L58 14 Q68 16 72 22 L76 28 L76 34 L6 34 Z"/>,
    convertible: <path d="M6 30 Q8 26 12 25 L20 22 Q28 19 38 19 L52 19 Q60 19 64 22 L72 26 Q76 26 78 30 L78 34 L6 34 Z"/>,
    pickup:      <path d="M5 28 L18 28 L24 18 L40 18 L42 28 L80 28 L80 34 L5 34 Z"/>,
    hatchback:   <path d="M6 30 Q8 26 12 25 L22 16 Q28 14 38 14 L50 14 L68 28 L80 30 L80 34 L6 34 Z"/>,
    minivan:     <path d="M6 28 Q8 22 14 21 L18 14 Q24 11 40 11 L58 11 Q70 11 74 18 L78 24 L82 28 L82 34 L6 34 Z"/>,
  }[id]);
  return (
    <section className="container section">
      <SectionHead
        eyebrow={t("Browse by body type","تصفح حسب الشكل")}
        title={t("What kind of car do you want?","ما نوع السيارة التي تريدها؟")}
      />
      <div className="body-grid">
        {BODY_TYPES.map(b=>(
          <button key={b.id} className="body-tile" onClick={()=>go({page:"browse", body:b.id})}>
            <svg viewBox="0 0 86 40" className="body-tile-svg">
              <g fill="currentColor">{glyph(b.id)}</g>
              <circle cx="22" cy="34" r="4.5" fill="#0b1220"/>
              <circle cx="60" cy="34" r="4.5" fill="#0b1220"/>
            </svg>
            <span>{t(b.name, b.nameAr)}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

const PriceBrackets = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const brackets = [
    { lo:0,     hi:3000,  label:t("Under KWD 3,000","أقل من ٣٠٠٠") },
    { lo:3000,  hi:6000,  label:"KWD 3K – 6K" },
    { lo:6000,  hi:10000, label:"KWD 6K – 10K" },
    { lo:10000, hi:15000, label:"KWD 10K – 15K" },
    { lo:15000, hi:20000, label:"KWD 15K – 20K" },
    { lo:20000, hi:999999,label:t("KWD 20K and above","٢٠٠٠٠ فأكثر") },
  ];
  return (
    <section className="container section">
      <SectionHead
        eyebrow={t("Browse by budget","تصفح حسب الميزانية")}
        title={t("Find a car that fits.","سيارة في حدود ميزانيتك.")}
      />
      <div className="price-grid">
        {brackets.map((br,i)=>(
          <button key={br.label} className="price-tile" onClick={()=>go({page:"browse", budgetMin:br.lo, budgetMax:br.hi})}>
            <div className="price-tile-label">{br.label}</div>
            <Icon name="arrow-right" size={16}/>
          </button>
        ))}
      </div>
    </section>
  );
};

const FeaturedRail = ({title, eyebrow, cars, locale, go, favs, toggleFav}) => (
  <section className="container section">
    <SectionHead eyebrow={eyebrow} title={title}
      action={<button className="link-arrow" onClick={()=>go({page:"browse"})}>{locale==="ar"?"عرض الكل":"View all"} <Icon name="arrow-right" size={14}/></button>}/>
    <div className="rail">
      {cars.map(c=>(
        <div key={c.id} className="rail-item">
          <CarCard car={c} locale={locale} fav={favs.has(c.id)}
                   onToggleFav={toggleFav} onOpen={(id)=>go({page:"vdp", id})}/>
        </div>
      ))}
    </div>
  </section>
);

const SellCallout = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <section className="container section">
      <div className="sell-callout">
        <div className="sell-callout-img">
          <img src={__R("sellHero","https://images.unsplash.com/photo-1542362567-b07e54358753?w=1400&q=80")}
               alt="" onError={(e)=>e.target.parentElement.classList.add("img-failed")}/>
          <div className="sell-callout-tint"/>
        </div>
        <div className="sell-callout-body">
          <h2>{t("Three ways to sell. Pick what suits you.","ثلاث طرق للبيع. اختر الأنسب لك.")}</h2>
          <div className="sell-paths">
            <button className="sell-path" onClick={()=>go({page:"sell", path:"instant"})}>
              <div className="sell-path-icon"><Icon name="sparkle" size={20}/></div>
              <div>
                <h3>{t("Instant Online Valuation","تقييم فوري")}</h3>
                <p>{t("60 seconds. Guaranteed offer valid for 7 days.","٦٠ ثانية. عرض مضمون لمدة ٧ أيام.")}</p>
              </div>
              <Icon name="arrow-right" size={18}/>
            </button>
            <button className="sell-path" onClick={()=>go({page:"sell"})}>
              <div className="sell-path-icon"><Icon name="user" size={20}/></div>
              <div>
                <h3>{t("Concierge Service","خدمة الكونسيرج")}</h3>
                <p>{t("We inspect, photograph, price and sell — for you.","نفحص ونصور ونسعر ونبيع نيابة عنك.")}</p>
              </div>
              <Icon name="arrow-right" size={18}/>
            </button>
            <button className="sell-path" onClick={()=>go({page:"sell", path:"self"})}>
              <div className="sell-path-icon"><Icon name="list" size={20}/></div>
              <div>
                <h3>{t("Self-Service Classified","نشر ذاتي")}</h3>
                <p>{t("Post your own listing. Get leads in 24 hours.","انشر إعلانك. وصلك المشترين خلال ٢٤ ساعة.")}</p>
              </div>
              <Icon name="arrow-right" size={18}/>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const steps = [
    { icon:"search",  title:t("1. Choose","اختر"),    sub:t("Browse 1,840+ inspected cars. Compare side-by-side.","تصفح ١٨٤٠+ سيارة مفحوصة. قارن جنباً إلى جنب.") },
    { icon:"shield",  title:t("2. Reserve","احجز"),    sub:t("Hold any car for 48 hours with a refundable KWD 100 deposit.","احجز أي سيارة لمدة ٤٨ ساعة بمقدم ١٠٠ د.ك.") },
    { icon:"check-circle", title:t("3. Finance & sign","تمويل وتوقيع"), sub:t("Get bank offers and e-sign your contract online.","احصل على عروض البنوك ووقّع العقد إلكترونياً.") },
    { icon:"truck",   title:t("4. Delivered","التوصيل"), sub:t("We deliver to your door. Track the driver in real time.","نوصلها لباب بيتك. تتبع السائق مباشرة.") },
  ];
  return (
    <section className="container section">
      <SectionHead eyebrow={t("How it works","كيف يعمل")}
                   title={t("From browse to driveway in days, not weeks.","من التصفح إلى التسليم خلال أيام، لا أسابيع.")}/>
      <div className="how-grid">
        {steps.map((s,i)=>(
          <div key={s.title} className="how-step">
            <div className="how-step-num">{i+1}</div>
            <div className="how-step-icon"><Icon name={s.icon} size={26}/></div>
            <h3>{s.title.replace(/^\d\.\s*/,"")}</h3>
            <p>{s.sub}</p>
            {i<steps.length-1 && <div className="how-step-connect"/>}
          </div>
        ))}
      </div>
    </section>
  );
};

const ServicesPromo = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const services = [
    { id:"wash",    name:t("Wash & detailing","الغسيل والتلميع"),    from:8,  icon:"sparkle" },
    { id:"tint",    name:t("Tinting","تظليل النوافذ"),               from:35, icon:"shield"  },
    { id:"renewal", name:t("Registration renewal","تجديد الترخيص"), from:25, icon:"doc"     },
    { id:"tires",   name:t("Tire replacement","تبديل الإطارات"),    from:120,icon:"car"     },
    { id:"health",  name:t("Car health check","فحص شامل"),           from:15, icon:"check-circle" },
    { id:"glass",   name:t("Glass & windshield","الزجاج"),           from:30, icon:"camera" },
  ];
  return (
    <section className="container section">
      <SectionHead eyebrow={t("Car services","خدمات السيارات")}
        title={t("Everything your car needs, in one place.","كل ما تحتاجه سيارتك، في مكان واحد.")}
        action={<button className="link-arrow" onClick={()=>go({page:"services"})}>{t("View all services","كل الخدمات")} <Icon name="arrow-right" size={14}/></button>}/>
      <div className="services-grid">
        {services.map(s=>(
          <button key={s.id} className="service-tile" onClick={()=>go({page:"services"})}>
            <div className="service-tile-icon"><Icon name={s.icon} size={22}/></div>
            <h3>{s.name}</h3>
            <div className="service-tile-price">{t("from","من")} {fmtKWD(s.from, locale)}</div>
          </button>
        ))}
      </div>
    </section>
  );
};

const Testimonials = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const reviews = [
    { name:"Fatima A.",  car:"Lexus RX 350",      stars:5, text:t("Reserved on Friday, delivered Sunday. The inspection report saved me from a bad car my cousin recommended.","حجزت الجمعة ووصلتني الأحد. تقرير الفحص أنقذني من سيارة سيئة.") },
    { name:"Mohammad K.",car:"Toyota Camry",      stars:5, text:t("Bank offers in 6 minutes, all online. Picked Burgan with 4.6% APR. No paperwork.","عروض البنوك خلال ٦ دقائق، كلها أونلاين. اخترت بنك برقان بنسبة ٤.٦٪.") },
    { name:"Sara M.",    car:"BMW X5",            stars:5, text:t("I sold my old Audi via Concierge and bought a BMW the same week. They handled the MOI transfer too.","بعت أودي وأخذت بي إم دبليو في نفس الأسبوع. حتى نقل الملكية تكفلوا فيه.") },
  ];
  return (
    <section className="container section">
      <SectionHead eyebrow={t("Customer reviews","آراء العملاء")} title={t("4.8/5 from 2,400+ verified buyers.","٤.٨/٥ من أكثر من ٢٤٠٠ مشتري.")}/>
      <div className="testimonials">
        {reviews.map(r=>(
          <article key={r.name} className="testimonial">
            <div className="testimonial-stars">{Array.from({length:r.stars}).map((_,i)=>(
              <Icon key={i} name="star" size={16} color="#f59e0b"/>
            ))}</div>
            <p>"{r.text}"</p>
            <footer>
              <div className="testimonial-avatar">{r.name[0]}</div>
              <div>
                <div className="testimonial-name">{r.name}</div>
                <div className="testimonial-car">{t("Bought","اشترى")} {r.car}</div>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
};

const FeaturedFiltered = ({locale, go, favs, toggleFav}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [brand, setBrand]   = React.useState("");
  const [body, setBody]     = React.useState("");
  const [budget, setBudget] = React.useState("");

  const cars = React.useMemo(()=>{
    let pool = CARS;
    if (brand)  pool = pool.filter(c=>c.brand===brand);
    if (body)   pool = pool.filter(c=>c.body===body);
    if (budget) pool = pool.filter(c=>c.price <= parseInt(budget));
    return pool.slice(0, 8);
  }, [brand, body, budget]);

  const goBrowse = () => {
    const r = {page:"browse"};
    if (brand)  r.brand = brand;
    if (body)   r.body = body;
    if (budget) r.budgetMax = parseInt(budget);
    go(r);
  };

  return (
    <section className="container section feat-section">
      <header className="feat-head">
        <div>
          <div className="section-eyebrow">{t("Featured cars","سيارات مميزة")}</div>
          <h2 className="section-title">{t("Find your next car","ابحث عن سيارتك التالية")}</h2>
        </div>
        <button className="link-arrow" onClick={()=>go({page:"browse"})}>
          {t("View all","عرض الكل")} <Icon name="arrow-right" size={14}/>
        </button>
      </header>

      {/* Inline search bar — same UX as the hero filter */}
      <div className="hero-search feat-search">
        <div className="hero-search-field">
          <label>{t("Brand","الماركة")}</label>
          <select value={brand} onChange={e=>setBrand(e.target.value)}>
            <option value="">{t("Any brand","أي ماركة")}</option>
            {BRANDS.slice(0,12).map(b=><option key={b.id} value={b.id}>{t(b.name, b.nameAr)}</option>)}
          </select>
        </div>
        <div className="hero-search-field">
          <label>{t("Body type","الشكل")}</label>
          <select value={body} onChange={e=>setBody(e.target.value)}>
            <option value="">{t("Any body","أي شكل")}</option>
            {BODY_TYPES.map(b=><option key={b.id} value={b.id}>{t(b.name, b.nameAr)}</option>)}
          </select>
        </div>
        <div className="hero-search-field">
          <label>{t("Max budget","الميزانية")}</label>
          <select value={budget} onChange={e=>setBudget(e.target.value)}>
            <option value="">{t("Any","أي")}</option>
            <option value="3000">KWD 3,000</option>
            <option value="6000">KWD 6,000</option>
            <option value="10000">KWD 10,000</option>
            <option value="20000">KWD 20,000</option>
            <option value="50000">KWD 50,000+</option>
          </select>
        </div>
        <button className="hero-search-cta" onClick={goBrowse}>
          <Icon name="search" size={16}/>
          <span>{t("Search","ابحث")}</span>
        </button>
      </div>

      {cars.length===0 ? (
        <div className="feat-empty">
          <Icon name="info" size={28} color="var(--muted)"/>
          <p>{t("No cars match this filter.","لا توجد سيارات لهذا الفلتر.")}</p>
          <button className="link-arrow" onClick={()=>{setBrand("");setBody("");setBudget("");}}>
            {t("Clear filters","مسح الفلاتر")}
          </button>
        </div>
      ) : (
        <div className="feat-grid">
          {cars.map(c=>(
            <CarCard key={c.id} car={c} locale={locale}
                     fav={favs.has(c.id)} onToggleFav={toggleFav}
                     onOpen={(id)=>go({page:"vdp", id})}/>
          ))}
        </div>
      )}
    </section>
  );
};

const WhyBehbehani = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const items = [
    { icon:"shield",       ti:t("100% inspected","فحص ١٠٠٪"),
      su:t("Every car passes a rigorous 71-point inspection by our certified technicians before listing.",
           "كل سيارة تجتاز فحص ٧١ نقطة على يد فنيين معتمدين قبل عرضها.") },
    { icon:"return",       ti:t("7-day money-back","إرجاع ٧ أيام"),
      su:t("Drive it up to 300 km. Not in love? We'll pick it up and refund you, no questions asked.",
           "قد حتى ٣٠٠ كم. لم تعجبك؟ نأخذها ونعيد المبلغ، بدون أسئلة.") },
    { icon:"truck",        ti:t("Free delivery","توصيل مجاني"),
      su:t("Across all of Kuwait. Track your driver live and inspect the car at your door.",
           "في كل الكويت. تتبع السائق وافحص السيارة عند بابك.") },
    { icon:"sparkle",      ti:t("Real bank offers","عروض بنوك حقيقية"),
      su:t("Pre-qualify with 5 banks in 6 minutes — no impact on credit, no paperwork.",
           "تأهل مع ٥ بنوك خلال ٦ دقائق — بدون أثر على السجل.") },
  ];
  return (
    <section className="container section why-bm">
      <SectionHead eyebrow={t("Why Behbehani Motors","لماذا بهبهاني")}
                   title={t("A different way to own a car","طريقة مختلفة لامتلاك السيارات")}
                   sub={t("Built for Kuwait. Trusted by 10,000+ buyers and sellers.","صُمّمت للكويت. موثوقة من ١٠٠٠٠+ عميل.")}/>
      <div className="why-bm-grid">
        {items.map(i=>(
          <article key={i.ti} className="why-bm-card">
            <div className="why-bm-icon"><Icon name={i.icon} size={24}/></div>
            <h3>{i.ti}</h3>
            <p>{i.su}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

const HomePage = ({locale, go, onSearchOpen, favs, toggleFav}) => {
  const featured = CARS.filter(c=>c.sellerType==="Platform" && c.inspected).slice(0,8);
  const lowMileage = [...CARS].sort((a,b)=>a.mileage-b.mileage).slice(0,8);
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <HomeHero locale={locale} go={go} onSearchOpen={onSearchOpen}/>
      <FeaturedFiltered locale={locale} go={go} favs={favs} toggleFav={toggleFav}/>
      <BrowseByBrand locale={locale} go={go}/>
      <BrowseByBody locale={locale} go={go}/>
      <SellCallout locale={locale} go={go}/>
      <FeaturedRail eyebrow={t("Low mileage","ممشى قليل")} title={t("Almost-new, gently driven.","شبه جديدة، استخدام خفيف.")}
                    cars={lowMileage} locale={locale} go={go} favs={favs} toggleFav={toggleFav}/>
      <PriceBrackets locale={locale} go={go}/>
      <HowItWorks locale={locale}/>
      <ServicesPromo locale={locale} go={go}/>
      <Testimonials locale={locale}/>
    </>
  );
};

Object.assign(window, { HomePage });
