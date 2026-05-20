/* eslint-disable */
// Sell a Car — 3 paths (Instant / Concierge / Self-service) with interactive flows

const SellPage = ({locale, go, route, user, onSignIn, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const path = route.path; // undefined | "instant" | "concierge" | "self" | "details" | "choose"

  if (!path) return <SellLanding locale={locale} go={go} user={user} onSignIn={onSignIn}/>;
  if (path==="details")   return <CarDetailsWizard locale={locale} go={go} user={user} onSignIn={onSignIn}/>;
  if (path==="choose")    return <ChooseSellOption locale={locale} go={go} toast={toast}/>;
  if (path==="plan-concierge") return <PlanSelection mode="concierge" locale={locale} go={go} toast={toast}/>;
  if (path==="plan-self")      return <PlanSelection mode="self"      locale={locale} go={go} toast={toast}/>;
  if (path==="instant")   return <InstantValuation locale={locale} go={go} toast={toast}/>;
  if (path==="concierge") return <Concierge       locale={locale} go={go} toast={toast}/>;
  if (path==="self")      return <SelfService     locale={locale} go={go} toast={toast} user={user} onSignIn={onSignIn}/>;
  return null;
};

const SellLanding = ({locale, go, user, onSignIn}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [mode, setMode] = React.useState("concierge"); // concierge | self
  const [openFaq, setOpenFaq] = React.useState(0);
  const [reviewIdx, setReviewIdx] = React.useState(0);
  const [hoverBrand, setHoverBrand] = React.useState(null);

  // Start the sell flow — sign in first if needed, then car-details wizard
  const startSelling = (preselectedBrand) => {
    if (!user) { onSignIn(); return; }
    go({page:"sell", path:"details", brand:preselectedBrand});
  };

  const popularBrands = BRANDS.slice(0, 7);

  const reviews = [
    { name:"Fahad Al-Abdullah",     type:t("Seller","بائع"), text:t("Super fast. Inspection done at my driveway, payment within 24 hours. Highly recommended.","تجربة سريعة وراقية. الفحص في البيت والدفع خلال ٢٤ ساعة."), date:"13 May 2026" },
    { name:"Aziz Almotairi",        type:t("Buyer","مشتري"), text:t("Fair pricing and zero pressure. The car arrived exactly as described in the inspection report.","أسعار عادلة وبدون ضغط. السيارة وصلت تماماً كما وصفها التقرير."), date:"13 May 2026" },
    { name:"Hu Al-Mutairat",        type:t("Seller","بائع"), text:t("Excellent service from start to finish. The concierge team handled everything beautifully.","خدمة ممتازة من البداية للنهاية."), date:"13 May 2026" },
    { name:"Khaled Alshatti",       type:t("Seller","بائع"), text:t("Professional photos, smart pricing, sold in 4 days. Would absolutely use again.","صور احترافية وتسعير ذكي. تم البيع خلال ٤ أيام."), date:"10 May 2026" },
    { name:"GP Singh",              type:t("Seller","بائع"), text:t("Car sold within 2 hours including inspection and registration transfer. Best experience.","تم بيع السيارة خلال ساعتين شاملة الفحص ونقل الملكية. أفضل تجربة."), date:"21 Apr 2026" },
    { name:"Mousa Behbehani",       type:t("Seller","بائع"), text:t("Very good service. The team is responsive and the process is transparent.","خدمة جيدة جداً. الفريق متجاوب والعملية شفافة."), date:"29 Apr 2026" },
  ];

  const faqs = [
    { q:t("What options do you offer for selling my car?","ما الخيارات التي تقدمونها لبيع سيارتي؟"),
      a:t("We offer two flexible options: a Concierge Service where our team handles the entire selling process for you, and Self-Service where you maintain full control using our platform and tools.","نقدم خيارين مرنين: خدمة الكونسيرج حيث يتولى فريقنا عملية البيع بالكامل، والنشر الذاتي حيث تحتفظ بالتحكم الكامل عبر منصتنا.") },
    { q:t("What are the benefits of the Concierge service?","ما مزايا خدمة الكونسيرج؟"),
      a:t("Our experienced team handles everything: 71-point inspection at your doorstep, professional photography, smart pricing, marketing, buyer inquiries, negotiation, payment and MOI ownership transfer.","يتولى فريقنا كل شيء: فحص ٧١ نقطة في موقعك، تصوير احترافي، تسعير ذكي، تسويق، مفاوضات، الدفع ونقل الملكية في وزارة الداخلية.") },
    { q:t("How long does it take to sell my car?","كم تستغرق عملية بيع سيارتي؟"),
      a:t("Through Concierge, the average time from inspection to closed deal is 7 days. Self-Service is typically 14–30 days depending on your asking price and demand.","عبر الكونسيرج، يستغرق الأمر ٧ أيام كمتوسط. النشر الذاتي عادةً ١٤-٣٠ يوم حسب السعر والطلب.") },
    { q:t("How do I book a home inspection and photoshoot?","كيف أحجز فحصاً وتصويراً في الموقع؟"),
      a:t("After selecting Concierge during signup, you'll pick your preferred location, date and time. Our technician will arrive with professional photography equipment and complete a 71-point inspection.","بعد اختيار الكونسيرج، تختار الموقع والتاريخ والوقت. سيصل الفني بمعدات التصوير الاحترافية ويكمل فحص ٧١ نقطة.") },
    { q:t("What if my car has issues or damage?","ماذا لو كانت سيارتي بها مشاكل أو أضرار؟"),
      a:t("No problem — we sell cars in all conditions. The inspection report will accurately reflect the condition, and pricing is adjusted accordingly. Transparency drives faster, fairer sales.","لا مشكلة — نبيع السيارات بجميع حالاتها. يعكس تقرير الفحص الحالة بدقة ويُعدّل السعر بناءً عليها.") },
    { q:t("Are there any upfront fees?","هل توجد رسوم مسبقة؟"),
      a:t("Concierge: zero upfront — we only earn a commission when your car sells. Self-Service: a small KWD 10 listing fee for 30 days of visibility.","الكونسيرج: لا رسوم مسبقة — نتقاضى عمولة فقط عند البيع. النشر الذاتي: رسوم بسيطة ١٠ د.ك لمدة ٣٠ يوماً.") },
  ];

  const conciergeSteps = [
    { icon:"camera",        ti:t("Home inspection & photoshoot","فحص وتصوير في الموقع"), su:t("Our certified technician arrives at your location for a 71-point inspection and professional photography session.","يصل فنينا المعتمد لموقعك لإجراء فحص ٧١ نقطة وجلسة تصوير احترافية.") },
    { icon:"sparkle",       ti:t("Receive cash offers","استلم عروضاً نقدية"),               su:t("Within 24–48 hours, we'll send you competitive cash offers from our network of verified dealers and buyers.","خلال ٢٤-٤٨ ساعة، نرسل لك عروضاً نقدية تنافسية من شبكة المعتمدين لدينا.") },
    { icon:"check-circle",  ti:t("Get paid without waiting","استلم بدون انتظار"),           su:t("Accept your favourite offer and we handle payment, ownership transfer and paperwork on the same day.","اقبل العرض المفضل ونتولى الدفع ونقل الملكية والأوراق في نفس اليوم.") },
  ];
  const selfSteps = [
    { icon:"list",     ti:t("List your car & condition","أنشئ إعلانك"),                      su:t("Upload photos, specs and an honest condition description. Your listing goes live within 24 hours of review.","حمّل الصور والمواصفات ووصفاً صادقاً للحالة. سيظهر إعلانك خلال ٢٤ ساعة بعد المراجعة.") },
    { icon:"phone",    ti:t("Handle calls & negotiate","تواصل وتفاوض"),                       su:t("Buyers reach you through our masked-number system. Negotiate, schedule viewings, and pick your price.","يتواصل المشترون عبر نظام الأرقام المخفية. تفاوض وحدد المعاينات والسعر.") },
    { icon:"return",   ti:t("Sell directly to buyers","البيع المباشر للمشتري"),               su:t("Close the deal yourself or upgrade to Concierge midway if you'd rather not handle the closing.","أتمم البيع بنفسك أو رقّ إلى الكونسيرج إذا فضّلت ذلك.") },
  ];
  const steps = mode==="concierge" ? conciergeSteps : selfSteps;

  return (
    <div className="sell-page">
      {/* === HERO === */}
      <section className="sell-hero-v2">
        <div className="sell-hero-bg">
          <div className="sell-hero-blob sb-1"/>
          <div className="sell-hero-blob sb-2"/>
        </div>
        <div className="container sell-hero-inner">
          <div className="sell-hero-content">
            <div className="sell-trust-pill">
              <div className="sell-trust-avatars">
                <span style={{background:"#1E3A8A"}}>F</span>
                <span style={{background:"#7C3AED"}}>A</span>
                <span style={{background:"#16A34A"}}>M</span>
                <span style={{background:"#F59E0B"}}>S</span>
              </div>
              <span>{t("Trusted by","موثوق من قبل")} <strong>10,000+</strong> {t("customers","عميل")}</span>
            </div>
            <h1 className="sell-hero-title">
              {t("Sell your car","بِع سيارتك")} <span className="sell-hero-accent">{t("the smart way","بالطريقة الذكية")}</span>
            </h1>
            <p className="sell-hero-sub">
              {t("Choose our expert full-service concierge approach, or take full control and sell it yourself. Either way — best price, no hassle.",
                 "اختر خدمة الكونسيرج المتكاملة، أو تولَّ التحكم وبِعها بنفسك. في كل الحالات — أفضل سعر وبدون عناء.")}
            </p>
            <div className="sell-hero-ctas">
              <Button variant="primary" size="lg" onClick={()=>startSelling()}>
                {t("Start selling","ابدأ البيع")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
              <Button variant="ghost" size="lg" onClick={()=>document.querySelector('.sell-how').scrollIntoView({behavior:"smooth"})}>
                {t("How it works","كيف يعمل")} <Icon name="chevron-down" size={14}/>
              </Button>
            </div>
            <div className="sell-hero-mini-trust">
              <span><Icon name="check-circle" size={14}/> {t("71-point inspection","فحص ٧١ نقطة")}</span>
              <span><Icon name="check-circle" size={14}/> {t("Guaranteed payment","دفع مضمون")}</span>
              <span><Icon name="check-circle" size={14}/> {t("MOI transfer included","نقل ملكية شامل")}</span>
            </div>
          </div>
          <div className="sell-hero-visual">
            <div className="sell-hero-card sh-card-1">
              <div className="sh-card-icon" style={{background:"#1E3A8A"}}><Icon name="dollar" size={20} color="#fff"/></div>
              <div>
                <div className="sh-card-label">{t("Average sale price","متوسط سعر البيع")}</div>
                <div className="sh-card-value">{t("12% higher","١٢٪ أعلى")}</div>
              </div>
            </div>
            <div className="sell-hero-car">
              <CarImage car={CARS[2]} className="sell-hero-car-img"/>
              <div className="sell-hero-car-tag">
                <Icon name="check-circle" size={14}/> {t("Sold in 4 days","بيعت خلال ٤ أيام")}
              </div>
            </div>
            <div className="sell-hero-card sh-card-2">
              <div className="sh-card-icon" style={{background:"#16A34A"}}><Icon name="star" size={20} color="#fff"/></div>
              <div>
                <div className="sh-card-label">{t("Customer rating","تقييم العملاء")}</div>
                <div className="sh-card-value">4.9 / 5.0</div>
              </div>
            </div>
            <div className="sell-hero-card sh-card-3">
              <div className="sh-card-icon" style={{background:"#F59E0B"}}><Icon name="clock" size={20} color="#fff"/></div>
              <div>
                <div className="sh-card-label">{t("Avg. time to sell","متوسط زمن البيع")}</div>
                <div className="sh-card-value">7 {t("days","أيام")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === START WITH YOUR BRAND === */}
      <section className="sell-brands">
        <div className="container">
          <div className="sell-brands-head">
            <h2>{t("Start with your car brand","ابدأ بماركة سيارتك")}</h2>
            <p>{t("Click your brand to begin. Don't see it? Choose 'Other' and we'll take it from there.","انقر على ماركتك للبدء. لا ترى ماركتك؟ اختر 'أخرى' وسنتولى ذلك.")}</p>
          </div>
          <div className="sell-brand-grid">
            {popularBrands.map(b=>(
              <button key={b.id} className={`sell-brand-card ${hoverBrand===b.id?"on":""}`}
                onMouseEnter={()=>setHoverBrand(b.id)}
                onMouseLeave={()=>setHoverBrand(null)}
                onClick={()=>startSelling(b.id)}>
                <BrandLogo brand={b} size={56}/>
                <span>{t(b.name, b.nameAr)}</span>
              </button>
            ))}
            <button className="sell-brand-card sell-brand-other" onClick={()=>startSelling()}>
              <div className="sell-brand-other-icon"><Icon name="sparkle" size={28}/></div>
              <span>{t("Other","أخرى")}</span>
            </button>
          </div>
          <div className="sell-brand-cta-row">
            <Button variant="primary" size="lg" onClick={()=>startSelling()}>
              {t("Start selling","ابدأ البيع")}
              <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
            </Button>
            <div className="sell-bundle-pill">
              <span className="sell-bundle-emoji">🚗</span>
              <div>
                <strong>{t("Selling more than one car?","تبيع أكثر من سيارة؟")}</strong>
                <a>{t("See our dealer bundles","تصفح باقات التجار")} <Icon name="arrow-right" size={12}/></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS — toggle Concierge/Self === */}
      <section className="sell-how">
        <div className="container">
          <div className="sell-section-head">
            <span className="section-eyebrow">{t("How it works","كيف يعمل")}</span>
            <h2>{t("Two ways to sell your car","طريقتان لبيع سيارتك")}</h2>
            <p>{t("Pick the experience that suits you — full-service or full-control.","اختر التجربة التي تناسبك — خدمة كاملة أو تحكم كامل.")}</p>
          </div>
          <div className="sell-mode-toggle">
            <button className={mode==="concierge"?"on":""} onClick={()=>setMode("concierge")}>
              <Icon name="sparkle" size={14}/>
              {t("Concierge service","خدمة الكونسيرج")}
              <Badge variant="royal-soft">{t("Recommended","موصى")}</Badge>
            </button>
            <button className={mode==="self"?"on":""} onClick={()=>setMode("self")}>
              <Icon name="user" size={14}/>
              {t("Self-service","نشر ذاتي")}
            </button>
          </div>
          <div className="sell-steps">
            {steps.map((s,i)=>(
              <div key={s.ti} className="sell-step-card">
                <div className="sell-step-num">{i+1}</div>
                <div className="sell-step-icon"><Icon name={s.icon} size={32}/></div>
                <h3>{s.ti}</h3>
                <p>{s.su}</p>
                {i<steps.length-1 && <div className="sell-step-connector"><Icon name="arrow-right" size={18}/></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === COMPARISON TABLE === */}
      <section className="sell-compare">
        <div className="container">
          <div className="sell-section-head">
            <span className="section-eyebrow">{t("Compare","قارن")}</span>
            <h2>{t("Choose the service that works for you","اختر الخدمة المناسبة لك")}</h2>
            <p>{t("Side-by-side breakdown of what each option includes.","تفصيل جنباً إلى جنب لما يشمله كل خيار.")}</p>
          </div>
          <div className="sell-compare-table">
            <div className="sct-head">
              <div className="sct-cell sct-feature-head">{t("Features","الميزات")}</div>
              <div className="sct-cell sct-concierge-head">
                <div className="sct-mode-pill royal">
                  <Icon name="sparkle" size={14}/>
                  {t("Concierge","كونسيرج")}
                </div>
                <Badge variant="royal-soft">{t("Most popular","الأكثر شيوعاً")}</Badge>
              </div>
              <div className="sct-cell sct-self-head">
                <div className="sct-mode-pill slate">
                  <Icon name="user" size={14}/>
                  {t("Self-service","نشر ذاتي")}
                </div>
              </div>
            </div>
            {[
              {f:t("71-point technical inspection at home","فحص ٧١ نقطة في الموقع"),  c:true, s:false},
              {f:t("Professional photography","تصوير احترافي"),                       c:true, s:false},
              {f:t("Cash offer within 24–48 hours","عرض نقدي خلال ٢٤-٤٨ ساعة"),    c:true, s:false},
              {f:t("Listing validity","صلاحية الإعلان"),                                c:t("Up to 90 days","حتى ٩٠ يوم"), s:t("Up to 30 days","حتى ٣٠ يوم")},
              {f:t("Calls & negotiations","المكالمات والتفاوض"),                       c:t("Handled by Behbehani","يديره بهبهاني"), s:t("Seller's responsibility","مسؤولية البائع")},
              {f:t("Payment & ownership transfer","الدفع ونقل الملكية"),                c:t("Guaranteed & supported","مضمون ومدعوم"),       s:t("Seller's responsibility","مسؤولية البائع")},
              {f:t("Listing fee","رسوم النشر"),                                          c:t("0 KWD upfront","صفر مسبقاً"),                  s:t("KWD 10 / 30 days","١٠ د.ك / ٣٠ يوم")},
              {f:t("Marketing across our buyer network","التسويق عبر شبكة المشترين"), c:true, s:false},
            ].map((row,i)=>(
              <div key={i} className="sct-row">
                <div className="sct-cell sct-feature">{row.f}</div>
                <div className="sct-cell sct-concierge">
                  {row.c===true ? <span className="sct-check"><Icon name="check" size={14}/></span>
                    : row.c===false ? <span className="sct-x"><Icon name="x" size={14}/></span>
                    : <span className="sct-text">{row.c}</span>}
                </div>
                <div className="sct-cell sct-self">
                  {row.s===true ? <span className="sct-check"><Icon name="check" size={14}/></span>
                    : row.s===false ? <span className="sct-x"><Icon name="x" size={14}/></span>
                    : <span className="sct-text">{row.s}</span>}
                </div>
              </div>
            ))}
            <div className="sct-foot">
              <div className="sct-cell"></div>
              <div className="sct-cell">
                <Button variant="primary" size="lg" onClick={()=>startSelling()} style={{width:"100%"}}>
                  {t("Choose Concierge","اختر الكونسيرج")}
                  <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
                </Button>
              </div>
              <div className="sct-cell">
                <Button variant="secondary" size="lg" onClick={()=>go({page:"sell", path:"self"})} style={{width:"100%"}}>
                  {t("Choose Self-service","اختر النشر الذاتي")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA BANNER === */}
      <section className="sell-cta-banner">
        <div className="container">
          <div className="sell-cta-inner">
            <div>
              <Badge variant="white-on-dark">{t("Ready when you are","جاهزون عندما تكون مستعداً")}</Badge>
              <h2>{t("Ready to get the best market price for your car?","جاهز لتحصل على أفضل سعر سوقي لسيارتك؟")}</h2>
              <p>{t("Join thousands of customers who chose the smarter way to sell.","انضم لآلاف العملاء الذين اختاروا الطريقة الأذكى للبيع.")}</p>
            </div>
            <Button variant="white" size="lg" onClick={()=>startSelling()}>
              {t("Start selling now","ابدأ البيع الآن")}
              <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
            </Button>
          </div>
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section className="sell-reviews">
        <div className="container">
          <div className="sell-reviews-head">
            <div>
              <span className="section-eyebrow">{t("Customer love","حب العملاء")}</span>
              <h2>{t("What our customers say","ماذا يقول عملاؤنا")}</h2>
            </div>
            <div className="sell-reviews-summary">
              <div className="sell-reviews-stars">{[1,2,3,4,5].map(n=><Icon key={n} name="star" size={18} color="#F59E0B"/>)}</div>
              <strong>4.9 / 5</strong>
              <span>{t("from","من")} 2,840+ {t("reviews","تقييم")}</span>
            </div>
          </div>
          <div className="sell-reviews-carousel">
            <button className="srn-nav prev" onClick={()=>setReviewIdx(i=>(i-3+reviews.length)%reviews.length)} aria-label="Prev">
              <Icon name="chevron-left" size={18}/>
            </button>
            <div className="sell-reviews-track">
              {[0,1,2].map(off=>{
                const r = reviews[(reviewIdx+off)%reviews.length];
                return (
                  <article key={off} className="sell-review-card">
                    <div className="sell-review-stars">{[1,2,3,4,5].map(n=><Icon key={n} name="star" size={14} color="#F59E0B"/>)}</div>
                    <Badge variant={r.type===t("Seller","بائع")?"royal-soft":"slate-soft"}>{r.type}</Badge>
                    <p>"{r.text}"</p>
                    <footer>
                      <div className="sell-review-avatar">{r.name.charAt(0)}</div>
                      <div>
                        <strong>{r.name}</strong>
                        <span>{r.date}</span>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
            <button className="srn-nav next" onClick={()=>setReviewIdx(i=>(i+3)%reviews.length)} aria-label="Next">
              <Icon name="chevron-right" size={18}/>
            </button>
          </div>
        </div>
      </section>

      {/* === FAQ === */}
      <section className="sell-faq">
        <div className="container">
          <div className="sell-section-head">
            <span className="section-eyebrow">FAQ</span>
            <h2>{t("Frequently asked questions","الأسئلة الشائعة")}</h2>
            <p>{t("Everything you need to know before selling.","كل ما تحتاج معرفته قبل البيع.")}</p>
          </div>
          <div className="sell-faq-list">
            {faqs.map((f,i)=>(
              <div key={i} className={`sell-faq-item ${openFaq===i?"open":""}`}>
                <button onClick={()=>setOpenFaq(openFaq===i?-1:i)} className="sell-faq-q">
                  <span>{f.q}</span>
                  <Icon name={openFaq===i?"chevron-down":"chevron-right"} size={18}/>
                </button>
                {openFaq===i && <div className="sell-faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === NEED HELP === */}
      <section className="sell-help">
        <div className="container">
          <div className="sell-help-card">
            <div className="sell-help-left">
              <div className="sell-help-emoji">👋</div>
              <div>
                <span className="section-eyebrow">{t("Need help?","تحتاج مساعدة؟")}</span>
                <h2>{t("Our expert team is ready to help you.","فريق الخبراء جاهز لمساعدتك.")}</h2>
                <p>{t("Reach out via WhatsApp, phone or email — whichever works best for you.","تواصل عبر واتساب أو الهاتف أو البريد.")}</p>
              </div>
            </div>
            <div className="sell-help-options">
              <a href="https://wa.me/96522282282" target="_blank" rel="noopener" className="sell-help-option">
                <div className="sho-icon wa"><Icon name="whatsapp" size={22}/></div>
                <div>
                  <strong>WhatsApp</strong>
                  <span>{t("Get instant support","دعم فوري")}</span>
                </div>
                <Icon name="arrow-right" size={16}/>
              </a>
              <a href="tel:+96522282282" className="sell-help-option">
                <div className="sho-icon phone"><Icon name="phone" size={22}/></div>
                <div>
                  <strong>+965 22 282 282</strong>
                  <span>{t("9 AM – 6 PM, Sun–Sat","٩ ص – ٦ م، الأحد إلى السبت")}</span>
                </div>
                <Icon name="arrow-right" size={16}/>
              </a>
              <a href="mailto:sell@behbehanimotors.com" className="sell-help-option">
                <div className="sho-icon email"><Icon name="doc" size={22}/></div>
                <div>
                  <strong>{t("Email us","البريد الإلكتروني")}</strong>
                  <span>sell@behbehanimotors.com</span>
                </div>
                <Icon name="arrow-right" size={16}/>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ---------- Instant Valuation ----------
const InstantValuation = ({locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({
    brand:"toyota", model:"Camry", year:"2020", mileage:"68000", condition:"good", trim:"XLI",
    fuel:"Petrol", transmission:"Automatic", specs:"GCC", color:"White", phone:"9999 1234", name:"Ahmad Al-Sabah"
  });
  const upd = (k,v) => setData({...data, [k]:v});
  const valuation = React.useMemo(()=>{
    // Fake valuation logic
    const base = 5400;
    const age = 2026 - parseInt(data.year||0);
    const km = parseInt((data.mileage||"0").toString().replace(/\D/g,""));
    const cond = {excellent:1.08, good:1.0, fair:0.88, poor:0.72}[data.condition] || 1;
    const v = Math.round(((base - age*420 - km*0.018) * cond) / 10) * 10;
    return Math.max(1500, v);
  }, [data]);
  const low = Math.round(valuation * 0.92 / 10)*10;
  const high = Math.round(valuation * 1.08 / 10)*10;

  return (
    <div className="iv-wrap">
      <div className="iv-head">
        <div className="container">
          <button className="reserve-back" onClick={()=>go({page:"sell"})}><Icon name="chevron-left" size={16}/> {t("Back","عودة")}</button>
          <Badge variant="white">{t("Instant Valuation","تقييم فوري")}</Badge>
          <h1>{t("Get your offer in 60 seconds","عرضك خلال ٦٠ ثانية")}</h1>
          <div className="iv-stepper">
            {[1,2,3,4].map(n=>(
              <div key={n} className={`iv-step ${step>=n?"on":""} ${step===n?"active":""}`}>
                <span>{step>n?<Icon name="check" size={12}/>:n}</span>
                <strong>{n===1?t("Your car","سيارتك"):n===2?t("Details","التفاصيل"):n===3?t("Contact","التواصل"):t("Offer","العرض")}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container iv-body">
        <main className="iv-form">
          {step===1 && (
            <div className="wstep-body">
              <h2>{t("Tell us about your car","أخبرنا عن سيارتك")}</h2>
              <div className="wstep-form">
                <div className="wfield">
                  <label>{t("Brand","الماركة")}</label>
                  <select value={data.brand} onChange={e=>upd("brand",e.target.value)}>
                    {BRANDS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="wfield"><label>{t("Model","الموديل")}</label><input value={data.model} onChange={e=>upd("model",e.target.value)}/></div>
                <div className="wfield"><label>{t("Year","السنة")}</label>
                  <select value={data.year} onChange={e=>upd("year",e.target.value)}>
                    {Array.from({length:15}, (_,i)=>2026-i).map(y=><option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="wfield"><label>{t("Trim","الفئة")}</label><input value={data.trim} onChange={e=>upd("trim",e.target.value)}/></div>
                <div className="wfield"><label>{t("Mileage (km)","الممشى")}</label><input value={data.mileage} onChange={e=>upd("mileage",e.target.value)}/></div>
                <div className="wfield"><label>{t("Regional specs","المواصفات")}</label>
                  <select value={data.specs} onChange={e=>upd("specs",e.target.value)}>
                    <option>GCC</option><option>American</option><option>European</option><option>Japanese</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {step===2 && (
            <div className="wstep-body">
              <h2>{t("Condition & details","الحالة والتفاصيل")}</h2>
              <h4>{t("Overall condition","الحالة العامة")}</h4>
              <div className="condition-grid">
                {[
                  {id:"excellent", t:t("Excellent","ممتازة"), s:t("Like-new, no defects","شبه جديدة")},
                  {id:"good",      t:t("Good","جيدة"),       s:t("Minor wear, well-maintained","استهلاك خفيف")},
                  {id:"fair",      t:t("Fair","متوسطة"),     s:t("Some cosmetic or mechanical issues","بها مشاكل بسيطة")},
                  {id:"poor",      t:t("Poor","ضعيفة"),      s:t("Major repairs needed","تحتاج إصلاحات")},
                ].map(c=>(
                  <button key={c.id} className={`cond-card ${data.condition===c.id?"on":""}`}
                          onClick={()=>upd("condition",c.id)}>
                    <strong>{c.t}</strong>
                    <span>{c.s}</span>
                  </button>
                ))}
              </div>
              <div className="wstep-form">
                <div className="wfield"><label>{t("Transmission","ناقل الحركة")}</label>
                  <select value={data.transmission} onChange={e=>upd("transmission",e.target.value)}>
                    <option>Automatic</option><option>Manual</option><option>CVT</option>
                  </select>
                </div>
                <div className="wfield"><label>{t("Fuel","الوقود")}</label>
                  <select value={data.fuel} onChange={e=>upd("fuel",e.target.value)}>
                    <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
                  </select>
                </div>
                <div className="wfield"><label>{t("Exterior color","اللون")}</label><input value={data.color} onChange={e=>upd("color",e.target.value)}/></div>
                <div className="wfield"><label>{t("Accidents","حوادث")}</label>
                  <select><option>None</option><option>Minor</option><option>Major</option></select>
                </div>
              </div>
            </div>
          )}
          {step===3 && (
            <div className="wstep-body">
              <h2>{t("How can we reach you?","كيف نتواصل معك؟")}</h2>
              <div className="wstep-form">
                <div className="wfield"><label>{t("Full name","الاسم الكامل")}</label><input value={data.name} onChange={e=>upd("name",e.target.value)}/></div>
                <div className="wfield">
                  <label>{t("Mobile (+965)","الهاتف")}</label>
                  <div className="phone-input"><span className="phone-prefix">+965</span><input value={data.phone} onChange={e=>upd("phone",e.target.value)}/></div>
                </div>
              </div>
              <label className="check-row">
                <input type="checkbox" defaultChecked/>
                <span>{t("Send me my offer via WhatsApp + email","أرسل العرض على واتساب والبريد")}</span>
              </label>
              <label className="check-row">
                <input type="checkbox"/>
                <span>{t("Subscribe to monthly Value Tracker updates","اشترك في تحديثات القيمة الشهرية")}</span>
              </label>
            </div>
          )}
          {step===4 && (
            <div className="wstep-body iv-offer">
              <div className="iv-offer-card">
                <Badge variant="white" icon="sparkle">{t("Your guaranteed offer","عرضك المضمون")}</Badge>
                <div className="iv-offer-label">{t("We'll pay you","سندفع لك")}</div>
                <div className="iv-offer-value">{fmtKWD(valuation, locale)}</div>
                <div className="iv-offer-range">{t("Range","النطاق")}: {fmtKWD(low, locale)} – {fmtKWD(high, locale)}</div>
                <div className="iv-offer-validity">
                  <Icon name="clock" size={14}/>
                  <span>{t("Valid for 7 days · No obligation","ساري ٧ أيام · بدون التزام")}</span>
                </div>
                <Button variant="white" size="lg" style={{width:"100%"}} onClick={()=>toast(t("Inspection booked! We'll WhatsApp you details.","تم حجز الفحص!"),"success")}>
                  {t("Book inspection — Sell today","احجز الفحص — بِع اليوم")}
                </Button>
                <button className="iv-offer-secondary" onClick={()=>go({page:"home"})}>{t("I'll think about it","سأفكر فيها")}</button>
              </div>
              <div className="iv-offer-info">
                <h3>{t("What happens next?","ما الخطوة التالية؟")}</h3>
                <ol>
                  <li><strong>{t("Book a 30-min inspection","فحص ٣٠ دقيقة")}</strong> — {t("At our garage in Hawalli or your home","في موقعنا أو في بيتك")}</li>
                  <li><strong>{t("Final price confirmed","تأكيد السعر النهائي")}</strong> — {t("Within 1 hour of inspection","خلال ساعة")}</li>
                  <li><strong>{t("Get paid same day","استلم نفس اليوم")}</strong> — {t("Bank transfer + MOI transfer handled","تحويل بنكي ونقل ملكية")}</li>
                </ol>
              </div>
            </div>
          )}

          <footer className="wizard-foot">
            <Button variant="ghost" onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1}>
              <Icon name="chevron-left" size={16}/> {t("Back","السابق")}
            </Button>
            {step<4 ? (
              <Button variant="primary" size="lg" onClick={()=>setStep(s=>s+1)}>
                {t("Continue","متابعة")} <Icon name="arrow-right" size={16}/>
              </Button>
            ) : null}
          </footer>
        </main>

        <aside className="iv-aside">
          <h4>{t("Live valuation preview","معاينة التقييم")}</h4>
          <div className="iv-preview-value">{fmtKWD(valuation,locale)}</div>
          <div className="iv-preview-range">{fmtKWD(low,locale)} – {fmtKWD(high,locale)}</div>
          <div className="iv-preview-meta">
            <div><span>{t("Brand","الماركة")}</span><strong>{brandOf(data.brand).name}</strong></div>
            <div><span>{t("Model","الموديل")}</span><strong>{data.model || "—"}</strong></div>
            <div><span>{t("Year","السنة")}</span><strong>{data.year}</strong></div>
            <div><span>{t("Mileage","الممشى")}</span><strong>{data.mileage || "—"} km</strong></div>
            <div><span>{t("Condition","الحالة")}</span><strong>{data.condition}</strong></div>
          </div>
          <div className="iv-preview-bar">
            <Icon name="info" size={12}/>
            <span>{t("Final offer confirmed after a 30-minute physical inspection.","العرض النهائي بعد الفحص الفعلي.")}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------- Concierge ----------
const Concierge = ({locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <div className="container concierge">
      <button className="reserve-back" onClick={()=>go({page:"sell"})}><Icon name="chevron-left" size={16}/> {t("Back","عودة")}</button>
      <Badge variant="gold">{t("Concierge Service","خدمة الكونسيرج")}</Badge>
      <h1>{t("Hand us the keys. We do everything.","سلّمنا المفاتيح. نقوم بكل شيء.")}</h1>
      <p className="concierge-sub">{t("Average sale price is 8-12% higher than self-service. Our concierge advisor handles inspection, photography, pricing, marketing, viewings, negotiation and ownership transfer.","متوسط البيع أعلى بـ ٨-١٢٪.")}</p>

      <div className="concierge-grid">
        <main>
          <h3>{t("Your sale, in 6 steps","البيع في ٦ خطوات")}</h3>
          <div className="conc-timeline">
            {[
              [t("Submit request","قدّم الطلب"), t("60 seconds. Just car details + contact.","٦٠ ثانية")],
              [t("Advisor assigned","تعيين مستشار"), t("Within 2 hours · personal point of contact","خلال ساعتين")],
              [t("Inspection + photoshoot","فحص وتصوير"), t("On-site at your home or our garage. 25+ HD photos + 360°.","في موقعك أو موقعنا")],
              [t("Listing published","نشر الإعلان"), t("Multi-channel marketing — Behbehani + partner sites","تسويق متعدد القنوات")],
              [t("Buyer found & negotiated","عثور على مشتري"), t("First offer in 3 days target SLA","أول عرض خلال ٣ أيام")],
              [t("Paid & transferred","الدفع والنقل"), t("Secure payment + MOI ownership transfer handled","الدفع ونقل الملكية")],
            ].map(([ti,su],i)=>(
              <div key={ti} className="conc-step">
                <div className="conc-step-num">{i+1}</div>
                <div>
                  <strong>{ti}</strong>
                  <p>{su}</p>
                </div>
                {i<5 && <div className="conc-step-line"/>}
              </div>
            ))}
          </div>

          <div className="conc-fees">
            <h3>{t("Transparent commission","عمولة شفافة")}</h3>
            <div className="conc-fees-row">
              <div><span>{t("Commission on sale","العمولة على البيع")}</span><strong>3%</strong></div>
              <div><span>{t("Inspection + photoshoot","الفحص والتصوير")}</span><strong>{t("Included","مشمول")}</strong></div>
              <div><span>{t("MOI transfer","نقل الملكية")}</span><strong>{t("Included","مشمول")}</strong></div>
              <div><span>{t("Marketing","التسويق")}</span><strong>{t("Included","مشمول")}</strong></div>
            </div>
            <div className="conc-fees-note">
              <Icon name="info" size={12}/>
              <span>{t("Only paid if we sell your car. No upfront fees.","تدفع فقط عند البيع. بدون رسوم مقدمة.")}</span>
            </div>
          </div>
        </main>

        <aside>
          <div className="conc-form">
            <h3>{t("Request a callback","اطلب اتصال")}</h3>
            <p>{t("An advisor will reach out within 2 hours.","يتواصل معك مستشار خلال ساعتين.")}</p>
            <div className="wstep-form">
              <div className="wfield"><label>{t("Full name","الاسم")}</label><input defaultValue="Ahmad Al-Sabah"/></div>
              <div className="wfield"><label>{t("Mobile","الهاتف")}</label>
                <div className="phone-input"><span className="phone-prefix">+965</span><input defaultValue="9999 1234"/></div>
              </div>
              <div className="wfield"><label>{t("Car","السيارة")}</label><input placeholder="e.g. Toyota Camry 2020"/></div>
              <div className="wfield"><label>{t("Best time","أفضل وقت")}</label>
                <select><option>Morning (9 – 12)</option><option>Afternoon (12 – 17)</option><option>Evening (17 – 21)</option></select>
              </div>
            </div>
            <Button variant="primary" size="lg" style={{width:"100%"}}
                    onClick={()=>toast(t("Request received! Advisor will call you soon.","تم استلام الطلب!"),"success")}>
              {t("Request callback","اطلب الاتصال")}
            </Button>
            <div className="conc-form-or">
              <span>{t("or call now","أو اتصل الآن")}</span>
              <a className="conc-call" href="tel:+96522282282"><Icon name="phone" size={16}/> 22 282 282</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------- Self-service ----------
const SelfService = ({locale, go, toast, user, onSignIn}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [step, setStep] = React.useState(1);
  const [photos, setPhotos] = React.useState([]); // mock
  const addPhoto = () => setPhotos([...photos, {id:Date.now()}]);

  if (!user) {
    return (
      <div className="container self-empty">
        <Icon name="user" size={48} color="var(--royal)"/>
        <h2>{t("Sign in to post your listing","سجّل دخولك لنشر إعلانك")}</h2>
        <p>{t("Self-service is free for individuals. Sign in to continue.","النشر الذاتي مجاني للأفراد.")}</p>
        <Button variant="primary" size="lg" onClick={onSignIn}>{t("Sign in","تسجيل دخول")}</Button>
      </div>
    );
  }

  return (
    <div className="container self-wrap">
      <button className="reserve-back" onClick={()=>go({page:"sell"})}><Icon name="chevron-left" size={16}/> {t("Back","عودة")}</button>
      <Badge variant="slate">{t("Self-Service","نشر ذاتي")}</Badge>
      <h1>{t("Post your listing","انشر إعلانك")}</h1>

      <div className="self-stepper">
        {[t("Car info","معلومات السيارة"), t("Photos","الصور"), t("Price & description","السعر والوصف"), t("Review","المراجعة")].map((s,i)=>(
          <div key={s} className={`iv-step ${step>=i+1?"on":""} ${step===i+1?"active":""}`}>
            <span>{step>i+1?<Icon name="check" size={12}/>:i+1}</span>
            <strong>{s}</strong>
          </div>
        ))}
      </div>

      <main className="self-form wstep-body">
        {step===1 && (
          <>
            <h2>{t("Tell us about your car","أخبرنا عن سيارتك")}</h2>
            <div className="wstep-form">
              <div className="wfield"><label>{t("Brand","الماركة")}</label>
                <select>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select>
              </div>
              <div className="wfield"><label>{t("Model","الموديل")}</label><input defaultValue="Sonata"/></div>
              <div className="wfield"><label>{t("Year","السنة")}</label><select defaultValue="2020">{Array.from({length:15},(_,i)=>2026-i).map(y=><option key={y}>{y}</option>)}</select></div>
              <div className="wfield"><label>{t("Trim","الفئة")}</label><input defaultValue="N-Line"/></div>
              <div className="wfield"><label>{t("Mileage (km)","الممشى")}</label><input defaultValue="62,000"/></div>
              <div className="wfield"><label>{t("VIN","رقم الشاسيه")}</label><input placeholder="17 chars"/></div>
              <div className="wfield"><label>{t("Body type","الشكل")}</label><select>{BODY_TYPES.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
              <div className="wfield"><label>{t("Transmission","ناقل الحركة")}</label><select><option>Automatic</option><option>Manual</option></select></div>
              <div className="wfield"><label>{t("Fuel","الوقود")}</label><select><option>Petrol</option><option>Hybrid</option><option>Electric</option></select></div>
              <div className="wfield"><label>{t("Exterior","اللون الخارجي")}</label><input defaultValue="Black"/></div>
              <div className="wfield"><label>{t("Interior","اللون الداخلي")}</label><input defaultValue="Black cloth"/></div>
              <div className="wfield"><label>{t("Regional specs","المواصفات")}</label><select><option>GCC</option><option>American</option></select></div>
            </div>
          </>
        )}
        {step===2 && (
          <>
            <h2>{t("Photos (at least 8)","الصور (٨ على الأقل)")}</h2>
            <p>{t("Tip: take photos in good light. Include front, back, sides, interior, dashboard and odometer.","نصيحة: التقط الصور في إضاءة جيدة.")}</p>
            <div className="self-photo-grid">
              {Array.from({length:Math.max(8, photos.length+1)}).map((_,i)=>(
                photos[i] ? (
                  <div key={i} className="self-photo">
                    <div className="self-photo-thumb"><Icon name="camera" size={20} color="#fff"/></div>
                    <button onClick={()=>setPhotos(photos.filter((_,j)=>j!==i))}><Icon name="x" size={12}/></button>
                  </div>
                ) : (
                  <button key={i} className="self-photo-add" onClick={addPhoto}>
                    <Icon name="upload" size={20}/>
                    <span>{t("Add photo","أضف صورة")}</span>
                  </button>
                )
              ))}
            </div>
          </>
        )}
        {step===3 && (
          <>
            <h2>{t("Set your price","حدد سعرك")}</h2>
            <div className="wstep-form">
              <div className="wfield"><label>{t("Asking price (KWD)","السعر المطلوب")}</label><input defaultValue="4,500"/></div>
              <div className="wfield"><label>{t("Description","الوصف")}</label>
                <textarea rows="5" defaultValue={t("Single owner. Full service history. Non-smoker. New tires fitted last month.","مالك واحد. سجل خدمة كامل.")}/>
              </div>
              <div className="wfield"><label>{t("Accept offers?","تقبل عروض؟")}</label><select><option>Yes — buyers can negotiate</option><option>No — fixed price</option></select></div>
            </div>
            <div className="self-promote">
              <h4>{t("Promote your listing (optional)","رفع إعلانك (اختياري)")}</h4>
              <label className="check-row"><input type="checkbox"/><span>{t("Featured spot — KWD 10 · 7 days","موضع مميز")}</span></label>
              <label className="check-row"><input type="checkbox"/><span>{t("Bump up daily — KWD 5","رفع يومي")}</span></label>
              <label className="check-row"><input type="checkbox"/><span>{t("Highlighted card — KWD 3","بطاقة مميزة")}</span></label>
            </div>
          </>
        )}
        {step===4 && (
          <>
            <h2>{t("Review your listing","راجع إعلانك")}</h2>
            <div className="self-review-card">
              <div className="self-review-img">{photos.length||8} {t("photos","صور")}</div>
              <div>
                <h3>2020 Hyundai Sonata N-Line</h3>
                <div className="self-review-meta">62,000 km · Automatic · Petrol · GCC</div>
                <div className="self-review-price">{fmtKWD(4500, locale)}</div>
                <p>{t("Single owner. Full service history. Non-smoker.","مالك واحد. سجل خدمة كامل.")}</p>
              </div>
            </div>
            <div className="self-review-info">
              <Icon name="info" size={16}/>
              <span>{t("Listings are reviewed within 24 hours. You'll get an SMS when approved.","تتم المراجعة خلال ٢٤ ساعة.")}</span>
            </div>
          </>
        )}
      </main>

      <footer className="wizard-foot">
        <Button variant="ghost" onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1}>
          <Icon name="chevron-left" size={16}/> {t("Back","السابق")}
        </Button>
        <Button variant="primary" size="lg"
                onClick={()=>{
                  if (step===4) { toast(t("Submitted for review. We'll notify you in 24 hours.","تم الإرسال للمراجعة."),"success"); go({page:"account", tab:"listings"}); }
                  else setStep(s=>s+1);
                }}>
          {step===4 ? t("Submit listing","إرسال الإعلان") : t("Continue","متابعة")} <Icon name="arrow-right" size={16}/>
        </Button>
      </footer>
    </div>
  );
};

Object.assign(window, { SellPage });