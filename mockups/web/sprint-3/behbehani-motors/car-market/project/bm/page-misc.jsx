/* eslint-disable */
// Finance page, Services page, Dealers page, Account page

// ---------- Finance page (standalone, broader than VDP calc) ----------
const FinancePage = ({locale, go, route}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [price, setPrice]   = React.useState(8000);
  const [down, setDown]     = React.useState(20);
  const [tenure, setTenure] = React.useState(60);

  const offers = PARTNER_BANKS.map(b=>{
    const principal = price * (1 - down/100);
    const r = b.apr/100/12;
    const monthly = principal * r / (1 - Math.pow(1+r, -tenure));
    return { ...b, monthly:Math.round(monthly), total:Math.round(monthly*tenure + price*down/100), interest:Math.round(monthly*tenure - principal) };
  });

  return (
    <div className="finance-page">
      <section className="finance-hero">
        <div className="container">
          <Badge variant="white-on-dark" icon="calc">{t("Auto Finance","تمويل السيارات")}</Badge>
          <h1>{t("Get pre-approved by 5 banks in 6 minutes.","موافقة مبدئية من ٥ بنوك في ٦ دقائق.")}</h1>
          <p>{t("Soft credit check. No impact on your record. Compare rates side-by-side.","فحص ائتماني خفيف. بدون أثر على سجلك. قارن المعدلات.")}</p>
        </div>
      </section>

      <div className="container finance-grid">
        <main>
          <section className="finance-calc">
            <h2>{t("Calculator","الحاسبة")}</h2>
            <div className="finance-calc-controls">
              <div className="finance-control">
                <label>{t("Car price (KWD)","سعر السيارة")} <strong>{fmtKWD(price,locale)}</strong></label>
                <input type="range" min="1000" max="50000" step="500" value={price} onChange={e=>setPrice(+e.target.value)}/>
                <div className="rng-bounds"><span>KWD 1K</span><span>KWD 50K</span></div>
              </div>
              <div className="finance-control">
                <label>{t("Down payment","الدفعة المقدمة")} <strong>{down}% — {fmtKWD(Math.round(price*down/100),locale)}</strong></label>
                <input type="range" min="0" max="60" step="5" value={down} onChange={e=>setDown(+e.target.value)}/>
                <div className="rng-bounds"><span>0%</span><span>60%</span></div>
              </div>
              <div className="finance-control">
                <label>{t("Tenure","المدة")} <strong>{tenure} {t("months","شهر")}</strong></label>
                <input type="range" min="12" max="84" step="6" value={tenure} onChange={e=>setTenure(+e.target.value)}/>
                <div className="rng-bounds"><span>1 yr</span><span>7 yrs</span></div>
              </div>
            </div>
          </section>

          <section className="finance-offers">
            <SectionHead eyebrow={t("Live offers","عروض حية")}
              title={t("Side-by-side bank offers","عروض البنوك المقارنة")}
              sub={t("Tap one to apply. Final approval typically within 2 business days.","اضغط أحدها للتقديم. الموافقة النهائية خلال يومي عمل.")}/>
            <div className="bank-cards">
              {offers.map(o=>(
                <article key={o.id} className={`bank-card ${o.recommended?"recommended":""}`}>
                  <div className="bank-card-head">
                    <div className="bank-card-logo">{o.short}</div>
                    {o.recommended && <Badge variant="royal">{t("Best rate","أفضل سعر")}</Badge>}
                  </div>
                  <h4>{o.name}</h4>
                  <div className="bank-card-monthly">{fmtKWD(o.monthly,locale)}<span>/{t("mo","شهر")}</span></div>
                  <div className="bank-card-rows">
                    <div><span>{t("APR","الفائدة")}</span><strong>{o.apr}%</strong></div>
                    <div><span>{t("Total interest","إجمالي الفائدة")}</span><strong>{fmtKWD(o.interest,locale)}</strong></div>
                    <div><span>{t("Admin fee","رسوم إدارية")}</span><strong>KWD {o.fee}</strong></div>
                    <div><span>{t("Total payable","الإجمالي")}</span><strong>{fmtKWD(o.total,locale)}</strong></div>
                  </div>
                  <Button variant={o.recommended?"primary":"secondary"} style={{width:"100%"}}>
                    {t("Apply with ","قدّم مع ")}{o.short}
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="finance-how">
            <SectionHead eyebrow={t("How it works","كيف يعمل")} title={t("From application to delivery","من التقديم للتسليم")}/>
            <ol className="finance-how-steps">
              <li><span>1</span><div><strong>{t("Tell us about you","أخبرنا عنك")}</strong><p>{t("Civil ID, salary, employer. Takes 4 minutes.","البطاقة المدنية والراتب وجهة العمل.")}</p></div></li>
              <li><span>2</span><div><strong>{t("Get pre-approved","موافقة مبدئية")}</strong><p>{t("Soft credit check. 5 banks reply in minutes.","فحص خفيف. ٥ بنوك تردّ بدقائق.")}</p></div></li>
              <li><span>3</span><div><strong>{t("Pick a bank, pick a car","اختر البنك والسيارة")}</strong><p>{t("Choose any car within your approved amount.","اختر أي سيارة ضمن المبلغ المعتمد.")}</p></div></li>
              <li><span>4</span><div><strong>{t("E-sign and drive","وقّع وانطلق")}</strong><p>{t("Final approval typically 1-2 business days. Then delivery.","الموافقة النهائية ١-٢ يوم.")}</p></div></li>
            </ol>
          </section>
        </main>

        <aside className="finance-side">
          <div className="prequalify-box">
            <Icon name="sparkle" size={28} color="var(--royal)"/>
            <h3>{t("Get pre-qualified","تأهل مسبق")}</h3>
            <p>{t("In 6 minutes, no impact on credit.","خلال ٦ دقائق، بدون أثر على السجل.")}</p>
            <ul>
              <li><Icon name="check" size={14} color="#16a34a"/> {t("See real APR offers","عروض حقيقية")}</li>
              <li><Icon name="check" size={14} color="#16a34a"/> {t("Lock rates for 30 days","تثبيت ٣٠ يوم")}</li>
              <li><Icon name="check" size={14} color="#16a34a"/> {t("Reusable across any car","قابل لإعادة الاستخدام")}</li>
            </ul>
            <Button variant="primary" size="lg" style={{width:"100%"}} iconRight="arrow-right">
              {t("Start application","ابدأ التقديم")}
            </Button>
          </div>

          <div className="finance-disclaim-card">
            <Icon name="info" size={14}/>
            <p>{t("All loans are subject to Central Bank of Kuwait disclosure rules. APR shown reflects all fees. Subject to bank approval.","جميع القروض خاضعة لقواعد بنك الكويت المركزي. سعر الفائدة المعلن يشمل جميع الرسوم.")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------- Services page ----------
const ServicesPage = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const services = [
    { id:"wash",     icon:"sparkle", name:t("Wash & detailing","غسيل وتلميع"),       from:8,   vendors:14, time:"45 min" },
    { id:"tint",     icon:"shield",  name:t("Window tinting","تظليل النوافذ"),       from:35,  vendors:9,  time:"2-3 hrs" },
    { id:"renewal",  icon:"doc",     name:t("Registration renewal","تجديد الترخيص"),from:25,  vendors:5,  time:"Same day" },
    { id:"paint",    icon:"sparkle", name:t("Paint protection","حماية الطلاء"),     from:280, vendors:6,  time:"1 day" },
    { id:"tires",    icon:"car",     name:t("Tire replacement","تبديل الإطارات"),  from:120, vendors:11, time:"1 hr" },
    { id:"glass",    icon:"camera",  name:t("Glass & windshield","الزجاج"),         from:30,  vendors:7,  time:"1-2 hrs" },
    { id:"health",   icon:"check-circle", name:t("Car health check","فحص شامل"),    from:15,  vendors:8,  time:"30 min" },
    { id:"maint",    icon:"wrench",  name:t("Routine maintenance","صيانة دورية"),  from:35,  vendors:12, time:"2 hrs" },
  ];
  return (
    <div className="services-page">
      <section className="services-hero">
        <div className="container">
          <Badge variant="white-on-dark" icon="wrench">{t("Car services","خدمات السيارات")}</Badge>
          <h1>{t("Every service your car needs. One place.","كل خدمات سيارتك في مكان واحد.")}</h1>
          <p>{t("Vetted vendors across Kuwait. Book, pay and track — all online.","موردون موثقون. احجز وادفع وتابع — كله أونلاين.")}</p>
        </div>
      </section>

      <div className="container section">
        <div className="services-grid services-grid-lg">
          {services.map(s=>(
            <article key={s.id} className="service-card">
              <div className="service-card-icon"><Icon name={s.icon} size={28}/></div>
              <h3>{s.name}</h3>
              <div className="service-card-meta">
                <span><Icon name="user" size={12}/> {s.vendors} {t("vendors","مزود")}</span>
                <span><Icon name="clock" size={12}/> {s.time}</span>
              </div>
              <div className="service-card-foot">
                <div>
                  <div className="service-card-from">{t("from","من")}</div>
                  <div className="service-card-price">{fmtKWD(s.from,locale)}</div>
                </div>
                <Button variant="primary">{t("Book","احجز")}</Button>
              </div>
            </article>
          ))}
        </div>

        <section className="services-feature">
          <div>
            <Badge variant="royal-soft">{t("Maintenance pickup","صيانة بالاستلام")}</Badge>
            <h2>{t("We pick up your car. Service it. Bring it back.","نستلم سيارتك. نصلحها. نعيدها.")}</h2>
            <p>{t("Real-time status from request to return. Photo evidence. Cost approval before any work begins.","تتبع مباشر من الطلب للإعادة. صور توثيقية. موافقة على التكلفة قبل أي عمل.")}</p>
            <div className="services-feature-steps">
              {["Requested","Confirmed","Picked up","In workshop","Estimate","Approved","In progress","Ready","Delivered back"].map((s,i)=>(
                <div key={s} className={`feature-step ${i<5?"done":""}`}>
                  <span/>
                  <label>{s}</label>
                </div>
              ))}
            </div>
            <Button variant="primary" size="lg" iconRight="arrow-right">{t("Request maintenance pickup","اطلب صيانة بالاستلام")}</Button>
          </div>
          <div className="services-feature-img">
            <Icon name="wrench" size={120} color="var(--royal-pale)"/>
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------- Dealers ----------
const DealersPage = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const dealers = [
    { name:"Behbehani Motors", brand:"Multi", cars:248, rating:4.9, reviews:1840, area:"Kuwait City", verified:true, certified:true },
    { name:"Auto Plaza KW",    brand:"BMW · Audi · Mercedes", cars:64,  rating:4.7, reviews:312,  area:"Jabriya", verified:true },
    { name:"Reza Motors",      brand:"Japanese", cars:48,  rating:4.6, reviews:201,  area:"Salmiya", verified:true },
    { name:"Bavaria Cars",     brand:"BMW · Audi", cars:36,  rating:4.8, reviews:188,  area:"Jabriya", verified:true },
    { name:"Al-Mulla Motors",  brand:"Toyota · Lexus", cars:122, rating:4.8, reviews:912,  area:"Hawalli", verified:true, certified:true },
    { name:"Gulf Auto",        brand:"GMC · Cadillac", cars:54,  rating:4.5, reviews:154,  area:"Farwaniya", verified:true },
  ];
  return (
    <div className="dealers-page">
      <section className="dealers-hero">
        <div className="container">
          <Badge variant="white-on-dark">{t("Dealerships","المعارض")}</Badge>
          <h1>{t("48 verified dealers across Kuwait","٤٨ معرض موثق في الكويت")}</h1>
          <p>{t("Every dealer is vetted by Behbehani Motors. Trade licenses checked. Inspection certificates required.","كل معرض موثق من بهبهاني للسيارات. مع رخص تجارية وشهادات فحص.")}</p>
        </div>
      </section>
      <div className="container section">
        <div className="dealers-grid">
          {dealers.map(d=>(
            <article key={d.name} className="dealer-card">
              <div className="dealer-card-head">
                <div className="dealer-card-logo">{d.name[0]}</div>
                <div>
                  <h3>{d.name}</h3>
                  <div className="dealer-card-brand">{d.brand}</div>
                </div>
              </div>
              <div className="dealer-card-meta">
                <div><strong>{d.cars}</strong> {t("cars","سيارة")}</div>
                <div className="dealer-card-rating"><Icon name="star" size={14} color="#f59e0b"/> {d.rating} <span>({d.reviews})</span></div>
                <div><Icon name="map-pin" size={12}/> {d.area}</div>
              </div>
              <div className="dealer-card-tags">
                {d.certified && <Badge variant="royal" icon="shield">{t("Behbehani Certified","معتمد")}</Badge>}
                {d.verified  && <Badge variant="green-soft" icon="check-circle">{t("Verified","موثق")}</Badge>}
              </div>
              <div className="dealer-card-foot">
                <Button variant="secondary" onClick={()=>go({page:"browse"})}>{t("View inventory","عرض المخزون")}</Button>
                <button className="dealer-call" aria-label="Call"><Icon name="phone" size={16}/></button>
                <button className="dealer-call" aria-label="WhatsApp"><Icon name="whatsapp" size={16}/></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Account page ----------
const AccountPage = ({locale, go, route, user, favs, toggleFav, signOut}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const tab = route.tab || "overview";

  const tabs = [
    { id:"overview",  label:t("Overview","نظرة عامة"),  icon:"user" },
    { id:"orders",    label:t("Orders","الطلبات"),       icon:"car" },
    { id:"favorites", label:t("Favorites","المفضلة"),    icon:"heart" },
    { id:"saved",     label:t("Saved searches","البحوث المحفوظة"), icon:"search" },
    { id:"financing", label:t("Financing","التمويل"),    icon:"calc" },
    { id:"insurance", label:t("Insurance","التأمين"),    icon:"shield" },
    { id:"deliveries",label:t("Deliveries","التوصيل"),   icon:"truck" },
    { id:"returns",   label:t("Returns","الإرجاع"),       icon:"return" },
    { id:"maintenance",label:t("Maintenance","الصيانة"), icon:"wrench" },
    { id:"docs",      label:t("Document vault","المستندات"), icon:"doc" },
    { id:"profile",   label:t("Profile","الملف الشخصي"), icon:"user" },
  ];

  return (
    <div className="account-page">
      <div className="container">
        <header className="account-header">
          <div>
            <div className="account-greet">{t("Welcome back","أهلاً بعودتك")},</div>
            <h1>{user?.name || "Ahmad Al-Sabah"}</h1>
          </div>
          <div className="account-stats">
            <div><strong>{favs.size}</strong><span>{t("Favorites","المفضلة")}</span></div>
            <div><strong>2</strong><span>{t("Active orders","طلبات نشطة")}</span></div>
            <div><strong>1</strong><span>{t("In delivery","قيد التوصيل")}</span></div>
          </div>
        </header>

        <div className="account-grid">
          <aside className="account-nav">
            {tabs.map(tb=>(
              <button key={tb.id} className={`account-nav-item ${tab===tb.id?"on":""}`}
                      onClick={()=>go({page:"account", tab:tb.id})}>
                <Icon name={tb.icon} size={16}/>
                <span>{tb.label}</span>
              </button>
            ))}
            <hr/>
            <button className="account-nav-item" onClick={signOut}>
              <Icon name="x" size={16}/>
              <span>{t("Sign out","تسجيل خروج")}</span>
            </button>
          </aside>

          <main className="account-main">
            {tab==="overview" && <AccountOverview locale={locale} go={go}/>}
            {tab==="orders" && <AccountOrders locale={locale} go={go}/>}
            {tab==="favorites" && <AccountFavorites locale={locale} go={go} favs={favs} toggleFav={toggleFav}/>}
            {tab==="saved" && <AccountSaved locale={locale} go={go}/>}
            {tab==="financing" && <AccountFinancing locale={locale}/>}
            {tab==="insurance" && <AccountInsurance locale={locale}/>}
            {tab==="deliveries" && <AccountDeliveries locale={locale}/>}
            {tab==="returns" && <AccountReturns locale={locale}/>}
            {tab==="maintenance" && <AccountMaintenance locale={locale}/>}
            {tab==="docs" && <AccountDocs locale={locale}/>}
            {tab==="profile" && <AccountProfile locale={locale} user={user}/>}
          </main>
        </div>
      </div>
    </div>
  );
};

const AccountOverview = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <div className="acct-active-order">
        <div className="acct-active-order-head">
          <Badge variant="royal">{t("Active order","طلب نشط")}</Badge>
          <h3>2022 Mercedes C 300 AMG-Line</h3>
          <p>{t("Order BMC-2403 · Reserved 18 hours ago","الطلب BMC-2403 · حجز قبل ١٨ ساعة")}</p>
        </div>
        <div className="acct-active-order-progress">
          {WIZ_STEPS.map((s,i)=>(
            <div key={s.id} className={`acct-active-step ${i<3?"done":""} ${i===3?"on":""}`}>
              <span>{i<3?<Icon name="check" size={10}/>:i+1}</span>
              <label>{t(s.label, s.labelAr)}</label>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={()=>go({page:"checkout", id:"BMC-2403", step:3})} iconRight="arrow-right">
          {t("Continue (step 4 of 7)","تابع (الخطوة ٤ من ٧)")}
        </Button>
      </div>
      <div className="acct-quick-grid">
        <button className="acct-quick" onClick={()=>go({page:"browse"})}>
          <Icon name="car" size={22}/>
          <strong>{t("Browse 1,840+ cars","تصفح ١٨٤٠+ سيارة")}</strong>
        </button>
        <button className="acct-quick" onClick={()=>go({page:"sell"})}>
          <Icon name="dollar" size={22}/>
          <strong>{t("Sell your car","بيع سيارتك")}</strong>
        </button>
        <button className="acct-quick">
          <Icon name="wrench" size={22}/>
          <strong>{t("Book a service","احجز خدمة")}</strong>
        </button>
        <button className="acct-quick">
          <Icon name="phone" size={22}/>
          <strong>{t("Contact support","تواصل معنا")}</strong>
        </button>
      </div>
    </>
  );
};

const AccountOrders = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const orders = [
    { id:"BMC-2403", car:CARS.find(c=>c.id==="BMC-2403"), status:"In checkout", stepIdx:3, total:11500, date:"May 17, 2026" },
    { id:"BMC-2105", car:CARS.find(c=>c.id==="BMC-2402"), status:"Delivered",   stepIdx:6, total:9800,  date:"Mar 02, 2026" },
  ];
  return (
    <>
      <h2>{t("Your orders","طلباتك")}</h2>
      <div className="orders-list">
        {orders.map(o=>(
          <article key={o.id} className="order-card">
            <CarImage car={o.car}/>
            <div className="order-card-body">
              <div className="order-card-status">
                <Badge variant={o.stepIdx===6?"green":"royal"}>{o.status}</Badge>
                <span>#{o.id} · {o.date}</span>
              </div>
              <h3>{o.car.year} {brandOf(o.car.brand).name} {o.car.model}</h3>
              <div className="order-card-progress">
                {WIZ_STEPS.map((s,i)=>(
                  <div key={s.id} className={`mini-step ${i<=o.stepIdx?"done":""}`} title={t(s.label,s.labelAr)}/>
                ))}
              </div>
              <div className="order-card-foot">
                <strong>{fmtKWD(o.total, locale)}</strong>
                <Button variant={o.stepIdx===6?"secondary":"primary"} onClick={()=>go(o.stepIdx===6?{page:"vdp",id:o.car.id}:{page:"checkout", id:o.car.id, step:o.stepIdx})}>
                  {o.stepIdx===6 ? t("View receipt","عرض الفاتورة") : t("Continue checkout","تابع الإتمام")}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

const AccountFavorites = ({locale, go, favs, toggleFav}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const list = CARS.filter(c=>favs.has(c.id));
  return (
    <>
      <h2>{t("Your favorites","المفضلة")} ({list.length})</h2>
      {list.length===0 ? (
        <div className="browse-empty">
          <div className="browse-empty-icon"><Icon name="heart" size={36} color="var(--muted)"/></div>
          <h3>{t("No favorites yet","لا توجد مفضلة بعد")}</h3>
          <p>{t("Tap the heart icon on any car to save it here.","اضغط القلب لحفظ السيارة هنا.")}</p>
          <Button variant="primary" onClick={()=>go({page:"browse"})}>{t("Browse cars","تصفح السيارات")}</Button>
        </div>
      ) : (
        <div className="browse-grid">
          {list.map(c=>(
            <CarCard key={c.id} car={c} locale={locale}
                     fav={true} onToggleFav={toggleFav}
                     onOpen={(id)=>go({page:"vdp", id})}/>
          ))}
        </div>
      )}
    </>
  );
};

const AccountSaved = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const saved = [
    { name:t("Toyota SUV under KWD 10K","تويوتا SUV أقل من ١٠ آلاف"), criteria:"Toyota · SUV · ≤ 10,000 KWD · ≤ 50,000 km", matches:12, newToday:2 },
    { name:t("Electric cars","سيارات كهربائية"), criteria:"All brands · Fuel: Electric · ≤ 15,000 KWD", matches:5, newToday:1 },
    { name:t("Mercedes C-Class 2022+","مرسيدس C 2022+"), criteria:"Mercedes · C-Class · 2022 onwards", matches:7, newToday:0 },
  ];
  return (
    <>
      <h2>{t("Saved searches","البحوث المحفوظة")}</h2>
      <p className="account-lede">{t("We'll alert you by email and push when new cars match.","سننبهك بالبريد والإشعارات عند توفر سيارات جديدة.")}</p>
      <div className="saved-list">
        {saved.map(s=>(
          <article key={s.name} className="saved-card">
            <div>
              <h3>{s.name}</h3>
              <p>{s.criteria}</p>
            </div>
            <div className="saved-card-stats">
              <div><strong>{s.matches}</strong><span>{t("matches","نتيجة")}</span></div>
              {s.newToday>0 && <Badge variant="royal">{s.newToday} {t("new","جديد")}</Badge>}
            </div>
            <Button variant="secondary" onClick={()=>go({page:"browse"})}>{t("View","عرض")}</Button>
          </article>
        ))}
      </div>
    </>
  );
};

const AccountFinancing = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <h2>{t("Your financing","تمويلك")}</h2>
      <article className="finance-status-card">
        <div className="finance-status-head">
          <Badge variant="green">{t("Approved","موافق عليه")}</Badge>
          <h3>{t("KWD 12,000 pre-approved","١٢،٠٠٠ موافقة مسبقة")}</h3>
          <p>{t("Al Ahli Bank of Kuwait · 4.25% APR · 60 months · Valid until June 20, 2026","البنك الأهلي · ٤.٢٥٪ · ٦٠ شهر")}</p>
        </div>
        <div className="finance-status-bd">
          <div><span>{t("Max car price","أقصى سعر")}</span><strong>{fmtKWD(15000,locale)}</strong></div>
          <div><span>{t("Down payment","الدفعة المقدمة")}</span><strong>20%</strong></div>
          <div><span>{t("Monthly","الشهري")}</span><strong>{fmtKWD(248,locale)}</strong></div>
        </div>
        <Button variant="primary">{t("Apply to a car","استخدم في سيارة")}</Button>
      </article>

      <h3 style={{marginTop:32}}>{t("Active loans","القروض النشطة")}</h3>
      <div className="loan-schedule">
        <div className="loan-schedule-head">
          <div>
            <h4>2021 Lexus RX 350 — BMC-2105</h4>
            <p>NBK · 4.50% APR · 60 months</p>
          </div>
          <div>
            <strong>{fmtKWD(204,locale)}</strong>/{t("mo","شهر")}
          </div>
        </div>
        <table className="schedule-table">
          <thead>
            <tr><th>{t("#","#")}</th><th>{t("Date","التاريخ")}</th><th>{t("Amount","المبلغ")}</th><th>{t("Principal","الأصل")}</th><th>{t("Interest","الفائدة")}</th><th>{t("Status","الحالة")}</th></tr>
          </thead>
          <tbody>
            {Array.from({length:6}).map((_,i)=>(
              <tr key={i}>
                <td>{i+1}</td>
                <td>{`${i+3} ${["Mar","Apr","May","Jun","Jul","Aug"][i]} 2026`}</td>
                <td>{fmtKWD(204,locale)}</td>
                <td>{fmtKWD(167,locale)}</td>
                <td>{fmtKWD(37,locale)}</td>
                <td>{i<3 ? <Badge variant="green-soft">{t("Paid","مدفوع")}</Badge> : i===3 ? <Badge variant="royal-soft">{t("Due","مستحق")}</Badge> : <Badge variant="slate-soft">{t("Scheduled","مجدول")}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const AccountInsurance = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <h2>{t("Your insurance","تأمينك")}</h2>
      <article className="insurance-card">
        <div className="insurance-card-head">
          <div className="insurance-card-logo"><Icon name="shield" size={28}/></div>
          <div>
            <h3>{t("Comprehensive — 2022 Mercedes C 300","شامل — مرسيدس")}</h3>
            <p>{t("Kuwait Insurance Co. · Policy KIC-2025-08412","شركة الكويت للتأمين")}</p>
          </div>
          <Badge variant="green">{t("Active","ساري")}</Badge>
        </div>
        <div className="insurance-card-bd">
          <div><span>{t("Premium","القسط")}</span><strong>{fmtKWD(420,locale)}/yr</strong></div>
          <div><span>{t("Coverage","التغطية")}</span><strong>{t("Comprehensive","شامل")}</strong></div>
          <div><span>{t("Effective","ساري من")}</span><strong>Mar 2, 2026</strong></div>
          <div><span>{t("Expires","ينتهي")}</span><strong>Mar 1, 2027</strong></div>
        </div>
        <div className="insurance-card-actions">
          <Button variant="secondary" icon="doc">{t("Download policy","تحميل البوليصة")}</Button>
          <Button variant="ghost">{t("File a claim","تقديم مطالبة")}</Button>
        </div>
      </article>
    </>
  );
};

const AccountDeliveries = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <h2>{t("Your deliveries","التوصيلات")}</h2>
      <article className="delivery-tracker">
        <div className="delivery-tracker-head">
          <Badge variant="royal" icon="truck">{t("Out for delivery","في الطريق")}</Badge>
          <h3>2022 Mercedes C 300 AMG-Line</h3>
          <p>{t("Driver: Yousef · ETA 14 minutes","السائق: يوسف · الوصول ١٤ دقيقة")}</p>
        </div>
        <div className="delivery-map">
          <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{width:"100%", height:"100%"}}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cdd5e0" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="400" height="200" fill="#e8eef7"/>
            <rect width="400" height="200" fill="url(#grid)"/>
            <path d="M 50 30 Q 100 80, 150 70 T 280 130" stroke="var(--royal)" strokeWidth="3" fill="none" strokeDasharray="6 4"/>
            <circle cx="50"  cy="30"  r="8" fill="var(--royal)"/>
            <circle cx="280" cy="130" r="10" fill="#dc2626"/>
            <circle cx="150" cy="70"  r="14" fill="var(--royal)" stroke="#fff" strokeWidth="3"/>
          </svg>
        </div>
        <div className="delivery-progress">
          {[t("Scheduled","مجدول"), t("Driver assigned","تعيين سائق"), t("Out for delivery","في الطريق"), t("Delivered","تم التسليم")].map((s,i)=>(
            <div key={s} className={`d-step ${i<2?"done":""} ${i===2?"on":""}`}>
              <span/>
              <label>{s}</label>
            </div>
          ))}
        </div>
        <div className="delivery-actions">
          <Button variant="secondary" icon="phone">{t("Call driver","اتصل بالسائق")}</Button>
          <Button variant="ghost" icon="whatsapp">{t("WhatsApp","واتساب")}</Button>
        </div>
      </article>
    </>
  );
};

const AccountReturns = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <h2>{t("Returns","الإرجاع")}</h2>
      <div className="return-policy">
        <Icon name="return" size={24} color="var(--royal)"/>
        <div>
          <h3>{t("3-day money-back guarantee","ضمان إرجاع ٣ أيام")}</h3>
          <p>{t("Drive up to 300 km. If you change your mind, we collect the car and refund you in full. No questions asked.","قد حتى ٣٠٠ كم. لو غيّرت رأيك، نأتي ونعيد المبلغ كاملاً.")}</p>
        </div>
      </div>
      <h3>{t("Eligible orders","الطلبات المؤهلة")}</h3>
      <article className="return-eligible">
        <div className="return-eligible-head">
          <CarImage car={CARS[1]}/>
          <div>
            <h4>2021 Lexus RX 350 F-Sport</h4>
            <p>{t("Delivered May 14 · 2 days left in return window","سُلِّمت ١٤ مايو · باقي يومين")}</p>
            <div className="return-meter">
              <div className="return-meter-bar"><div style={{width:"33%"}}/></div>
              <span>1 / 3 {t("days used","أيام مستخدمة")} · 142 / 300 km</span>
            </div>
          </div>
          <Button variant="secondary">{t("Initiate return","ابدأ الإرجاع")}</Button>
        </div>
      </article>
    </>
  );
};

const AccountMaintenance = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const items = [
    { title:t("Oil change & filter","تغيير زيت وفلتر"), date:"Apr 12, 2026", cost:35, photos:3 },
    { title:t("Brake pad replacement","تغيير فحمات الفرامل"), date:"Jan 18, 2026", cost:75, photos:5 },
    { title:t("Full health check","فحص شامل"), date:"Dec 03, 2025", cost:15, photos:2 },
  ];
  return (
    <>
      <div className="acct-mnt-head">
        <h2>{t("Maintenance","الصيانة")}</h2>
        <Button variant="primary" icon="wrench">{t("Request pickup","اطلب الاستلام")}</Button>
      </div>
      <h3>{t("History","السجل")}</h3>
      <div className="mnt-list">
        {items.map(m=>(
          <article key={m.title} className="mnt-card">
            <div className="mnt-card-icon"><Icon name="wrench" size={20}/></div>
            <div className="mnt-card-body">
              <h4>{m.title}</h4>
              <p>{m.date} · {fmtKWD(m.cost,locale)} · {m.photos} {t("photos","صور")}</p>
            </div>
            <Button variant="ghost"><Icon name="doc" size={14}/></Button>
          </article>
        ))}
      </div>
    </>
  );
};

const AccountDocs = ({locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const docs = [
    { name:t("Civil ID","البطاقة المدنية"), date:"Mar 02, 2026", icon:"user" },
    { name:t("Sale contract — BMC-2403","عقد البيع"), date:"May 17, 2026", icon:"doc" },
    { name:t("Insurance policy KIC-2025-08412","بوليصة التأمين"), date:"Mar 02, 2026", icon:"shield" },
    { name:t("Loan agreement — NBK","اتفاقية القرض"), date:"Mar 03, 2026", icon:"calc" },
    { name:t("Inspection report — Mercedes C 300","تقرير الفحص"), date:"Oct 14, 2025", icon:"check-circle" },
  ];
  return (
    <>
      <h2>{t("Document vault","خزينة المستندات")}</h2>
      <p className="account-lede">{t("Encrypted at rest. Access logged. CITRA-compliant.","مشفرة. الوصول مسجل. متوافقة مع CITRA.")}</p>
      <div className="docs-list">
        {docs.map(d=>(
          <article key={d.name} className="docs-card">
            <div className="docs-card-icon"><Icon name={d.icon} size={20}/></div>
            <div>
              <h4>{d.name}</h4>
              <p>{t("Uploaded","رُفع في")} {d.date}</p>
            </div>
            <Button variant="ghost" icon="doc">{t("View","عرض")}</Button>
          </article>
        ))}
      </div>
    </>
  );
};

const AccountProfile = ({locale, user}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <>
      <h2>{t("Profile","الملف الشخصي")}</h2>
      <div className="form-grid-2">
        <label className="field"><span>{t("Full name","الاسم الكامل")}</span><input defaultValue={user?.name || "Ahmad Al-Sabah"}/></label>
        <label className="field"><span>{t("Email","البريد")}</span><input type="email" defaultValue={user?.email || "ahmad@example.com"}/></label>
        <label className="field"><span>{t("Mobile","الهاتف")}</span><input defaultValue={user?.phone || "+965 9999 1234"}/></label>
        <label className="field"><span>{t("Language","اللغة")}</span><select defaultValue="en"><option value="en">English</option><option value="ar">العربية</option></select></label>
        <label className="field full"><span>{t("Default delivery address","عنوان التوصيل الافتراضي")}</span><textarea rows={2} defaultValue="Hawalli, Block 3, Street 12, House 45"/></label>
      </div>
      <h3 style={{marginTop:24}}>{t("Notification preferences","إعدادات الإشعارات")}</h3>
      <div className="notif-grid">
        {[
          ["Order updates","تحديثات الطلب"],
          ["Price drops on favorites","تخفيضات المفضلة"],
          ["Saved search alerts","تنبيهات البحث"],
          ["Marketing emails","رسائل تسويقية"],
        ].map(([en,ar])=>(
          <div key={en} className="notif-row">
            <span>{locale==="ar"?ar:en}</span>
            <div className="notif-channels">
              <label><input type="checkbox" defaultChecked/> Push</label>
              <label><input type="checkbox" defaultChecked/> Email</label>
              <label><input type="checkbox"/> SMS</label>
              <label><input type="checkbox" defaultChecked/> WhatsApp</label>
            </div>
          </div>
        ))}
      </div>
      <Button variant="primary" style={{marginTop:24}}>{t("Save changes","حفظ التغييرات")}</Button>
    </>
  );
};

Object.assign(window, { FinancePage, ServicesPage, DealersPage, AccountPage });
