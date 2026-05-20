/* eslint-disable */
// Car Details Wizard + Choose Selling Option screens

const WIZ_FIELDS = [
  { id:"make",    label:"Make",          labelAr:"الماركة" },
  { id:"model",   label:"Model",         labelAr:"الموديل" },
  { id:"year",    label:"Year",          labelAr:"السنة" },
  { id:"trim",    label:"Trim",          labelAr:"الفئة" },
  { id:"mileage", label:"Mileage",       labelAr:"الممشى" },
  { id:"price",   label:"Selling price", labelAr:"سعر البيع" },
];

const MODELS_BY_BRAND = {
  toyota:    ["Camry","Corolla","Land Cruiser","RAV4","Hilux","Yaris","Fortuner","Avalon","Sequoia","FJ Cruiser"],
  lexus:     ["LX 600","LX 570","RX 350","RX 500h","ES 350","NX 300","GX 460","IS 350","LS 500","UX 250h"],
  mercedes:  ["C-Class","E-Class","S-Class","GLE","GLS","G-Class","GLA","GLC","CLA","AMG GT"],
  bmw:       ["3 Series","5 Series","7 Series","X3","X5","X6","X7","M3","M5","i7"],
  nissan:    ["Patrol","Altima","Sunny","X-Trail","Pathfinder","Maxima","Sentra","Armada","Murano","370Z"],
  ford:      ["F-150","Mustang","Explorer","Edge","Escape","Bronco","Expedition","Ranger","EcoSport","Taurus"],
  range:     ["Range Rover","Range Rover Sport","Defender","Discovery","Discovery Sport","Velar","Evoque"],
  porsche:   ["911","Cayenne","Macan","Panamera","Taycan","Boxster","Cayman"],
  honda:     ["Accord","Civic","CR-V","Pilot","Odyssey","HR-V","Passport","Ridgeline"],
  audi:      ["A3","A4","A6","A8","Q3","Q5","Q7","Q8","e-tron","RS6"],
  tesla:     ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  gmc:       ["Yukon","Sierra","Acadia","Terrain","Canyon","Savana"],
  chevrolet: ["Tahoe","Suburban","Camaro","Corvette","Silverado","Equinox","Traverse","Malibu"],
  kia:       ["Sportage","Sorento","Telluride","Seltos","Optima","K5","Rio","Picanto","Carnival"],
  hyundai:   ["Sonata","Tucson","Santa Fe","Elantra","Palisade","Kona","Accent","Ioniq 5"],
  jeep:      ["Wrangler","Grand Cherokee","Cherokee","Gladiator","Compass","Renegade","Wagoneer"],
};

