/* eslint-disable */
// Vehicle Detail Page — gallery, specs, inspection report, finance calc, sticky CTAs

const VDPGallery = ({car, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [idx, setIdx] = React.useState(0);
  // Build a gallery from primary + variants (in real life, multiple URLs)
  const photos = [
    {kind:"exterior", url:car.image},
    {kind:"exterior-2", url:car.image},
    {kind:"interior",   url:car.image},
    {kind:"engine",     url:car.image},
    {kind:"wheels",     url:car.image},
  ];
  return (
    <div className="vdp-gallery">
      <div className="vdp-gallery-main">
        <CarImage car={car}/>
        <div className="vdp-gallery-overlay">
          <Badge variant="white" icon="camera">25 {t("photos","صور")}</Badge>
          <Badge variant="white" icon="play">{t("Walkaround video","فيديو")}</Badge>
          <Badge variant="white" icon="rotate">360°</Badge>
        </div>
        <div className="vdp-gallery-nav">
          <button onClick={()=>setIdx(Math.max(0, idx-1))} aria-label="Prev"><Icon name="chevron-left" size={18}/></button>
          <button onClick={()=>setIdx(Math.min(photos.length-1, idx+1))} aria-label="Next"><Icon name="chevron-right" size={18}/></button>
        </div>
      </div>
      <div className="vdp-gallery-thumbs">
        {photos.map((p,i)=>(
          <button key={i} className={`vdp-thumb ${i===idx?"on":""}`} onClick={()=>setIdx(i)}>
            <CarImage car={car}/>
          </button>
        ))}
      </div>
    </div>
  );
};

const InspectionReport = ({car, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [open, setOpen] = React.useState(false);
  if (!car.inspected) return null;
  const total = INSPECTION_POINTS.reduce((s,g)=>s+g.total,0);
  const passed = INSPECTION_POINTS.reduce((s,g)=>s+g.passed,0);
  return (
    <section className="vdp-inspect">
      <header>
        <div className="vdp-inspect-badge"><Icon name="shield" size={28}/></div>
        <div>
          <h2>{t("71-Point Inspection Report","تقرير فحص الـ٧١ نقطة")}</h2>
          <p>{t("Performed by Behbehani Motors certified technicians, completed",
                "تم بواسطة فنيين معتمدين، أُكمل في")} {t("Oct 14, 2025","١٤ أكتوبر ٢٠٢٥")}</p>
        </div>
        <div className="vdp-inspect-score">
          <div className="vdp-inspect-pct">{Math.round(passed/total*100)}%</div>
          <div className="vdp-inspect-pf">{passed} / {total} {t("points passed","نقطة ناجحة")}</div>
        </div>
      </header>

      <div className="vdp-inspect-groups">
        {INSPECTION_POINTS.map(g=>{
          const pct = Math.round(g.passed/g.total*100);
          return (
            <div key={g.group} className="vdp-inspect-group">
              <div className="vdp-inspect-group-head">
                <h4>{g.group}</h4>
                <span>{g.passed}/{g.total}</span>
              </div>
              <div className="vdp-inspect-bar">
                <div style={{width:`${pct}%`, background: pct===100?"#16a34a":"#f59e0b"}}/>
              </div>
              <ul className="vdp-inspect-items">
                {g.items.slice(0,4).map((item,i)=>(
                  <li key={i}>
                    <Icon name="check" size={14} color={pct===100?"#16a34a":"#f59e0b"}/>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button className="vdp-inspect-toggle" onClick={()=>setOpen(o=>!o)}>
        {open ? t("Hide full report","إخفاء التقرير الكامل") : t("View full 71-point report","عرض التقرير الكامل")}
        <Icon name={open?"chevron-down":"chevron-right"} size={16}/>
      </button>
      {open && (
        <div className="vdp-inspect-full">
          {INSPECTION_POINTS.map(g=>(
            <div key={g.group} className="vdp-inspect-full-group">
              <h5>{g.group}</h5>
              <ul>{g.items.map((item,i)=>(
                <li key={i}><Icon name="check-circle" size={14} color="#16a34a"/> {item}</li>
              ))}</ul>
            </div>
          ))}
          <button className="link-arrow"><Icon name="doc" size={14}/> {t("Download PDF","تحميل PDF")}</button>
        </div>
      )}
    </section>
  );
};

const FinanceCalc = ({car, locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [down, setDown] = React.useState(20); // %
  const [tenure, setTenure] = React.useState(60);
  const [bankIdx, setBankIdx] = React.useState(0);
  const bank = PARTNER_BANKS[bankIdx];
  const principal = car.price * (1 - down/100);
  const r = bank.apr/100/12;
  const monthly = principal * r / (1 - Math.pow(1+r, -tenure));
  const total = monthly * tenure;
  const interest = total - principal;

  return (
    <section className="vdp-finance">
      <header>
        <Icon name="calc" size={22} color="var(--royal)"/>
        <div>
          <h2>{t("Calculate your monthly payment","احسب القسط الشهري")}</h2>
          <p>{t("Real bank rates. Pre-qualify with no impact on credit.","معدلات بنوك حقيقية. تأهل مسبق بدون أثر على السجل.")}</p>
        </div>
      </header>

      <div className="vdp-finance-body">
        <div className="vdp-finance-controls">
          <div className="vdp-finance-row">
            <label>{t("Down payment","الدفعة المقدمة")} <strong>{down}%</strong></label>
            <input type="range" min="0" max="60" step="5" value={down} onChange={e=>setDown(+e.target.value)}/>
            <div className="vdp-finance-hint">{fmtKWD(car.price * down/100, locale)}</div>
          </div>
          <div className="vdp-finance-row">
            <label>{t("Tenure","المدة")} <strong>{tenure} {t("months","شهر")}</strong></label>
            <input type="range" min="12" max="84" step="6" value={tenure} onChange={e=>setTenure(+e.target.value)}/>
            <div className="vdp-finance-hint">{Math.round(tenure/12)} {t("years","سنوات")}</div>
          </div>
          <div className="vdp-finance-row">
            <label>{t("Lender","البنك")}</label>
            <div className="bank-picker">
              {PARTNER_BANKS.map((b,i)=>(
                <button key={b.id} className={`bank-chip ${i===bankIdx?"on":""}`} onClick={()=>setBankIdx(i)}>
                  {b.short} <span>{b.apr}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="vdp-finance-result">
          <div className="vdp-finance-mono">{fmtKWD(Math.round(monthly), locale)}<span>/{t("month","شهر")}</span></div>
          <div className="vdp-finance-bd">
            <div><span>{t("Principal","الأصل")}</span><strong>{fmtKWD(Math.round(principal),locale)}</strong></div>
            <div><span>{t("APR","الفائدة")}</span><strong>{bank.apr}%</strong></div>
            <div><span>{t("Interest","الفائدة الإجمالية")}</span><strong>{fmtKWD(Math.round(interest),locale)}</strong></div>
            <div><span>{t("Total payable","الإجمالي")}</span><strong>{fmtKWD(Math.round(total + car.price * down/100),locale)}</strong></div>
          </div>
          <Button variant="primary" size="lg" style={{width:"100%"}}
                  onClick={()=>go({page:"finance", carId:car.id})} iconRight="arrow-right">
            {t("Pre-qualify · no impact","تأهل مسبق بدون أثر")}
          </Button>
          <div className="vdp-finance-disclaim">
            <Icon name="info" size={12}/> {t("Indicative. Final terms subject to bank approval. CBK disclosures apply.","تقديري. الشروط النهائية بعد موافقة البنك.")}
          </div>
        </div>
      </div>
    </section>
  );
};

const VDPPage = ({locale, go, route, favs, toggleFav, user, onSignIn, toast}) => {
  const car = CARS.find(c=>c.id===route.id) || CARS[0];
  const t = (en, ar) => locale==="ar" ? ar : en;
  const b = brandOf(car.brand);
  const fav = favs.has(car.id);
  const similar = CARS.filter(c=>c.brand===car.brand && c.id!==car.id).slice(0,3);
  if (similar.length<3) similar.push(...CARS.filter(c=>c.body===car.body && c.id!==car.id).slice(0, 3-similar.length));

  const reserve = () => {
    if (!user) { onSignIn(); return; }
    go({page:"reserve", id:car.id});
  };

  return (
    <div className="vdp">
      <div className="container vdp-top">
        <div className="breadcrumb">
          <button onClick={()=>go({page:"home"})}>{t("Home","الرئيسية")}</button>
          <Icon name="chevron-right" size={12}/>
          <button onClick={()=>go({page:"browse"})}>{t("Used cars","سيارات مستعملة")}</button>
          <Icon name="chevron-right" size={12}/>
          <button onClick={()=>go({page:"browse", brand:car.brand})}>{t(b.name,b.nameAr)}</button>
          <Icon name="chevron-right" size={12}/>
          <span>{car.model}</span>
        </div>

        <div className="vdp-title-row">
          <div>
            <div className="vdp-brand">{t(b.name,b.nameAr)} · {car.year}</div>
            <h1>{car.model}</h1>
            <div className="vdp-quick">
              <span>{fmtKM(car.mileage,locale)}</span>
              <span className="dot">·</span>
              <span>{car.transmission}</span>
              <span className="dot">·</span>
              <span>{car.fuel}</span>
              <span className="dot">·</span>
              <span>{car.specs} {t("specs","مواصفات")}</span>
              <span className="dot">·</span>
              <span><Icon name="map-pin" size={12}/> {car.location}</span>
            </div>
            <div className="vdp-tags">
              {car.inspected && <Badge variant="royal" icon="shield">{t("71-pt Inspected","فحص ٧١ نقطة")}</Badge>}
              {car.warranty  && <Badge variant="green" icon="check-circle">{t("Warranty included","ضمان")}</Badge>}
              {car.return    && <Badge variant="amber" icon="return">{t("3-day return","إرجاع ٣ أيام")}</Badge>}
              {car.delivery  && <Badge variant="slate" icon="truck">{t("Home delivery","توصيل")}</Badge>}
            </div>
          </div>
          <div className="vdp-title-actions">
            <button className="vdp-icon-btn" onClick={()=>toggleFav(car.id)} aria-label="Favorite">
              <Icon name={fav?"heart-fill":"heart"} size={20} color={fav?"#dc2626":"var(--ink)"}/>
              <span>{fav?t("Saved","محفوظة"):t("Save","حفظ")}</span>
            </button>
            <button className="vdp-icon-btn" onClick={()=>toast(t("Link copied","تم نسخ الرابط"),"success")} aria-label="Share">
              <Icon name="share" size={18}/>
              <span>{t("Share","مشاركة")}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container vdp-grid">
        <main className="vdp-main">
          <VDPGallery car={car} locale={locale}/>

          <section className="vdp-specs">
            <h2>{t("Specifications","المواصفات")}</h2>
            <div className="vdp-specs-grid">
              <Spec icon="calendar" label={t("Year","السنة")}     value={car.year}/>
              <Spec icon="gauge"    label={t("Mileage","الممشى")} value={fmtKM(car.mileage,locale)}/>
              <Spec icon="fuel"     label={t("Fuel","الوقود")}    value={car.fuel}/>
              <Spec icon="car"      label={t("Transmission","ناقل الحركة")} value={car.transmission}/>
              <Spec icon="info"     label={t("Cylinders","الأسطوانات")}     value={car.cylinders || "EV"}/>
              <Spec icon="info"     label={t("Drive","الجر")}     value={car.drive}/>
              <Spec icon="info"     label={t("Seats","المقاعد")}   value={car.seats}/>
              <Spec icon="info"     label={t("Body","الشكل")}     value={bodyOf(car.body).name}/>
              <Spec icon="info"     label={t("Exterior","الخارجي")} value={car.exterior}/>
              <Spec icon="info"     label={t("Interior","الداخلي")} value={car.interior}/>
              <Spec icon="info"     label={t("Specs","المواصفات")}  value={car.specs}/>
              <Spec icon="info"     label={t("VIN","رقم الشاسيه")} value={`••••••${car.id.slice(-6)}`}/>
            </div>
          </section>

          <section className="vdp-features">
            <h2>{t("Features & equipment","المواصفات والتجهيزات")}</h2>
            <div className="vdp-features-grid">
              {[
                {grp:t("Safety","الأمان"),       items:["6 airbags","ABS / EBD","Lane keep assist","Blind-spot monitor","Adaptive cruise","360° camera"]},
                {grp:t("Comfort","الراحة"),      items:["Leather seats","Heated seats","Dual-zone climate","Sunroof","Power tailgate","Keyless entry"]},
                {grp:t("Technology","التقنية"),  items:["12.3″ display","Wireless CarPlay","Android Auto","Bose sound","Wireless charging","Heads-up display"]},
                {grp:t("Performance","الأداء"),   items:["Sport mode","Paddle shifters","Adaptive suspension","Launch control","Brembo brakes","20\" alloy wheels"]},
              ].map(c=>(
                <div key={c.grp} className="vdp-feat-col">
                  <h4>{c.grp}</h4>
                  <ul>{c.items.map(i=><li key={i}><Icon name="check" size={14} color="var(--royal)"/> {i}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>

          <section className="vdp-history">
            <h2>{t("Vehicle history","تاريخ السيارة")}</h2>
            <div className="vdp-history-grid">
              <div className="vdp-history-card">
                <div className="vdp-history-num">{car.owners}</div>
                <div>
                  <div className="vdp-history-label">{t("Previous owners","المالكون السابقون")}</div>
                  <div className="vdp-history-hint">{t("Single owner since new","مالك واحد منذ الجديد")}</div>
                </div>
              </div>
              <div className="vdp-history-card">
                <div className="vdp-history-num">{car.accidents}</div>
                <div>
                  <div className="vdp-history-label">{t("Reported accidents","حوادث مسجلة")}</div>
                  <div className="vdp-history-hint">{car.accidents===0 ? t("Clean record","سجل نظيف") : t("Minor only","طفيفة فقط")}</div>
                </div>
              </div>
              <div className="vdp-history-card">
                <div className="vdp-history-num">12</div>
                <div>
                  <div className="vdp-history-label">{t("Service records","سجلات الصيانة")}</div>
                  <div className="vdp-history-hint">{t("Full service history","تاريخ صيانة كامل")}</div>
                </div>
              </div>
              <div className="vdp-history-card">
                <div className="vdp-history-num"><Icon name="check-circle" size={28} color="#16a34a"/></div>
                <div>
                  <div className="vdp-history-label">{t("Title status","حالة الملكية")}</div>
                  <div className="vdp-history-hint">{t("Clean — no liens","نظيف — بدون رهن")}</div>
                </div>
              </div>
            </div>
          </section>

          <InspectionReport car={car} locale={locale}/>
          <FinanceCalc car={car} locale={locale} go={go}/>

          <section className="vdp-delivery">
            <header>
              <Icon name="truck" size={22} color="var(--royal)"/>
              <h2>{t("Delivery & returns","التوصيل والإرجاع")}</h2>
            </header>
            <div className="vdp-delivery-grid">
              <div>
                <h4>{t("Home delivery","توصيل منزلي")}</h4>
                <p>{t("Free Kuwait-wide. Estimated delivery in ","مجاناً في كل الكويت. التوصيل خلال ")}<strong>2-3 {t("days","أيام")}</strong></p>
                <input className="zip-input" placeholder={t("Your governorate / area","المحافظة / المنطقة")} defaultValue="Hawalli"/>
              </div>
              <div>
                <h4>{t("3-day money-back return","إرجاع ٣ أيام")}</h4>
                <p>{t("Drive up to 300 km. If you change your mind, we collect the car and refund you in full.","قد حتى ٣٠٠ كم. إذا غيّرت رأيك، نأتي ونعيد المبلغ كاملاً.")}</p>
              </div>
              <div>
                <h4>{t("Aftercare","ما بعد البيع")}</h4>
                <p>{t("90-day mechanical warranty included. Maintenance pickup from our dashboard.","ضمان ميكانيكي ٩٠ يوماً. صيانة بالاستلام من حسابك.")}</p>
              </div>
            </div>
          </section>

          <section className="vdp-similar">
            <SectionHead eyebrow={t("Similar cars","سيارات مماثلة")} title={t("You might also like","قد تعجبك أيضاً")}/>
            <div className="rail">
              {similar.map(c=>(
                <div key={c.id} className="rail-item">
                  <CarCard car={c} locale={locale} fav={favs.has(c.id)} onToggleFav={toggleFav}
                           onOpen={(id)=>go({page:"vdp", id})}/>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="vdp-side">
          <div className="vdp-pricing">
            <div className="vdp-pricing-band">
              <Icon name="check-circle" size={14} color="#16a34a"/>
              <span>{t("Fair price","سعر عادل")} · {t("KWD 800 below market median","أقل بـ ٨٠٠ د.ك من السوق")}</span>
            </div>
            <div className="vdp-price">{fmtKWD(car.price, locale)}</div>
            <div className="vdp-price-mo">
              {t("or ","أو ")}<strong>{fmtKWD(car.monthly, locale)}/{t("mo","شهر")}</strong> {t("from 4.25% APR","من ٤.٢٥٪")}
            </div>

            {car.sellerType==="Platform" ? (
              <>
                <Button variant="primary" size="lg" onClick={reserve} style={{width:"100%"}}>
                  <Icon name="shield" size={16}/> {t("Reserve for KWD 100","احجز بـ ١٠٠ د.ك")}
                </Button>
                <div className="vdp-reserve-hint">
                  <Icon name="clock" size={12}/>
                  <span>{t("48-hour hold · fully refundable","حجز ٤٨ ساعة · قابل للاسترداد")}</span>
                </div>
                <Button variant="secondary" size="lg" style={{width:"100%", marginTop:8}}>
                  {t("Book test drive","حجز تجربة قيادة")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="lg" style={{width:"100%"}}>
                  <Icon name="phone" size={16}/> {t("Call seller","اتصل بالبائع")}
                </Button>
                <Button variant="secondary" size="lg" style={{width:"100%", marginTop:8}}>
                  <Icon name="whatsapp" size={16}/> {t("Chat on WhatsApp","واتساب")}
                </Button>
                <Button variant="ghost" size="lg" style={{width:"100%", marginTop:8}}>
                  {t("Make an offer","قدم عرض")}
                </Button>
              </>
            )}

            <hr/>

            <div className="vdp-seller">
              <div className="vdp-seller-logo">{car.seller[0]}</div>
              <div>
                <div className="vdp-seller-name">{car.seller}</div>
                <div className="vdp-seller-meta">
                  {car.sellerType==="Platform" && <Badge variant="royal-soft" icon="shield">{t("Behbehani Certified","بهبهاني معتمد")}</Badge>}
                  {car.sellerType==="Dealer"   && <Badge variant="slate-soft">{t("Verified Dealer","معرض موثق")}</Badge>}
                  {car.sellerType==="Private"  && <Badge variant="slate-soft">{t("Private Seller","بائع خاص")}</Badge>}
                </div>
                <div className="vdp-seller-rate"><Icon name="star" size={12} color="#f59e0b"/> 4.9 · 312 {t("reviews","تقييم")}</div>
              </div>
            </div>

            <button className="vdp-trust-link">
              <Icon name="shield" size={14}/>
              <span><strong>{t("Behbehani Promise:","وعد بهبهاني:")}</strong> {t("Inspected, returnable, delivered.","مفحوصة، قابلة للإرجاع، تُوصَل.")}</span>
            </button>
          </div>

          <div className="vdp-views">
            <Icon name="info" size={14} color="var(--muted)"/>
            <span>{t("47 people viewed this in the last 24 hours","شاهدها ٤٧ شخصاً خلال ٢٤ ساعة")}</span>
          </div>
        </aside>
      </div>

      {/* Sticky mobile CTA */}
      <div className="vdp-sticky">
        <div>
          <div className="vdp-sticky-price">{fmtKWD(car.price, locale)}</div>
          <div className="vdp-sticky-mo">{fmtKWD(car.monthly,locale)}/{t("mo","شهر")}</div>
        </div>
        <Button variant="primary" size="lg" onClick={reserve}>
          {t("Reserve","احجز")} <Icon name="arrow-right" size={16}/>
        </Button>
      </div>
    </div>
  );
};

const Spec = ({icon, label, value}) => (
  <div className="vdp-spec">
    <Icon name={icon} size={16} color="var(--muted)"/>
    <div>
      <div className="vdp-spec-label">{label}</div>
      <div className="vdp-spec-value">{value}</div>
    </div>
  </div>
);

Object.assign(window, { VDPPage });
