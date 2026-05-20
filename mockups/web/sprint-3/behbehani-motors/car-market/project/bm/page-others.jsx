/* eslint-disable */
// Financing page, Services marketplace, Dealers index, Account dashboard

const FinancePage = ({locale, go, route}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [price, setPrice] = React.useState(8000);
  const [down, setDown] = React.useState(20);
  const [tenure, setTenure] = React.useState(60);
  const [openFaq, setOpenFaq] = React.useState(0);
  const [activeBank, setActiveBank] = React.useState("abk");

  const offers = PARTNER_BANKS.map(b=>{
    const principal = price * (1 - down/100);
    const r = b.apr/100/12;
    const monthly = principal * r / (1 - Math.pow(1+r, -tenure));
    return { ...b, principal, monthly, total: monthly*tenure + price*down/100 };
  }).sort((a,b)=>a.monthly-b.monthly);

  const best = offers[0];
  const yourPick = offers.find(o=>o.id===activeBank) || best;

  const faqs = [
    { q:t("How does soft pre-qualification work?","كيف يعمل التأهيل المبدئي؟"),
      a:t("We send your basic info to all partner banks at once. They run a soft check — invisible to credit bureaus — and return indicative rates within minutes. You only proceed to a hard credit check when you accept an offer.","نرسل معلوماتك الأساسية لكل البنوك. يجرون فحصاً مبدئياً غير ظاهر في السجل الائتماني ويعيدون أسعاراً تقديرية خلال دقائق.") },
    { q:t("What documents do I need?","ما المستندات المطلوبة؟"),
      a:t("Civil ID (both sides), salary certificate dated within 30 days, and last 3 months bank statements. Expats need a passport copy with valid residency.","البطاقة المدنية الوجهين، شهادة راتب، وكشف حساب لـ٣ أشهر. للمقيمين: نسخة جواز السفر مع الإقامة.") },
    { q:t("Can I pay off my loan early?","هل يمكنني السداد المبكر؟"),
      a:t("Yes — every partner bank in our network supports prepayment with a small administration fee (typically 1%). You can clear the balance any time.","نعم — كل البنوك في شبكتنا تدعم السداد المبكر برسوم بسيطة (عادة ١٪).") },
    { q:t("What's the difference between APR and interest rate?","ما الفرق بين APR ونسبة الفائدة؟"),
      a:t("APR is the all-in cost of the loan — interest plus any admin fees, processing or insurance. It's the apples-to-apples number we show so you can compare offers fairly.","APR هو إجمالي تكلفة القرض شاملاً الفائدة والرسوم. هو الرقم العادل للمقارنة.") },
    { q:t("How long is approval valid?","كم تستمر صلاحية الموافقة؟"),
      a:t("Pre-qualification offers are valid for 30 days. Once you pick a car and submit final documents, the bank issues a binding approval typically valid for 60–90 days.","عروض التأهيل المبدئي صالحة ٣٠ يوماً. بعد اختيار السيارة، الموافقة النهائية صالحة ٦٠-٩٠ يوماً.") },
  ];

  return (
    <div className="fin2">
      {/* ============== HERO with live calculator ============== */}
      <section className="fin2-hero">
        <div className="fin2-bg">
          <div className="fin2-blob b1"/>
          <div className="fin2-blob b2"/>
        </div>
        <div className="container fin2-hero-inner">
          <div className="fin2-hero-text">
            <Badge variant="royal-soft" icon="sparkle">{t("Financing","التمويل")}</Badge>
            <h1>
              {t("Drive home today.","انطلق اليوم.")}<br/>
              <span className="fin2-accent">{t("Pay over years.","ادفع على سنوات.")}</span>
            </h1>
            <p>{t("Pre-qualify with 5 banks in under 6 minutes. Soft credit check, no impact on your record. Compare APRs side-by-side, lock your rate for 30 days.",
                  "تأهل مع ٥ بنوك خلال ٦ دقائق. فحص ائتماني خفيف بدون أثر. قارن المعدلات وثبّت سعرك ٣٠ يوماً.")}</p>
            <div className="fin2-hero-perks">
              <div><Icon name="check-circle" size={16} color="var(--green)"/> {t("No impact on credit","بدون أثر على السجل")}</div>
              <div><Icon name="check-circle" size={16} color="var(--green)"/> {t("CBK-compliant disclosure","إفصاح متوافق")}</div>
              <div><Icon name="check-circle" size={16} color="var(--green)"/> {t("Reusable across cars","قابل لإعادة الاستخدام")}</div>
            </div>
            <div className="fin2-hero-ctas">
              <Button variant="primary" size="lg" onClick={()=>document.querySelector('.fin2-offers').scrollIntoView({behavior:"smooth"})}>
                {t("See live bank offers","عروض البنوك المباشرة")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
              <Button variant="ghost" size="lg" onClick={()=>document.querySelector('.fin2-how').scrollIntoView({behavior:"smooth"})}>
                {t("How it works","كيف يعمل")}
              </Button>
            </div>
            <div className="fin2-hero-banks">
              <span>{t("Partner banks","البنوك الشريكة")}:</span>
              {PARTNER_BANKS.map(b=><div key={b.id} className="fin2-bank-pill">{b.short}</div>)}
            </div>
          </div>

          {/* Live calculator card */}
          <aside className="fin2-calc">
            <div className="fin2-calc-head">
              <Icon name="calc" size={20} color="var(--royal)"/>
              <h3>{t("Quick estimate","تقدير سريع")}</h3>
              <Badge variant="green-soft">{t("Live rates","أسعار حية")}</Badge>
            </div>
            <div className="fin2-calc-body">
              <div className="fin2-slider">
                <div className="fin2-slider-label">
                  <span>{t("Car price","سعر السيارة")}</span>
                  <strong>{fmtKWD(price,locale)}</strong>
                </div>
                <input type="range" min="2000" max="50000" step="500" value={price} onChange={e=>setPrice(+e.target.value)}/>
                <div className="fin2-slider-marks"><span>2K</span><span>50K</span></div>
              </div>
              <div className="fin2-slider">
                <div className="fin2-slider-label">
                  <span>{t("Down payment","الدفعة المقدمة")}</span>
                  <strong>{down}% · {fmtKWD(Math.round(price*down/100),locale)}</strong>
                </div>
                <input type="range" min="0" max="60" step="5" value={down} onChange={e=>setDown(+e.target.value)}/>
                <div className="fin2-slider-marks"><span>0%</span><span>60%</span></div>
              </div>
              <div className="fin2-slider">
                <div className="fin2-slider-label">
                  <span>{t("Tenure","المدة")}</span>
                  <strong>{tenure} {t("months","شهر")} · {Math.round(tenure/12)} {t("years","سنة")}</strong>
                </div>
                <input type="range" min="12" max="84" step="6" value={tenure} onChange={e=>setTenure(+e.target.value)}/>
                <div className="fin2-slider-marks"><span>1y</span><span>7y</span></div>
              </div>

              <div className="fin2-result">
                <div className="fin2-result-monthly">
                  <span className="fin2-result-label">{t("Estimated monthly","القسط الشهري")}</span>
                  <div className="fin2-result-amt">
                    <strong>{fmtKWD(Math.round(best.monthly),locale)}</strong>
                    <span>/ {t("mo","شهر")}</span>
                  </div>
                  <span className="fin2-result-from">{t("from","من")} {best.apr}% APR · {best.short}</span>
                </div>
                <div className="fin2-result-bd">
                  <div><span>{t("Loan","القرض")}</span><strong>{fmtKWD(Math.round(best.principal),locale)}</strong></div>
                  <div><span>{t("Interest","الفائدة")}</span><strong>{fmtKWD(Math.round(best.total - best.principal - price*down/100),locale)}</strong></div>
                  <div><span>{t("Total","الإجمالي")}</span><strong>{fmtKWD(Math.round(best.total),locale)}</strong></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ============== HOW IT WORKS — 4 steps ============== */}
      <section className="fin2-how container">
        <div className="fin2-section-head">
          <span className="section-eyebrow">{t("How it works","كيف يعمل")}</span>
          <h2>{t("From idea to driveway in days","من الفكرة للتسليم في أيام")}</h2>
          <p>{t("Four simple steps. No paperwork until you're ready.","أربع خطوات بسيطة. لا أوراق حتى تكون جاهزاً.")}</p>
        </div>
        <div className="fin2-how-grid">
          {[
            { ic:"sparkle",      ti:t("Tell us about you","عرّفنا بنفسك"),     su:t("Civil ID, monthly salary, employer. Takes 4 minutes — no documents yet.","البطاقة المدنية، الراتب، جهة العمل. ٤ دقائق بدون مستندات.") },
            { ic:"calc",         ti:t("Get pre-qualified","تأهل مبدئياً"),     su:t("Five banks reply with indicative APRs in minutes. Pick a winner.","خمس بنوك ترد بمعدلات تقديرية خلال دقائق.") },
            { ic:"car",          ti:t("Pick your car","اختر سيارتك"),         su:t("Browse any car within your approved amount. Reuse the approval as you shop.","تصفح أي سيارة ضمن المبلغ المعتمد.") },
            { ic:"check-circle", ti:t("E-sign and drive","وقّع وانطلق"),       su:t("Final approval in 1-2 business days. Then home delivery.","الموافقة النهائية ١-٢ يوم. ثم التوصيل للمنزل.") },
          ].map((s,i)=>(
            <div key={s.ti} className="fin2-how-step">
              <div className="fin2-how-step-num">{String(i+1).padStart(2,"0")}</div>
              <div className="fin2-how-step-icon"><Icon name={s.ic} size={24}/></div>
              <h3>{s.ti}</h3>
              <p>{s.su}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== LIVE BANK OFFERS ============== */}
      <section className="fin2-offers">
        <div className="container">
          <div className="fin2-section-head">
            <span className="section-eyebrow">{t("Live offers","عروض حية")}</span>
            <h2>{t("Real rates, side by side","أسعار حقيقية، جنباً إلى جنب")}</h2>
            <p>{t("Tap an offer to pre-qualify. Sorted by lowest monthly payment for your inputs above.","اضغط أحدها للتأهل. مرتبة حسب أقل قسط شهري.")}</p>
          </div>
          <div className="fin2-offers-list">
            {offers.map((o,i)=>(
              <article key={o.id} className={`fin2-offer ${i===0?"best":""} ${activeBank===o.id?"selected":""}`}
                       onClick={()=>setActiveBank(o.id)}>
                <div className="fin2-offer-rank">
                  {i===0 && <Badge variant="green">{t("Best deal","أفضل عرض")}</Badge>}
                  {i!==0 && <span className="fin2-offer-rank-num">#{i+1}</span>}
                </div>
                <div className="fin2-offer-bank">
                  <div className="fin2-offer-logo">{o.short}</div>
                  <div>
                    <h4>{o.name}</h4>
                    <div className="fin2-offer-rate">{o.apr}% APR · {t("Fee","رسم")} KWD {o.fee}</div>
                  </div>
                </div>
                <div className="fin2-offer-stat">
                  <span>{t("Monthly","شهرياً")}</span>
                  <strong>{fmtKWD(Math.round(o.monthly),locale)}</strong>
                </div>
                <div className="fin2-offer-stat">
                  <span>{t("Total payable","الإجمالي")}</span>
                  <strong>{fmtKWD(Math.round(o.total),locale)}</strong>
                </div>
                <div className="fin2-offer-stat">
                  <span>{t("Vs. best","مقابل الأفضل")}</span>
                  <strong className={o.monthly>best.monthly?"warn":"ok"}>
                    {o.monthly>best.monthly ? `+ ${fmtKWD(Math.round(o.monthly-best.monthly),locale)}` : "—"}
                  </strong>
                </div>
                <Button variant={i===0?"primary":"secondary"} className="fin2-offer-cta">
                  {t("Pre-qualify","تأهل")}
                  <Icon name="arrow-right" size={14}/>
                </Button>
              </article>
            ))}
          </div>
          <div className="fin2-offers-foot">
            <Icon name="info" size={14}/>
            <span>{t("All rates comply with Central Bank of Kuwait disclosure rules. Final approval depends on bank review of submitted documents.","جميع المعدلات متوافقة مع بنك الكويت المركزي. الموافقة النهائية بعد مراجعة المستندات.")}</span>
          </div>
        </div>
      </section>

      {/* ============== WHY US ============== */}
      <section className="fin2-why container">
        <div className="fin2-section-head">
          <span className="section-eyebrow">{t("Why Behbehani","لماذا بهبهاني")}</span>
          <h2>{t("More than a calculator","أكثر من حاسبة")}</h2>
        </div>
        <div className="fin2-why-grid">
          {[
            { ic:"sparkle",       ti:t("One application, all banks","طلب واحد لكل البنوك"),     su:t("Apply once. We fan out to 5 lenders so you don't have to.","قدّم مرة، نوزع على ٥ بنوك.") },
            { ic:"shield",        ti:t("Best-rate guarantee","ضمان أفضل سعر"),                  su:t("If a bank offers a better APR after acceptance, we'll switch you over for free.","لو حصلت على معدل أفضل بعد القبول، نحوّلك مجاناً.") },
            { ic:"clock",         ti:t("6-minute application","تقديم خلال ٦ دقائق"),            su:t("No paperwork until you accept. Pre-qualify entirely online.","لا أوراق حتى القبول. التأهل بالكامل أونلاين.") },
            { ic:"return",        ti:t("Reusable approval","موافقة قابلة لإعادة الاستخدام"),    su:t("Browse any inspected car within your approved amount. Lock-in lasts 30 days.","تصفح أي سيارة. التثبيت ٣٠ يوم.") },
            { ic:"doc",           ti:t("CBK-compliant disclosure","إفصاح متوافق"),               su:t("Full APR, fees and total cost on every offer. No hidden surprises.","APR ورسوم وإجمالي على كل عرض.") },
            { ic:"phone",         ti:t("Human help when you need it","دعم بشري عند الحاجة"),    su:t("Talk to a Kuwait-based loan advisor — no chatbots, no scripts.","تحدث مع مستشار في الكويت — بدون آلية.") },
          ].map(w=>(
            <div key={w.ti} className="fin2-why-item">
              <div className="fin2-why-icon"><Icon name={w.ic} size={22}/></div>
              <h4>{w.ti}</h4>
              <p>{w.su}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== ELIGIBILITY ============== */}
      <section className="fin2-elig">
        <div className="container fin2-elig-inner">
          <div>
            <Badge variant="royal-soft">{t("Eligibility","الأهلية")}</Badge>
            <h2>{t("Who can apply?","من يمكنه التقديم؟")}</h2>
            <p>{t("Behbehani Financing is open to all Kuwait residents — citizens and expats — meeting the standard banking criteria.","التمويل متاح لكل المقيمين في الكويت من مواطنين ومقيمين وفق معايير البنوك القياسية.")}</p>
            <ul className="fin2-elig-list">
              <li><Icon name="check-circle" size={16}/> {t("Age 21–65 at end of tenure","العمر ٢١-٦٥ عند نهاية المدة")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Valid Civil ID + residency (expats)","البطاقة المدنية + الإقامة")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Minimum salary KWD 350/month","حد أدنى ٣٥٠ د.ك شهرياً")}</li>
              <li><Icon name="check-circle" size={16}/> {t("6+ months in current employment","٦ أشهر في العمل الحالي")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Clean credit history (CBK check)","سجل ائتماني نظيف")}</li>
            </ul>
          </div>
          <div className="fin2-elig-card">
            <div className="fin2-elig-card-icon"><Icon name="user" size={28}/></div>
            <h3>{t("Not sure if you qualify?","غير متأكد من الأهلية؟")}</h3>
            <p>{t("Run a soft check — invisible to credit bureaus — and get a clear answer in minutes.","افحص بشكل خفيف — غير ظاهر للسجل — واحصل على إجابة في دقائق.")}</p>
            <Button variant="primary" size="lg" style={{width:"100%"}}>
              {t("Check my eligibility","افحص أهليتي")}
              <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
            </Button>
            <div className="fin2-elig-card-note">
              <Icon name="shield" size={12}/>
              {t("No impact on your credit score","بدون أثر على سجلك الائتماني")}
            </div>
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="fin2-faq container">
        <div className="fin2-section-head">
          <span className="section-eyebrow">FAQ</span>
          <h2>{t("Common questions","الأسئلة الشائعة")}</h2>
        </div>
        <div className="fin2-faq-list">
          {faqs.map((f,i)=>(
            <div key={i} className={`fin2-faq-item ${openFaq===i?"open":""}`}>
              <button onClick={()=>setOpenFaq(openFaq===i?-1:i)}>
                <span>{f.q}</span>
                <Icon name={openFaq===i?"chevron-down":"chevron-right"} size={18}/>
              </button>
              {openFaq===i && <div className="fin2-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="fin2-cta">
        <div className="container fin2-cta-inner">
          <div>
            <h2>{t("Ready to pre-qualify?","جاهز للتأهل المبدئي؟")}</h2>
            <p>{t("Six minutes. Five banks. Zero impact on your credit.","ست دقائق. خمس بنوك. صفر أثر.")}</p>
          </div>
          <Button variant="white" size="lg">
            {t("Start application","ابدأ التقديم")}
            <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
          </Button>
        </div>
      </section>
    </div>
  );
};

// ---------- Services Marketplace ----------
const ServicesPage = ({locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const categories = [
    { id:"wash",    icon:"sparkle", ti:t("Wash & Detailing","الغسيل والتلميع"),    from:8,  count:42, color:"#1e40af" },
    { id:"tint",    icon:"shield",  ti:t("Window Tinting","تظليل النوافذ"),       from:35, count:18, color:"#0f766e" },
    { id:"renewal", icon:"doc",     ti:t("Registration Renewal","تجديد الترخيص"), from:25, count:6,  color:"#a16207" },
    { id:"ppf",     icon:"sparkle", ti:t("Paint Protection","حماية الطلاء"),       from:280,count:8,  color:"#7c2d12" },
    { id:"tires",   icon:"car",     ti:t("Tire Replacement","تبديل الإطارات"),    from:120,count:24, color:"#374151" },
    { id:"glass",   icon:"camera",  ti:t("Glass & Windshield","الزجاج"),         from:30, count:12, color:"#1e3a8a" },
    { id:"health",  icon:"check-circle", ti:t("Car Health Check","فحص شامل"),   from:15, count:32, color:"#15803d" },
  ];

  const featuredVendors = [
    { id:"v1", name:"Sparkle Auto Spa",   svc:t("Wash & detailing","غسيل وتلميع"),  rating:4.9, reviews:284, dist:"3.2 km", slot:t("Today 2:00 PM","اليوم ٢:٠٠"), price:25 },
    { id:"v2", name:"Tint Pro Kuwait",    svc:t("Window tinting","تظليل"),         rating:4.8, reviews:156, dist:"5.1 km", slot:t("Tomorrow 10:00 AM","غداً ١٠:٠٠"), price:55 },
    { id:"v3", name:"GoodYear Center",    svc:t("Tires & alignment","إطارات"),     rating:4.7, reviews:412, dist:"2.4 km", slot:t("Today 5:00 PM","اليوم ٥:٠٠"), price:140 },
    { id:"v4", name:"Quick Glass",        svc:t("Windshield repair","إصلاح زجاج"), rating:4.9, reviews:98,  dist:"6.7 km", slot:t("Tomorrow 9:00 AM","غداً ٩:٠٠"), price:35 },
  ];

  return (
    <>
      <section className="services-hero">
        <div className="container">
          <Badge variant="white">{t("Car services","خدمات السيارات")}</Badge>
          <h1>{t("Book a service in 2 minutes.","احجز خدمة خلال دقيقتين.")}</h1>
          <p>{t("Verified vendors. Real-time slots. Pay online or on completion.","موردون موثوقون. مواعيد فورية.")}</p>
        </div>
      </section>

      <section className="container section">
        <SectionHead eyebrow={t("Services","الخدمات")} title={t("Pick a service category","اختر فئة الخدمة")}/>
        <div className="svc-cat-grid">
          {categories.map(c=>(
            <button key={c.id} className="svc-cat" style={{"--svc-color":c.color}}>
              <div className="svc-cat-icon"><Icon name={c.icon} size={26}/></div>
              <div className="svc-cat-body">
                <h3>{c.ti}</h3>
                <div className="svc-cat-meta">{c.count} {t("vendors","مورد")} · {t("from","من")} {fmtKWD(c.from,locale)}</div>
              </div>
              <Icon name="arrow-right" size={16} color="var(--muted)"/>
            </button>
          ))}
        </div>
      </section>

      <section className="container section">
        <SectionHead eyebrow={t("Top-rated near you","الأعلى تقييماً")} title={t("Featured vendors today","موردون مميزون اليوم")}/>
        <div className="vendor-grid">
          {featuredVendors.map(v=>(
            <article key={v.id} className="vendor-card">
              <div className="vendor-card-img">
                <Icon name="wrench" size={32} color="#fff"/>
              </div>
              <div className="vendor-card-body">
                <h3>{v.name}</h3>
                <div className="vendor-svc">{v.svc}</div>
                <div className="vendor-meta">
                  <span><Icon name="star" size={12} color="#f59e0b"/> {v.rating} <span className="vendor-reviews">({v.reviews})</span></span>
                  <span><Icon name="map-pin" size={12}/> {v.dist}</span>
                </div>
                <div className="vendor-slot">
                  <Icon name="clock" size={12}/>
                  <span>{t("Next slot","الموعد القادم")}: <strong>{v.slot}</strong></span>
                </div>
                <div className="vendor-bottom">
                  <div className="vendor-price">{t("from","من")} {fmtKWD(v.price,locale)}</div>
                  <Button variant="primary" onClick={()=>toast(t("Booking confirmed!","تم الحجز!"),"success")}>{t("Book","احجز")}</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
};

// ---------- Dealers Index ----------
const DealersPage = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const dealers = [
    { id:"d1", name:"Auto Plaza KW",       cars:42, rating:4.8, loc:"Jabriya",     brands:["BMW","Mercedes","Audi"] },
    { id:"d2", name:"Reza Motors",          cars:68, rating:4.6, loc:"Salmiya",     brands:["Toyota","Honda","Kia"] },
    { id:"d3", name:"Bavaria Cars",         cars:31, rating:4.9, loc:"Jabriya",     brands:["BMW","Mini","Audi"] },
    { id:"d4", name:"Pearl Auto Gallery",   cars:55, rating:4.7, loc:"Kuwait City", brands:["Lexus","Toyota","Infiniti"] },
    { id:"d5", name:"Desert Drive",         cars:24, rating:4.5, loc:"Farwaniya",   brands:["Nissan","Renault"] },
    { id:"d6", name:"Royal Wheels",         cars:38, rating:4.8, loc:"Salmiya",     brands:["Range Rover","Porsche","Bentley"] },
  ];
  return (
    <>
      <section className="dealers-hero">
        <div className="container">
          <Badge variant="white">{t("Verified dealerships","معارض موثقة")}</Badge>
          <h1>{t("Browse Kuwait's top car dealerships","تصفح أبرز المعارض في الكويت")}</h1>
          <p>{t("250+ verified dealers · 8,400+ cars in stock","٢٥٠+ معرض موثق · ٨٤٠٠+ سيارة")}</p>
        </div>
      </section>
      <section className="container section">
        <div className="dealers-grid">
          {dealers.map(d=>(
            <article key={d.id} className="dealer-card">
              <div className="dealer-card-banner">
                <div className="dealer-card-logo">{d.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
              </div>
              <div className="dealer-card-body">
                <h3>{d.name}</h3>
                <div className="dealer-card-meta">
                  <span><Icon name="star" size={12} color="#f59e0b"/> {d.rating}</span>
                  <span>·</span>
                  <span>{d.cars} {t("cars","سيارة")}</span>
                  <span>·</span>
                  <span><Icon name="map-pin" size={12}/> {d.loc}</span>
                </div>
                <div className="dealer-card-brands">
                  {d.brands.map(b=><Badge key={b} variant="slate-soft">{b}</Badge>)}
                </div>
                <Button variant="secondary" style={{width:"100%"}}>{t("View showroom","عرض المعرض")}</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
};

// ---------- Account Dashboard ----------
const AccountPage = ({locale, go, route, user, favs, toggleFav, signOut, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [tab, setTab] = React.useState(route.tab || "overview");
  if (!user) return null;

  const tabs = [
    ["overview",   t("Overview","نظرة عامة"),    "user"],
    ["orders",     t("Orders","الطلبات"),         "shield"],
    ["favorites",  t("Favorites","المفضلة"),     "heart"],
    ["financing",  t("Financing","التمويل"),     "calc"],
    ["deliveries", t("Deliveries","التوصيل"),    "truck"],
    ["returns",    t("Returns","الإرجاع"),        "return"],
    ["maintenance",t("Maintenance","الصيانة"),    "wrench"],
    ["listings",   t("My listings","إعلاناتي"),  "list"],
    ["documents",  t("Documents","المستندات"),   "doc"],
    ["profile",    t("Profile","الملف الشخصي"),  "user"],
  ];

  return (
    <div className="container account">
      <div className="account-head">
        <div className="account-avatar">{user.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
        <div>
          <h1>{user.name}</h1>
          <div className="account-meta">{user.phone} · {user.email}</div>
        </div>
        <Button variant="ghost" onClick={signOut}>{t("Sign out","تسجيل خروج")}</Button>
      </div>

      <div className="account-body">
        <aside className="account-nav">
          {tabs.map(([k,l,ic])=>(
            <button key={k} className={tab===k?"on":""} onClick={()=>setTab(k)}>
              <Icon name={ic} size={16}/> <span>{l}</span>
            </button>
          ))}
        </aside>

        <main className="account-main">
          {tab==="overview" && <AccountOverview locale={locale} user={user} go={go}/>}
          {tab==="orders" && <AccountOrders locale={locale} go={go}/>}
          {tab==="favorites" && <AccountFavorites locale={locale} go={go} favs={favs} toggleFav={toggleFav}/>}
          {tab==="financing" && <AccountFinancing locale={locale}/>}
          {tab==="deliveries" && <AccountDeliveries locale={locale} toast={toast}/>}
          {tab==="returns" && <AccountReturns locale={locale} toast={toast}/>}
          {tab==="maintenance" && <AccountMaintenance locale={locale} toast={toast}/>}
          {tab==="listings" && <AccountListings locale={locale} go={go}/>}
          {tab==="documents" && <AccountDocuments locale={locale}/>}
          {tab==="profile" && <AccountProfile locale={locale} user={user}/>}
        </main>
      </div>
    </div>
  );
};

const AccountOverview = ({locale, user, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <div className="account-cards">
        <div className="account-card">
          <div className="account-card-icon"><Icon name="shield" size={20}/></div>
          <div className="account-card-num">1</div>
          <div className="account-card-label">{t("Active order","طلب نشط")}</div>
          <button onClick={()=>go({page:"account",tab:"orders"})}>{t("View","عرض")} →</button>
        </div>
        <div className="account-card">
          <div className="account-card-icon"><Icon name="truck" size={20}/></div>
          <div className="account-card-num">1</div>
          <div className="account-card-label">{t("Out for delivery","قيد التوصيل")}</div>
          <button onClick={()=>go({page:"account",tab:"deliveries"})}>{t("Track","تتبع")} →</button>
        </div>
        <div className="account-card">
          <div className="account-card-icon"><Icon name="heart" size={20}/></div>
          <div className="account-card-num">5</div>
          <div className="account-card-label">{t("Favorites","المفضلة")}</div>
          <button onClick={()=>go({page:"account",tab:"favorites"})}>{t("View","عرض")} →</button>
        </div>
        <div className="account-card">
          <div className="account-card-icon"><Icon name="calc" size={20}/></div>
          <div className="account-card-num">{fmtKWD(178, locale)}</div>
          <div className="account-card-label">{t("Next payment","الدفعة القادمة")}</div>
          <button onClick={()=>go({page:"account",tab:"financing"})}>{t("View","عرض")} →</button>
        </div>
      </div>

      <div className="account-section">
        <h3>{t("What's happening","ما الجديد")}</h3>
        <ul className="account-timeline">
          <li>
            <div className="account-timeline-dot dot-green"><Icon name="truck" size={12} color="#fff"/></div>
            <div>
              <strong>{t("Out for delivery — 2025 Lexus RX 350","قيد التوصيل")}</strong>
              <p>{t("Driver Khalid is 12 minutes away. ETA 11:24 AM.","السائق على بعد ١٢ دقيقة.")}</p>
              <button className="link-arrow" onClick={()=>go({page:"account",tab:"deliveries"})}>{t("Track live","تتبع مباشر")} <Icon name="arrow-right" size={12}/></button>
            </div>
            <span className="account-timeline-time">12 {t("min ago","دقيقة")}</span>
          </li>
          <li>
            <div className="account-timeline-dot dot-blue"><Icon name="check-circle" size={12} color="#fff"/></div>
            <div>
              <strong>{t("Loan approved — Burgan Bank","تم اعتماد القرض")}</strong>
              <p>{t("KWD 7,840 over 60 months at 4.75% APR.","٧٨٤٠ د.ك على ٦٠ شهراً.")}</p>
            </div>
            <span className="account-timeline-time">2 {t("hours ago","ساعات")}</span>
          </li>
          <li>
            <div className="account-timeline-dot dot-amber"><Icon name="shield" size={12} color="#fff"/></div>
            <div>
              <strong>{t("Price dropped on a favorite","انخفض سعر مفضل")}</strong>
              <p>2022 Audi A6 — {t("now","الآن")} {fmtKWD(10500,locale)} ({t("was","كان")} {fmtKWD(10800,locale)})</p>
            </div>
            <span className="account-timeline-time">{t("yesterday","أمس")}</span>
          </li>
        </ul>
      </div>
    </>
  );
};

const AccountOrders = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const car = CARS[1];
  return (
    <div className="account-section">
      <h3>{t("Your orders","طلباتك")}</h3>
      <article className="order-card">
        <div className="order-card-img"><CarImage car={car}/></div>
        <div className="order-card-body">
          <Badge variant="royal">{t("In progress","قيد التنفيذ")}</Badge>
          <h3>{car.year} {brandOf(car.brand).name} {car.model}</h3>
          <div className="order-card-meta">{t("Order","طلب")} #BMC-2402 · {t("Placed","تم الطلب")} 28 Oct 2025</div>
          <div className="order-progress">
            {[t("Reserved","محجوز"), t("Financed","ممول"), t("Signed","موقّع"), t("Out for delivery","توصيل"), t("Delivered","تم التسليم")].map((s,i)=>(
              <div key={s} className={`order-step ${i<=3?"on":""} ${i===3?"active":""}`}>
                <span>{i<3?<Icon name="check" size={10}/>:i+1}</span>
                <strong>{s}</strong>
              </div>
            ))}
          </div>
          <div className="order-card-bottom">
            <div><span>{t("Total paid","المدفوع")}</span><strong>{fmtKWD(car.price,locale)}</strong></div>
            <Button variant="primary">{t("Track delivery","تتبع التوصيل")}</Button>
          </div>
        </div>
      </article>
    </div>
  );
};

const AccountFavorites = ({locale, go, favs, toggleFav}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const items = CARS.filter(c=>favs.has(c.id));
  return (
    <div className="account-section">
      <h3>{t("Saved cars","سياراتك المحفوظة")} ({items.length})</h3>
      {items.length===0 ? (
        <div className="account-empty">
          <Icon name="heart" size={36} color="var(--muted)"/>
          <p>{t("No favorites yet. Tap the heart icon on any car to save it.","لا توجد مفضلات بعد.")}</p>
          <Button variant="primary" onClick={()=>go({page:"browse"})}>{t("Browse cars","تصفح السيارات")}</Button>
        </div>
      ) : (
        <div className="browse-grid">
          {items.map(c=>(
            <CarCard key={c.id} car={c} locale={locale} fav={true}
                     onToggleFav={toggleFav} onOpen={(id)=>go({page:"vdp", id})}/>
          ))}
        </div>
      )}
    </div>
  );
};

const AccountFinancing = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("Loan schedule","جدول القرض")}</h3>
      <div className="loan-summary">
        <div><span>{t("Lender","البنك")}</span><strong>Burgan Bank</strong></div>
        <div><span>{t("Principal","الأصل")}</span><strong>{fmtKWD(7840,locale)}</strong></div>
        <div><span>{t("APR","الفائدة")}</span><strong>4.75%</strong></div>
        <div><span>{t("Tenure","المدة")}</span><strong>60 {t("months","شهر")}</strong></div>
        <div><span>{t("Monthly","شهرياً")}</span><strong>{fmtKWD(178,locale)}</strong></div>
        <div><span>{t("Next due","الاستحقاق")}</span><strong>15 Nov 2025</strong></div>
      </div>
      <table className="loan-table">
        <thead><tr><th>#</th><th>{t("Date","التاريخ")}</th><th>{t("Principal","الأصل")}</th><th>{t("Interest","الفائدة")}</th><th>{t("Balance","الرصيد")}</th><th>{t("Status","الحالة")}</th></tr></thead>
        <tbody>
          {[
            [1,"15 Sep 2025", 147, 31, 7693, "paid"],
            [2,"15 Oct 2025", 148, 30, 7545, "paid"],
            [3,"15 Nov 2025", 148, 30, 7397, "due"],
            [4,"15 Dec 2025", 149, 29, 7248, "upcoming"],
            [5,"15 Jan 2026", 149, 29, 7099, "upcoming"],
          ].map(r=>(
            <tr key={r[0]}>
              <td>{r[0]}</td><td>{r[1]}</td><td>{fmtKWD(r[2],locale)}</td><td>{fmtKWD(r[3],locale)}</td><td>{fmtKWD(r[4],locale)}</td>
              <td><Badge variant={r[5]==="paid"?"green-soft":r[5]==="due"?"amber-soft":"slate-soft"}>{t(r[5]==="paid"?"Paid":r[5]==="due"?"Due":"Upcoming","")}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AccountDeliveries = ({locale, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [eta, setEta] = React.useState(12);
  React.useEffect(()=>{
    const id = setInterval(()=>setEta(e=>Math.max(0, e-1)), 12000);
    return ()=>clearInterval(id);
  },[]);
  return (
    <div className="account-section">
      <h3>{t("Delivery tracking","تتبع التوصيل")}</h3>
      <div className="delivery-card">
        <div className="delivery-map">
          <svg viewBox="0 0 400 220" preserveAspectRatio="none" className="delivery-map-svg">
            <rect width="400" height="220" fill="#e5edf5"/>
            <path d="M0 80 Q100 120 200 90 T400 110" stroke="#cbd5e1" strokeWidth="3" fill="none"/>
            <path d="M40 200 L40 30 L380 30 L380 200" stroke="#cbd5e1" strokeWidth="2" fill="none"/>
            <path d="M40 100 L380 100" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M40 150 L380 150" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M150 30 L150 200" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M280 30 L280 200" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            {/* Route */}
            <path d="M60 180 Q150 160 200 130 Q260 100 340 70" stroke="var(--royal)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6,4" fill="none"/>
            {/* Start */}
            <circle cx="60" cy="180" r="8" fill="#16a34a"/>
            {/* Driver */}
            <circle cx="200" cy="130" r="11" fill="var(--royal)" stroke="#fff" strokeWidth="3"/>
            <circle cx="200" cy="130" r="22" fill="var(--royal)" opacity="0.15"/>
            {/* End */}
            <circle cx="340" cy="70" r="9" fill="#dc2626"/>
            <text x="60" y="200" fontSize="10" fill="#64748b" textAnchor="middle">{t("Warehouse","المخزن")}</text>
            <text x="340" y="58" fontSize="10" fill="#64748b" textAnchor="middle">{t("Your home","منزلك")}</text>
          </svg>
          <div className="delivery-eta">
            <div className="delivery-eta-num">{eta}</div>
            <div className="delivery-eta-label">{t("min away","دقيقة")}</div>
          </div>
        </div>
        <div className="delivery-info">
          <div className="delivery-driver">
            <div className="delivery-driver-avatar">KA</div>
            <div>
              <div className="delivery-driver-name">{t("Khalid A.","خالد ع.")} · {t("Your driver","سائقك")}</div>
              <div className="delivery-driver-rate"><Icon name="star" size={12} color="#f59e0b"/> 4.9 · {t("328 deliveries","٣٢٨ توصيل")}</div>
            </div>
            <div className="delivery-driver-actions">
              <button><Icon name="phone" size={16}/></button>
              <button><Icon name="whatsapp" size={16}/></button>
            </div>
          </div>
          <div className="delivery-steps">
            {[
              [t("Order confirmed","تأكيد الطلب"), "done"],
              [t("Vehicle prepared","تجهيز المركبة"), "done"],
              [t("Driver assigned","تعيين السائق"), "done"],
              [t("Out for delivery","قيد التوصيل"), "active"],
              [t("Delivered","تم التسليم"), "upcoming"],
            ].map(([l,s],i)=>(
              <div key={l} className={`delivery-step ${s}`}>
                <span>{s==="done"?<Icon name="check" size={10}/>:i+1}</span>
                <strong>{l}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountReturns = ({locale, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("Returns center","مركز الإرجاع")}</h3>
      <div className="returns-banner">
        <div className="returns-banner-icon"><Icon name="return" size={28}/></div>
        <div>
          <h4>{t("3-day / 300 km return guarantee","ضمان الإرجاع ٣ أيام / ٣٠٠ كم")}</h4>
          <p>{t("Changed your mind? We'll collect the car and refund you fully — no questions asked.","غيّرت رأيك؟ نأتي ونعيد المبلغ.")}</p>
        </div>
      </div>
      <div className="returns-eligibility">
        <h4>{t("Your eligible cars","سياراتك المؤهلة")}</h4>
        <article className="return-eligible">
          <CarImage car={CARS[0]} className="return-eligible-img"/>
          <div>
            <h5>2022 Toyota Camry XLE</h5>
            <div className="return-eligible-meta">{t("Delivered","تم التسليم")} 26 Oct 2025 · 142 km {t("driven","ممشى")}</div>
            <div className="return-eligible-bar">
              <div className="return-eligible-bar-inner">
                <div style={{width:"47%"}}/>
              </div>
              <span>2 {t("days, 158 km left","يوم، ١٥٨ كم متبقي")}</span>
            </div>
          </div>
          <Button variant="secondary" onClick={()=>toast(t("Return pickup scheduled. We'll confirm a time.","تم جدولة الإرجاع."),"success")}>
            {t("Start return","ابدأ الإرجاع")}
          </Button>
        </article>
      </div>
    </div>
  );
};

const AccountMaintenance = ({locale, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("Maintenance pickup","صيانة بالاستلام")}</h3>
      <div className="maint-quick">
        <h4>{t("Request a pickup","اطلب استلام")}</h4>
        <div className="maint-types">
          {[
            ["sparkle",t("Routine","دورية")],
            ["wrench",t("Repair","إصلاح")],
            ["car",t("Body work","صدام")],
            ["fuel",t("AC","تكييف")],
            ["info",t("Tires","إطارات")],
            ["doc",t("Other","أخرى")],
          ].map(([ic,l])=>(
            <button key={l}><Icon name={ic} size={20}/><span>{l}</span></button>
          ))}
        </div>
        <Button variant="primary" size="lg" style={{width:"100%"}} onClick={()=>toast(t("Pickup request created","تم إنشاء طلب الاستلام"),"success")}>{t("Schedule pickup","حدد موعد الاستلام")}</Button>
      </div>
    </div>
  );
};

const AccountListings = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("My listings","إعلاناتي")}</h3>
      <article className="my-listing">
        <CarImage car={CARS[14]} className="my-listing-img"/>
        <div className="my-listing-body">
          <Badge variant="amber-soft">{t("Pending review","قيد المراجعة")}</Badge>
          <h4>2020 Hyundai Sonata N-Line</h4>
          <div className="my-listing-meta">62,000 km · {fmtKWD(4500,locale)} · {t("Submitted","قُدّم")} 30 Oct</div>
          <p>{t("Your listing is being reviewed. Approval within 24 hours.","يتم مراجعة إعلانك.")}</p>
        </div>
        <div className="my-listing-actions">
          <button className="link-btn">{t("Edit","تعديل")}</button>
          <button className="link-btn red">{t("Delete","حذف")}</button>
        </div>
      </article>
      <Button variant="primary" onClick={()=>go({page:"sell", path:"self"})}>{t("Post new listing","نشر جديد")}</Button>
    </div>
  );
};

const AccountDocuments = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("Document vault","خزانة المستندات")}</h3>
      <div className="docs-vault">
        {[
          ["Sale Contract — BMC-2402","sale-contract.pdf","2.1 MB"],
          ["Vehicle Inspection Report","inspection-2402.pdf","8.4 MB"],
          ["Loan Agreement — Burgan","loan-burgan.pdf","1.2 MB"],
          ["Insurance Policy — Kuwait Insurance","policy-2025.pdf","0.6 MB"],
          ["Civil ID","civil-id.pdf","1.0 MB"],
        ].map(([n,f,s])=>(
          <div key={n} className="docs-vault-item">
            <Icon name="doc" size={20} color="var(--royal)"/>
            <div>
              <strong>{n}</strong>
              <span>{f} · {s}</span>
            </div>
            <button className="link-btn">{t("Download","تحميل")}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AccountProfile = ({locale, user}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="account-section">
      <h3>{t("Personal information","المعلومات الشخصية")}</h3>
      <div className="wstep-form">
        <div className="wfield"><label>{t("Full name","الاسم")}</label><input defaultValue={user.name}/></div>
        <div className="wfield"><label>{t("Mobile","الهاتف")}</label><input defaultValue={user.phone}/></div>
        <div className="wfield"><label>{t("Email","البريد")}</label><input defaultValue={user.email}/></div>
        <div className="wfield"><label>{t("Language","اللغة")}</label><select><option>English</option><option>العربية</option></select></div>
      </div>
      <Button variant="primary">{t("Save changes","حفظ التغييرات")}</Button>
    </div>
  );
};

Object.assign(window, { FinancePage, ServicesPage, DealersPage, AccountPage });