const CarDetailsWizard = ({locale, go, user, onSignIn}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  React.useEffect(()=>{ if (!user) onSignIn(); }, [user]);

  // Get preselected brand from URL route
  const preselectedBrand = (typeof window !== "undefined" && window.__bm_pre) || null;

  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    make:"", model:"", year:"", trim:"", mileage:"", price:"",
  });
  const [search, setSearch] = React.useState("");

  // Use brand from route if available
  React.useEffect(()=>{
    try {
      const r = JSON.parse(sessionStorage.getItem("bm_route")||"{}");
      if (r.brand && !data.make) {
        const b = BRANDS.find(x=>x.id===r.brand);
        if (b) setData(d=>({...d, make:b.name}));
      }
    } catch(e){}
  }, []);

  const allMakesData = [
    {n:"212",letter:"#"},
    ...BRANDS.map(b=>({n:b.name, id:b.id})),
    {n:"Acura"}, {n:"Alfa Romeo"}, {n:"Aston Martin"}, {n:"Baic"}, {n:"BAIC"}, {n:"Bentley"},
    {n:"Bugatti"}, {n:"BYD"}, {n:"Cadillac"}, {n:"Chery"}, {n:"Citroën"}, {n:"Dodge"},
    {n:"Ferrari"}, {n:"Fiat"}, {n:"Geely"}, {n:"Genesis"}, {n:"Great Wall"}, {n:"Infiniti"},
    {n:"Isuzu"}, {n:"Jaguar"}, {n:"Lamborghini"}, {n:"Lincoln"}, {n:"Maserati"}, {n:"Mazda"},
    {n:"McLaren"}, {n:"Mini"}, {n:"Mitsubishi"}, {n:"Peugeot"}, {n:"Ram"}, {n:"Renault"},
    {n:"Rolls-Royce"}, {n:"Skoda"}, {n:"Subaru"}, {n:"Suzuki"}, {n:"Volkswagen"}, {n:"Volvo"},
  ];
  // De-dupe
  const allMakes = Array.from(new Map(allMakesData.map(x=>[x.n,x])).values())
                        .sort((a,b)=>a.n.localeCompare(b.n));

  const currentField = WIZ_FIELDS[step];
  const filledCount = WIZ_FIELDS.filter(f=>data[f.id]).length;
  const filtered = (q) => allMakes.filter(m=>m.n.toLowerCase().includes(q.toLowerCase()));

  const handleSelect = (val) => {
    setData({...data, [currentField.id]: val});
    setSearch("");
    if (step < WIZ_FIELDS.length-1) {
      setStep(step+1);
    } else {
      // All steps done — go to choose option
      go({page:"sell", path:"choose"});
    }
  };

  const goToStep = (s) => {
    // Only allow going to a step that's been filled or the next one
    if (s <= filledCount) setStep(s);
  };

  const currentBrandId = BRANDS.find(b=>b.name===data.make)?.id;
  const modelList = currentBrandId ? (MODELS_BY_BRAND[currentBrandId] || []) : [];
  const yearList = Array.from({length:30}, (_,i)=>String(2026-i));
  const trimList = ["Base","SE","SR","XLE","XSE","Sport","Limited","Premium","GT","M Sport","AMG"];

  return (
    <div className="cdw-wrap">
      {/* Top bar */}
      <header className="cdw-header">
        <div className="cdw-header-inner">
          <button className="cdw-icon-btn" onClick={()=>step>0 ? setStep(step-1) : go({page:"sell"})}>
            <Icon name="chevron-left" size={18}/>
          </button>
          <h1>{t("Car details","تفاصيل السيارة")}</h1>
          <button className="cdw-icon-btn" onClick={()=>go({page:"sell"})}>
            <Icon name="x" size={18}/>
          </button>
        </div>
      </header>

      {/* Step pills */}
      <div className="cdw-steps">
        <div className="container cdw-steps-inner">
          {WIZ_FIELDS.map((f,i)=>{
            const filled = !!data[f.id];
            const active = step===i;
            return (
              <button key={f.id}
                      className={`cdw-step-pill ${active?"active":""} ${filled?"filled":""}`}
                      onClick={()=>goToStep(i)}>
                {filled && !active && <Icon name="check" size={12}/>}
                <span>{t(f.label, f.labelAr)}</span>
                {filled && !active && data[f.id] && (
                  <strong className="cdw-step-val">{data[f.id]}</strong>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className="cdw-body">
        <div className="container">
          <h2 className="cdw-prompt">
            {step===0 && t("Select your car make","اختر ماركة سيارتك")}
            {step===1 && t("Select your car model","اختر موديل السيارة")}
            {step===2 && t("Select your car year","اختر سنة الصنع")}
            {step===3 && t("Select your car trim","اختر فئة السيارة")}
            {step===4 && t("Enter your car mileage","أدخل ممشى السيارة")}
            {step===5 && t("Set your selling price","حدد سعر البيع")}
          </h2>

          {/* Step 0: Make */}
          {step===0 && (
            <div className="cdw-step-content">
              <div className="cdw-search">
                <Icon name="search" size={18} color="var(--muted)"/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                       placeholder={t("Search for car make","ابحث عن ماركة السيارة")}/>
              </div>
              <div className="cdw-options">
                {filtered(search).map(m=>(
                  <button key={m.n} className="cdw-option" onClick={()=>handleSelect(m.n)}>
                    <div className="cdw-option-logo">
                      {m.id ? <BrandLogo brand={BRANDS.find(b=>b.id===m.id)} size={28}/>
                        : <span className="cdw-option-letter">{m.n.charAt(0)}</span>}
                    </div>
                    <span className="cdw-option-label">{m.n}</span>
                  </button>
                ))}
                {filtered(search).length===0 && (
                  <div className="cdw-empty">
                    <Icon name="search" size={36} color="var(--muted-2)"/>
                    <p>{t("No matches for","لا توجد نتائج لـ")} "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Model */}
          {step===1 && (
            <div className="cdw-step-content">
              <div className="cdw-search">
                <Icon name="search" size={18} color="var(--muted)"/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                       placeholder={t("Search for car model","ابحث عن الموديل")}/>
              </div>
              <div className="cdw-options">
                {(modelList.length ? modelList : ["Other"]).filter(m=>m.toLowerCase().includes(search.toLowerCase())).map(m=>(
                  <button key={m} className="cdw-option" onClick={()=>handleSelect(m)}>
                    <div className="cdw-option-logo">
                      <Icon name="car" size={20} color="var(--muted)"/>
                    </div>
                    <span className="cdw-option-label">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Year */}
          {step===2 && (
            <div className="cdw-step-content">
              <div className="cdw-year-grid">
                {yearList.map(y=>(
                  <button key={y} className="cdw-year-card" onClick={()=>handleSelect(y)}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Trim */}
          {step===3 && (
            <div className="cdw-step-content">
              <div className="cdw-options">
                {trimList.map(tr=>(
                  <button key={tr} className="cdw-option" onClick={()=>handleSelect(tr)}>
                    <div className="cdw-option-logo">
                      <Icon name="sparkle" size={20} color="var(--royal)"/>
                    </div>
                    <span className="cdw-option-label">{tr}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Mileage */}
          {step===4 && (
            <div className="cdw-step-content">
              <div className="cdw-number-input">
                <span className="cdw-number-unit">km</span>
                <input type="number"
                       value={data.mileage}
                       onChange={e=>setData({...data, mileage:e.target.value})}
                       placeholder="0"/>
              </div>
              <div className="cdw-quick-options">
                {["0-30,000","30,000-60,000","60,000-100,000","100,000-150,000","150,000+"].map(r=>(
                  <button key={r} className="cdw-quick-pill"
                          onClick={()=>{ setData({...data, mileage:r.split("-")[0]}); }}>
                    {r} km
                  </button>
                ))}
              </div>
              <Button variant="primary" size="lg" style={{width:"100%", marginTop:24}}
                      disabled={!data.mileage}
                      onClick={()=>handleSelect(data.mileage + " km")}>
                {t("Continue","متابعة")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
            </div>
          )}

          {/* Step 5: Price */}
          {step===5 && (
            <div className="cdw-step-content">
              <div className="cdw-number-input">
                <span className="cdw-number-unit">KWD</span>
                <input type="number"
                       value={data.price}
                       onChange={e=>setData({...data, price:e.target.value})}
                       placeholder="0"/>
              </div>
              <div className="cdw-price-hint">
                <Icon name="info" size={14} color="var(--royal)"/>
                <span>{t("Suggested range based on similar cars:","النطاق المقترح بناءً على سيارات مماثلة:")} <strong>KWD 4,200 – KWD 5,800</strong></span>
              </div>
              <div className="cdw-quick-options">
                {["3,000","5,000","8,000","12,000","20,000"].map(p=>(
                  <button key={p} className="cdw-quick-pill"
                          onClick={()=>setData({...data, price:p.replace(",","")})}>
                    KWD {p}
                  </button>
                ))}
              </div>
              <Button variant="primary" size="lg" style={{width:"100%", marginTop:24}}
                      disabled={!data.price}
                      onClick={()=>handleSelect("KWD " + data.price)}>
                {t("Continue to Selling Options","متابعة لخيارات البيع")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Choose Selling Option screen ----------
const ChooseSellOption = ({locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="cdw-wrap cso-wrap">
      <header className="cdw-header cso-header">
        <div className="cdw-header-inner">
          <button className="cdw-icon-btn" onClick={()=>go({page:"sell", path:"details"})}>
            <Icon name="chevron-left" size={18}/>
          </button>
          <h1>{t("Choose the best option for Selling your car","اختر الخيار الأفضل لبيع سيارتك")}</h1>
          <button className="cdw-icon-btn" onClick={()=>go({page:"sell"})}>
            <Icon name="x" size={18}/>
          </button>
        </div>
      </header>

      <div className="cso-banner"/>

      <div className="container cso-body">
        <div className="cso-cards">
          {/* Concierge */}
          <article className="cso-card cso-concierge">
            <div className="cso-card-head">
              <Badge variant="royal">{t("Recommended","موصى به")}</Badge>
              <h2>{t("Managed by Behbehani","إدارة بهبهاني")}</h2>
              <p>{t("Sit back & relax with our concierge service","استرخِ مع خدمة الكونسيرج")}</p>
            </div>
            <hr/>
            <ul className="cso-features">
              <li><span className="cso-check"><Icon name="check" size={12}/></span>{t("Home car inspection & photoshoot","فحص وتصوير في الموقع")}</li>
              <li><span className="cso-check"><Icon name="check" size={12}/></span>{t("Cash offer within 48 hours","عرض نقدي خلال ٤٨ ساعة")}</li>
              <li><span className="cso-check"><Icon name="check" size={12}/></span>{t("We handle everything until car is sold","نتولى كل شيء حتى البيع")}</li>
              <li><span className="cso-check"><Icon name="check" size={12}/></span>{t("MOI ownership transfer included","نقل الملكية شامل")}</li>
              <li><span className="cso-check"><Icon name="check" size={12}/></span>{t("Marketed to verified buyers network","تسويق لشبكة المشترين الموثقين")}</li>
            </ul>
            <div className="cso-card-cta">
              <Button variant="primary" size="lg" style={{width:"100%"}}
                      onClick={()=>go({page:"sell", path:"plan-concierge"})}>
                {t("Sell it for me","بِعها لي")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
              <div className="cso-starting">
                <span>{t("Starting at","تبدأ من")}</span>
                <strong>15 KWD</strong>
              </div>
            </div>
          </article>

          {/* Self-service */}
          <article className="cso-card cso-self">
            <div className="cso-card-head">
              <Badge variant="slate-soft">{t("Most control","أكثر تحكم")}</Badge>
              <h2>{t("Managed by you","إدارتك أنت")}</h2>
              <p>{t("Reach buyers directly with self-service","تواصل مباشرة مع المشترين")}</p>
            </div>
            <hr/>
            <ul className="cso-features">
              <li><span className="cso-check soft"><Icon name="check" size={12}/></span>{t("Upload photos & details yourself","حمّل الصور والتفاصيل بنفسك")}</li>
              <li><span className="cso-check soft"><Icon name="check" size={12}/></span>{t("Cash offer within 48 hours","عرض نقدي خلال ٤٨ ساعة")}</li>
              <li><span className="cso-check soft"><Icon name="check" size={12}/></span>{t("You handle everything until car is sold","أنت تتولى كل شيء حتى البيع")}</li>
              <li><span className="cso-check soft"><Icon name="check" size={12}/></span>{t("Direct buyer chat via masked number","تواصل مباشر برقم مخفي")}</li>
              <li><span className="cso-check soft"><Icon name="check" size={12}/></span>{t("Renew or boost listing anytime","جدّد أو عزّز الإعلان")}</li>
            </ul>
            <div className="cso-card-cta">
              <Button variant="secondary" size="lg" style={{width:"100%"}}
                      onClick={()=>go({page:"sell", path:"plan-self"})}>
                {t("Continue posting","متابعة النشر")}
              </Button>
              <div className="cso-starting">
                <span>{t("Starting at","تبدأ من")}</span>
                <strong>7 KWD</strong>
              </div>
            </div>
          </article>
        </div>

        {/* Need help card */}
        <div className="cso-help">
          <div className="cso-help-icon"><Icon name="phone" size={26}/></div>
          <h3>{t("Need help in selling?","تحتاج مساعدة في البيع؟")}</h3>
          <p>{t("Our dedicated team of experts is ready to help you.","فريقنا المتخصص جاهز لمساعدتك.")}</p>
          <Button variant="ghost" onClick={()=>toast(t("Callback requested. We'll call you shortly.","تم طلب الاتصال"),"success")}>
            {t("Call back request","طلب اتصال")}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CarDetailsWizard, ChooseSellOption, PlanSelection });

// ===========================================================================
// Plan Selection — pricing tier picker for Concierge or Self-service
// ===========================================================================
const PlanSelection = ({mode, locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const isConcierge = mode==="concierge";

  const conciergePlans = [
    { id:"bronze", name:t("Bronze","برونزي"), tag:t("Starter","البداية"),
      price:15, duration:t("/ 1 month","/ شهر"), color:"#B45309", accent:"#FEF3C7",
      desc:t("Essentials covered. Perfect for first-time sellers.","الأساسيات. مثالي للبائعين الجدد."),
      features:[
        {icon:"calendar", t:t("Listing active for 1 month","الإعلان فعّال لمدة شهر")},
        {icon:"dollar",   t:t("Cash offer within 1-2 days","عرض نقدي خلال ١-٢ يوم")},
        {icon:"doc",      t:t("Standard inspection report","تقرير فحص قياسي")},
        {icon:"camera",   t:t("Standard photoshoot (15 photos)","تصوير قياسي (١٥ صورة)")},
        {icon:"phone",    t:t("Call handling by our team","معالجة المكالمات")},
      ] },
    { id:"silver", name:t("Silver","فضي"), tag:t("Most popular","الأكثر طلباً"),
      price:25, duration:t("/ 2 months","/ شهرين"), color:"#475569", accent:"#E2E8F0",
      desc:t("Better visibility, smarter marketing. Sells 2× faster.","ظهور أفضل وتسويق أذكى. يباع أسرع بمرتين."),
      features:[
        {icon:"calendar", t:t("Listing active for 2 months","الإعلان فعّال لمدة شهرين")},
        {icon:"doc",      t:t("Full 71-point inspection report","تقرير فحص ٧١ نقطة")},
        {icon:"camera",   t:t("Professional photoshoot (25 photos)","تصوير احترافي (٢٥ صورة)")},
        {icon:"phone",    t:t("Calls & price negotiation","المكالمات والتفاوض")},
        {icon:"sparkle",  t:t("Promoted in our marketing network","ترويج في شبكة التسويق")},
        {icon:"shield",   t:t("Featured for 15 days","مميز ١٥ يوم")},
      ] },
    { id:"gold",   name:t("Gold","ذهبي"), tag:t("Sells 4× faster","يباع أسرع ٤ مرات"),
      price:35, duration:t("/ 3 months","/ ٣ أشهر"), color:"#B7791F", accent:"#FEF3C7", selected:true,
      desc:t("Maximum exposure, dedicated agent, top placement.","أقصى ظهور، وكيل مخصص، وأعلى الترتيب."),
      features:[
        {icon:"calendar",     t:t("Listing active for 3 months","الإعلان فعّال لمدة ٣ أشهر"), highlight:true},
        {icon:"doc",          t:t("Full 71-point inspection report","تقرير فحص ٧١ نقطة")},
        {icon:"camera",       t:t("Pro photoshoot + 360° spin","تصوير احترافي مع ٣٦٠°")},
        {icon:"user",         t:t("Dedicated sales agent","وكيل مبيعات مخصص")},
        {icon:"phone",        t:t("Full negotiation & paperwork","تفاوض وأوراق كاملة")},
        {icon:"sparkle",      t:t("Premium marketing across all channels","تسويق متميز عبر كل القنوات")},
        {icon:"shield",       t:t("Featured for 30 days","مميز ٣٠ يوم"), highlight:true},
        {icon:"return",       t:t("Auto-republish 10× to top","إعادة نشر تلقائي ١٠ مرات"), highlight:true},
        {icon:"check-circle", t:t("Full wallet refund if unsold","استرداد كامل إذا لم تُبَع"), highlight:true},
      ] },
  ];

  const selfPlans = [
    { id:"basic", name:t("Basic","أساسي"), tag:t("Starter","البداية"),
      price:7, duration:t("/ 14 days","/ ١٤ يوم"), color:"#475569", accent:"#E2E8F0",
      desc:t("Get your listing live in minutes.","انشر إعلانك في دقائق."),
      features:[
        {icon:"calendar", t:t("14 days listing","١٤ يوم نشر")},
        {icon:"camera",   t:t("Upload up to 10 photos","حتى ١٠ صور")},
        {icon:"phone",    t:t("Direct buyer chat","تواصل مباشر")},
        {icon:"shield",   t:t("Masked phone number","رقم مخفي")},
      ] },
    { id:"premium", name:t("Premium","مميز"), tag:t("2× reach","ضعف الوصول"),
      price:10, duration:t("/ 21 days","/ ٢١ يوم"), color:"#475569", accent:"#E2E8F0",
      desc:t("More eyes, more leads, faster sale.","ظهور أكبر، عملاء أكثر، بيع أسرع."),
      features:[
        {icon:"calendar", t:t("21 days listing","٢١ يوم نشر")},
        {icon:"camera",   t:t("Upload up to 20 photos","حتى ٢٠ صورة")},
        {icon:"shield",   t:t("Highlighted card border","بطاقة مميزة")},
        {icon:"return",   t:t("Republish to top 3×","إعادة نشر ٣ مرات")},
        {icon:"phone",    t:t("Direct buyer chat","تواصل مباشر")},
      ] },
    { id:"advanced", name:t("Advanced","متقدم"), tag:t("Best value","أفضل قيمة"),
      price:12, duration:t("/ 1 month","/ شهر"), color:"#B7791F", accent:"#FEF3C7", selected:true,
      desc:t("Everything in Premium + doorstep photoshoot.","كل ما في المميز + تصوير في الموقع."),
      features:[
        {icon:"calendar", t:t("1 month listing","شهر نشر"), highlight:true},
        {icon:"camera",   t:t("Doorstep professional photoshoot","تصوير احترافي في الموقع"), highlight:true},
        {icon:"dollar",   t:t("Cash offer within 1-2 days","عرض نقدي خلال ١-٢ يوم")},
        {icon:"shield",   t:t("Featured for 15 days","مميز ١٥ يوم"), highlight:true},
        {icon:"return",   t:t("Republish to top 5×","إعادة نشر ٥ مرات"), highlight:true},
        {icon:"phone",    t:t("Priority buyer support","دعم ذو أولوية")},
      ] },
  ];

  const plans = isConcierge ? conciergePlans : selfPlans;
  const [selected, setSelected] = React.useState(plans.find(p=>p.selected)?.id || plans[0].id);

  const selectedPlan = plans.find(p=>p.id===selected);
  const wallet = isConcierge ? 0 : 0;
  const total = selectedPlan.price - wallet;

  const continueOn = () => {
    toast(t(`${selectedPlan.name} selected — confirming your order.`, "تم التحديد — جاري التأكيد."), "success");
    setTimeout(()=>go({page:"account", tab: isConcierge ? "orders" : "listings"}), 900);
  };

  return (
    <div className="cdw-wrap pln2-wrap">
      <header className="cdw-header">
        <div className="cdw-header-inner">
          <button className="cdw-icon-btn" onClick={()=>go({page:"sell", path:"choose"})}>
            <Icon name="chevron-left" size={18}/>
          </button>
          <div className="pln2-header-title">
            <span className="pln2-header-step">{t("Final step","الخطوة الأخيرة")}</span>
            <h1>{isConcierge ? t("Concierge service plans","باقات خدمة الكونسيرج") : t("Self-service plans","باقات النشر الذاتي")}</h1>
          </div>
          <button className="cdw-icon-btn" onClick={()=>go({page:"sell"})}>
            <Icon name="x" size={18}/>
          </button>
        </div>
      </header>

      <div className="pln2-body">
        <div className="container">
          {/* Intro */}
          <div className="pln2-intro">
            <Badge variant="royal-soft">{t("Step 4 of 4","الخطوة ٤ من ٤")}</Badge>
            <h2>{t("Pick the plan that gets you sold","اختر الخطة التي تبيع سيارتك")}</h2>
            <p>{isConcierge
              ? t("All Concierge plans include our 71-point inspection and end-to-end handling. The difference is speed, marketing reach and refund guarantee.","جميع باقات الكونسيرج تشمل الفحص الكامل. الفرق في السرعة والتسويق والضمان.")
              : t("Choose how much visibility your listing gets. Upgrade anytime.","اختر مدى ظهور إعلانك. ترقية متاحة في أي وقت.")}</p>
          </div>

          {/* Plan cards — 3 columns */}
          <div className="pln2-grid">
            {plans.map(p=>{
              const isSel = selected===p.id;
              const isFeatured = p.selected; // pre-selected/recommended = featured visually
              return (
                <article key={p.id}
                  className={`pln2-card ${isSel?"selected":""} ${isFeatured?"featured":""}`}
                  onClick={()=>setSelected(p.id)}>
                  {isFeatured && (
                    <div className="pln2-ribbon">
                      <Icon name="sparkle" size={12}/>
                      <span>{t("Recommended","موصى به")}</span>
                    </div>
                  )}
                  <div className="pln2-card-top" style={{background: p.accent}}>
                    <span className="pln2-card-tag" style={{color: p.color}}>{p.tag}</span>
                    <h3 className="pln2-card-name" style={{color: p.color}}>{p.name}</h3>
                  </div>
                  <div className="pln2-card-price">
                    <span className="pln2-card-currency">KWD</span>
                    <span className="pln2-card-amt">{p.price}</span>
                    <span className="pln2-card-dur">{p.duration}</span>
                  </div>
                  <p className="pln2-card-desc">{p.desc}</p>
                  <hr/>
                  <ul className="pln2-card-features">
                    {p.features.map((f,i)=>(
                      <li key={i} className={f.highlight?"hl":""}>
                        <span className="pln2-feat-icon"><Icon name={f.icon} size={14}/></span>
                        <span>{f.t}</span>
                      </li>
                    ))}
                  </ul>
                  <button className={`pln2-card-select ${isSel?"on":""}`}
                          onClick={(e)=>{e.stopPropagation(); setSelected(p.id);}}>
                    <span className={`pln2-radio ${isSel?"on":""}`}>
                      {isSel && <span className="pln2-radio-dot"/>}
                    </span>
                    {isSel ? t("Selected","تم الاختيار") : t("Select plan","اختر الباقة")}
                  </button>
                </article>
              );
            })}
          </div>

          {/* Live summary bar (sticky on desktop) */}
          <div className="pln2-summary">
            <div className="pln2-summary-l">
              <span className="pln2-summary-label">{t("You're getting","ستحصل على")}</span>
              <div className="pln2-summary-plan">
                <strong>{selectedPlan.name}</strong>
                <span className="pln2-summary-tag" style={{background: selectedPlan.accent, color: selectedPlan.color}}>{selectedPlan.tag}</span>
              </div>
              <div className="pln2-summary-extras">
                <span><Icon name="check-circle" size={12}/> {t("Cancel anytime","إلغاء في أي وقت")}</span>
                {isConcierge && <span><Icon name="check-circle" size={12}/> {t("Refund guarantee","ضمان استرداد")}</span>}
                <span><Icon name="check-circle" size={12}/> {t("Secure payment","دفع آمن")}</span>
              </div>
            </div>
            <div className="pln2-summary-divider"/>
            <div className="pln2-summary-r">
              <div className="pln2-summary-total">
                <span className="pln2-summary-total-label">{t("Total today","الإجمالي")}</span>
                <div className="pln2-summary-total-amt">
                  <span className="pln2-tc">KWD</span>
                  <strong>{total}</strong>
                </div>
              </div>
              <Button variant="primary" size="lg" onClick={continueOn} className="pln2-continue">
                {t("Continue to payment","متابعة للدفع")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
            </div>
          </div>

          {/* Payment methods + reassurance */}
          <div className="pln2-bottom">
            <div className="pln2-payments">
              <span>{t("Pay securely with","الدفع الآمن عبر")}</span>
              <div className="pln2-pay-methods">
                <span className="pln2-pay-method knet">KNET</span>
                <span className="pln2-pay-method visa">VISA</span>
                <span className="pln2-pay-method mc">MC</span>
                <span className="pln2-pay-method apple">Pay</span>
              </div>
            </div>
            <div className="pln2-trust">
              <Icon name="shield" size={14}/>
              <span>{t("256-bit encrypted. CITRA compliant.","تشفير ٢٥٦ بت. متوافق مع CITRA.")}</span>
            </div>
          </div>

          {!isConcierge && (
            <div className="pln2-bundle">
              <div className="pln2-bundle-icon">🚗</div>
              <div>
                <strong>{t("Selling more than one car?","تبيع أكثر من سيارة؟")}</strong>
                <p>{t("Save up to 40% with our dealer bundles.","وفّر حتى ٤٠٪ مع باقات التجار.")}</p>
              </div>
              <button className="pln2-bundle-cta">{t("See bundles","تصفح الباقات")} <Icon name="arrow-right" size={14}/></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
