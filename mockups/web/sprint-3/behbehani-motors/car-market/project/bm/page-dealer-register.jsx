/* eslint-disable */
// Dealer registration / partner page — replaces old DealersPage
// Inspired by motorgy.com/dealer-register but built fresh with Behbehani's visual system

const DealerRegisterPage = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;

  // Multi-step registration form state — keep it simple
  const [step, setStep]   = React.useState(1);
  const [plan, setPlan]   = React.useState("pro");
  const [form, setForm]   = React.useState({
    company: "",
    contact: "",
    phone:   "",
    email:   "",
    crNo:    "",
    area:    "Jabriya",
    inventory: "20-50",
    brands:    [],
    agree:     false,
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [openFaq,    setOpenFaq]  = React.useState(0);

  const updF = (k,v) => setForm(f => ({...f, [k]: v}));
  const toggleBrand = (b) => setForm(f => ({
    ...f,
    brands: f.brands.includes(b) ? f.brands.filter(x=>x!==b) : [...f.brands, b],
  }));

  const submit = () => { setSubmitted(true); window.scrollTo({top:0, behavior:"smooth"}); };

  // ----- Static content -----
  const stats = [
    { num:"250+",   label:t("Active dealers",   "معرض نشط") },
    { num:"8,400+", label:t("Cars listed",      "سيارة معروضة") },
    { num:"45k/mo", label:t("Buyer visits",     "زيارة شهرياً") },
    { num:"4.8★",   label:t("Dealer rating",    "تقييم المعارض") },
  ];

  const benefits = [
    { ic:"sparkle",       ti:t("Free unlimited listings",      "إعلانات مجانية غير محدودة"),
      su:t("Add and update inventory at no cost. Photos, video tours, walk-arounds — all bundled.",
           "أضف وعدّل المخزون مجاناً. صور وجولات فيديو، كل شيء مشمول.") },
    { ic:"phone",         ti:t("Verified buyer leads",          "مشترون موثقون"),
      su:t("Real, screened buyers — masked numbers, scam-free chat, and lead routing by location.",
           "مشترون حقيقيون مع أرقام مخفية ومحادثة آمنة.") },
    { ic:"calc",          ti:t("Real-time analytics",           "تحليلات لحظية"),
      su:t("Track views, calls, leads and conversion per listing. See what sells, what stalls.",
           "تتبع المشاهدات والاتصالات والتحويلات لكل إعلان.") },
    { ic:"shield",        ti:t("Verified-dealer badge",         "شارة معرض موثق"),
      su:t("Stand out with a blue tick after our document and showroom verification.",
           "تميّز بشارة موثق بعد التحقق من الوثائق والمعرض.") },
    { ic:"truck",         ti:t("Logistics & delivery",          "النقل والتوصيل"),
      su:t("Optional door-to-door car delivery and trade-in pickup at preferred rates.",
           "توصيل من الباب للباب واستلام البدل بأسعار مميزة.") },
    { ic:"user",          ti:t("Dedicated account manager",     "مدير حساب مخصص"),
      su:t("Pro and Premium plans include a human partner — onboarding, photoshoots, promo strategy.",
           "خطط Pro و Premium تشمل مديراً مخصصاً للتدريب والتصوير والترويج.") },
  ];

  const steps = [
    { num:"01", ti:t("Submit your application",  "قدّم طلبك"),
      su:t("Tell us about your dealership — CR, showroom location, inventory size and brand mix.",
           "أخبرنا عن معرضك — السجل التجاري، الموقع، حجم المخزون والماركات.") },
    { num:"02", ti:t("Verification & onboarding", "التحقق والتدريب"),
      su:t("Our team visits, validates documents, photographs your showroom and helps set up your storefront.",
           "يزور فريقنا المعرض، يتحقق من الوثائق، يصوّر المعرض ويساعد في إعداد واجهتك.") },
    { num:"03", ti:t("Upload your inventory",     "حمّل مخزونك"),
      su:t("Bulk-import existing inventory by spreadsheet or sync with your DMS in a few clicks.",
           "استورد المخزون بملف أو اربط نظام DMS الخاص بك بنقرات.") },
    { num:"04", ti:t("Receive leads & sell",      "استلم العملاء وبع"),
      su:t("Verified buyers reach you within 24 hours. You handle the rest — or let Concierge handle it for you.",
           "يصلك مشترون موثقون خلال ٢٤ ساعة. تتولى الباقي أو يتولاه الكونسيرج.") },
  ];

  const plans = [
    {
      id:"starter", name:t("Starter","المبتدئ"),
      price:0, unit:"KWD/mo",
      tag:t("Always free","مجاناً دائماً"),
      blurb:t("For new dealers testing the platform.","للمعارض الجديدة لتجربة المنصة."),
      features:[
        t("Up to 15 active listings","حتى ١٥ إعلان نشط"),
        t("Basic analytics dashboard","لوحة تحليلات أساسية"),
        t("Masked-number lead routing","توجيه عملاء بأرقام مخفية"),
        t("Email support","دعم بالبريد"),
      ],
      limits:[
        t("No verified badge","بدون شارة توثيق"),
        t("No account manager","بدون مدير حساب"),
      ],
      cta:t("Start free","ابدأ مجاناً"),
    },
    {
      id:"pro", name:t("Pro","المحترف"),
      price:79, unit:"KWD/mo",
      tag:t("Most popular","الأكثر شعبية"),
      blurb:t("Mid-size dealers ready to scale leads and visibility.","معارض متوسطة تستعد للنمو."),
      features:[
        t("Unlimited active listings","إعلانات غير محدودة"),
        t("Verified-dealer badge","شارة معرض موثق"),
        t("Advanced analytics + exports","تحليلات متقدمة وتصدير"),
        t("Featured placement (×3/wk)","ظهور مميز ٣ مرات/أسبوع"),
        t("Dedicated account manager","مدير حساب مخصص"),
        t("Logistics partner rates","أسعار شراكة النقل"),
      ],
      limits:[],
      cta:t("Choose Pro","اختر Pro"),
      highlight: true,
    },
    {
      id:"premium", name:t("Premium","بريميوم"),
      price:199, unit:"KWD/mo",
      tag:t("White-glove","خدمة كاملة"),
      blurb:t("Full-service partnership for high-volume showrooms.","شراكة كاملة لمعارض الحجم الكبير.") ,
      features:[
        t("Everything in Pro","كل ميزات Pro"),
        t("Homepage spotlight rotation","تدوير في الصفحة الرئيسية"),
        t("Concierge listing service","خدمة الإدراج بالكامل"),
        t("Pro photoshoot included","تصوير احترافي مشمول"),
        t("DMS integration + API access","ربط DMS و API"),
        t("Quarterly business review","مراجعة ربع سنوية"),
      ],
      limits:[],
      cta:t("Talk to sales","تواصل مع المبيعات"),
    },
  ];

  const testimonials = [
    { name:"Bavaria Cars",       loc:"Jabriya",   gain:"+42%", note:t("listings to leads in 3 months",  "من الإدراج للعملاء خلال ٣ أشهر") },
    { name:"Pearl Auto Gallery", loc:"City",      gain:"68",   note:t("cars sold via platform last quarter","سيارة بيعت عبر المنصة آخر ربع") },
    { name:"Royal Wheels",       loc:"Salmiya",   gain:"4.9★", note:t("average buyer rating",            "متوسط تقييم المشترين") },
  ];

  const faqs = [
    { q:t("Who can register as a dealer?","من يمكنه التسجيل كمعرض؟"),
      a:t("Any licensed Kuwait-based dealership with a valid commercial registration (CR). Showroom or storage location must be physically present in Kuwait — home-based or virtual operations are reviewed case-by-case.",
          "أي معرض مرخص في الكويت لديه سجل تجاري ساري. يجب أن يكون الموقع فعلياً في الكويت — تُراجع الحالات الافتراضية فردياً.") },
    { q:t("How long does verification take?","كم تستغرق عملية التحقق؟"),
      a:t("Typically 2–3 business days after we receive your CR, showroom photos and a sample inventory file. Premium plans get a same-day onboarding visit when possible.",
          "عادةً ٢-٣ أيام عمل بعد استلام السجل التجاري وصور المعرض ونموذج مخزون. خطة Premium تحصل على زيارة في نفس اليوم.") },
    { q:t("Are there any hidden fees?","هل توجد رسوم خفية؟"),
      a:t("No. Pricing is monthly only — no listing fees, no commissions on private sales. Optional services like Concierge or delivery are quoted upfront.",
          "لا. التسعير شهري فقط — بدون عمولات. الخدمات الإضافية تُسعّر مسبقاً.") },
    { q:t("Can I cancel anytime?","هل يمكنني الإلغاء في أي وقت؟"),
      a:t("Yes. All plans are month-to-month. Cancel via your dealer dashboard and your listings stay published until the end of the billing cycle.",
          "نعم. كل الخطط شهرية. ألغِ من لوحة التحكم وتبقى إعلاناتك حتى نهاية الدورة.") },
    { q:t("Do you handle the financing for buyers?","هل تتولون تمويل المشترين؟"),
      a:t("Yes — every buyer can pre-qualify with our 5 partner banks in 6 minutes, which means faster close rates for you. You also keep your own bank relationships intact.",
          "نعم — كل مشتري يمكنه التأهل المبدئي مع ٥ بنوك خلال ٦ دقائق، مما يسرّع البيع.") },
  ];

  // ----- Submit confirmation -----
  if (submitted) {
    return (
      <div className="dr-page">
        <section className="dr-thanks">
          <div className="dr-thanks-icon"><Icon name="check-circle" size={56}/></div>
          <h1>{t("Application received","تم استلام طلبك")}</h1>
          <p>{t("Thanks for partnering with us. Our onboarding team will reach out within 1 business day to schedule your showroom visit and verification.",
                "شكراً للشراكة معنا. سيتواصل معك فريقنا خلال يوم عمل لتحديد موعد زيارة المعرض والتحقق.")}</p>
          <div className="dr-thanks-meta">
            <div><span>{t("Reference","المرجع")}</span><strong>BMC-DR-{Math.floor(Math.random()*9000+1000)}</strong></div>
            <div><span>{t("Plan","الخطة")}</span><strong>{plans.find(p=>p.id===plan).name}</strong></div>
            <div><span>{t("Expected onboarding","موعد التدريب")}</span><strong>{t("1–2 business days","١-٢ يوم عمل")}</strong></div>
          </div>
          <div className="dr-thanks-cta">
            <Button variant="primary" size="lg" onClick={()=>go({page:"home"})}>{t("Back to home","العودة للرئيسية")}</Button>
            <Button variant="secondary" size="lg" onClick={()=>{setSubmitted(false); setStep(1);}}>{t("Submit another","قدّم طلب آخر")}</Button>
          </div>
        </section>
      </div>
    );
  }

  const scrollToForm = () => document.getElementById("dr-form")?.scrollIntoView({behavior:"smooth"});

  return (
    <div className="dr-page">
      {/* ============ HERO ============ */}
      <section className="dr-hero">
        <div className="dr-hero-bg">
          <div className="dr-hero-blob dr-b1"/>
          <div className="dr-hero-blob dr-b2"/>
          <div className="dr-hero-grid-bg"/>
        </div>
        <div className="container dr-hero-inner">
          <div className="dr-hero-text">
            <div className="dr-eyebrow">
              <span className="dr-eyebrow-dot"/>
              {t("For dealerships in Kuwait","للمعارض في الكويت")}
            </div>
            <h1>
              {t("Sell more cars.","بِع المزيد من السيارات.")} <br/>
              <span className="dr-accent">{t("Grow your dealership.","نمِّ معرضك.")}</span>
            </h1>
            <p>{t("Join 250+ verified dealers on Kuwait's fastest-growing car marketplace. Free listings, real leads, and the tools to turn views into deals.",
                  "انضم لأكثر من ٢٥٠ معرضاً موثقاً على أسرع منصة سيارات نمواً في الكويت. إعلانات مجانية وعملاء حقيقيون وأدوات تحوّل المشاهدات إلى صفقات.")}</p>

            <div className="dr-hero-ctas">
              <Button variant="primary" size="lg" onClick={scrollToForm}>
                {t("Register your dealership","سجّل معرضك")}
                <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
              </Button>
              <Button variant="secondary" size="lg" onClick={()=>document.getElementById("dr-pricing")?.scrollIntoView({behavior:"smooth"})}>
                {t("See pricing","عرض الأسعار")}
              </Button>
            </div>

            <ul className="dr-hero-perks">
              <li><Icon name="check-circle" size={16}/> {t("Free to get started","ابدأ مجاناً")}</li>
              <li><Icon name="check-circle" size={16}/> {t("No commission on sales","بدون عمولة على البيع")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Cancel anytime","الإلغاء في أي وقت")}</li>
            </ul>
          </div>

          {/* Quick-register teaser card */}
          <aside className="dr-hero-card">
            <div className="dr-hero-card-head">
              <Badge variant="royal-soft" icon="sparkle">{t("Quick start","بداية سريعة")}</Badge>
              <h3>{t("Join in under 5 minutes","انضم خلال ٥ دقائق")}</h3>
              <p>{t("Tell us a bit about your dealership and we'll handle the rest.","أخبرنا عن معرضك ونتولى الباقي.")}</p>
            </div>
            <div className="dr-hero-card-stats">
              {stats.slice(0,4).map(s=>(
                <div key={s.label}>
                  <strong>{s.num}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
            <ol className="dr-hero-card-steps">
              <li><span>1</span>{t("Submit business details","قدّم تفاصيل المعرض")}</li>
              <li><span>2</span>{t("Verify CR + showroom","تحقق من السجل والمعرض")}</li>
              <li><span>3</span>{t("Upload inventory & go live","حمّل المخزون وانطلق")}</li>
            </ol>
            <Button variant="primary" size="lg" style={{width:"100%"}} onClick={scrollToForm}>
              {t("Start your application","ابدأ طلبك")}
              <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
            </Button>
            <div className="dr-hero-card-foot">
              <Icon name="shield" size={12}/>
              {t("Your data stays private. CITRA-compliant.","بياناتك خاصة. متوافق مع CITRA.")}
            </div>
          </aside>
        </div>
      </section>

      {/* ============ STATS BAND ============ */}
      <section className="dr-stats">
        <div className="container dr-stats-inner">
          {stats.map(s=>(
            <div key={s.label} className="dr-stat-cell">
              <strong>{s.num}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ BENEFITS ============ */}
      <section className="container dr-section">
        <header className="dr-section-head">
          <span className="section-eyebrow">{t("Why partner with us","لماذا تنضم إلينا")}</span>
          <h2>{t("Everything you need to sell faster","كل ما تحتاجه لبيع أسرع")}</h2>
          <p>{t("Built for the way modern dealerships work — fewer phone calls, more closed deals.","صُمّمت لطريقة عمل المعارض الحديثة — أقل اتصالات وصفقات أكثر.")}</p>
        </header>
        <div className="dr-benefits-grid">
          {benefits.map(b=>(
            <article key={b.ti} className="dr-benefit">
              <div className="dr-benefit-icon"><Icon name={b.ic} size={22}/></div>
              <h3>{b.ti}</h3>
              <p>{b.su}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="dr-how">
        <div className="container">
          <header className="dr-section-head">
            <span className="section-eyebrow">{t("How it works","كيف يعمل")}</span>
            <h2>{t("From signup to live in 3 days","من التسجيل للنشر في ٣ أيام")}</h2>
            <p>{t("Four simple steps. No paperwork stack, no salesperson chasing you.","أربع خطوات. بدون أوراق ولا متابعة بائعين.")}</p>
          </header>
          <div className="dr-how-grid">
            {steps.map((s,i)=>(
              <article key={s.num} className="dr-how-step">
                <div className="dr-how-step-num">{s.num}</div>
                <h3>{s.ti}</h3>
                <p>{s.su}</p>
                {i<steps.length-1 && <div className="dr-how-step-line" aria-hidden="true"/>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="container dr-section" id="dr-pricing">
        <header className="dr-section-head">
          <span className="section-eyebrow">{t("Plans","الخطط")}</span>
          <h2>{t("Simple pricing. No surprises.","تسعير بسيط. بدون مفاجآت.")}</h2>
          <p>{t("Start free. Upgrade when you outgrow the limits.","ابدأ مجاناً. ارتقِ عند الحاجة.")}</p>
        </header>
        <div className="dr-pricing-grid">
          {plans.map(p=>(
            <article key={p.id}
                     className={`dr-plan ${p.highlight ? "is-highlight" : ""} ${plan===p.id ? "is-selected" : ""}`}
                     onClick={()=>setPlan(p.id)}>
              {p.highlight && <div className="dr-plan-ribbon">{p.tag}</div>}
              <div className="dr-plan-head">
                <h3>{p.name}</h3>
                <div className="dr-plan-price">
                  {p.price === 0
                    ? <strong>{t("Free","مجاناً")}</strong>
                    : <><strong>{p.price}</strong><span>{p.unit}</span></>}
                </div>
                <p className="dr-plan-blurb">{p.blurb}</p>
              </div>
              <ul className="dr-plan-features">
                {p.features.map(f=><li key={f}><Icon name="check-circle" size={14}/> {f}</li>)}
                {p.limits.map(l=><li key={l} className="dr-plan-limit"><Icon name="x" size={14}/> {l}</li>)}
              </ul>
              <Button
                variant={p.highlight ? "primary" : "secondary"}
                size="md"
                style={{width:"100%"}}
                onClick={(e)=>{ e.stopPropagation(); setPlan(p.id); scrollToForm(); }}>
                {p.cta}
              </Button>
            </article>
          ))}
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="dr-testimonials">
        <div className="container">
          <header className="dr-section-head">
            <span className="section-eyebrow">{t("Dealer stories","قصص المعارض")}</span>
            <h2>{t("Trusted by Kuwait's best showrooms","موثوق به من قِبل أفضل المعارض")}</h2>
          </header>
          <div className="dr-testimonials-grid">
            {testimonials.map(t2=>(
              <article key={t2.name} className="dr-testimonial">
                <div className="dr-testimonial-gain">{t2.gain}</div>
                <div className="dr-testimonial-note">{t2.note}</div>
                <footer>
                  <div className="dr-testimonial-logo">{t2.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                  <div>
                    <strong>{t2.name}</strong>
                    <span>{t2.loc}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ REGISTRATION FORM ============ */}
      <section className="dr-form-section" id="dr-form">
        <div className="container dr-form-inner">
          <aside className="dr-form-aside">
            <Badge variant="royal-soft">{t("Application","التسجيل")}</Badge>
            <h2>{t("Register your dealership","سجّل معرضك")}</h2>
            <p>{t("Three short steps. We'll be in touch within one business day.","ثلاث خطوات قصيرة. نتواصل خلال يوم عمل واحد.")}</p>
            <ul className="dr-form-aside-list">
              <li><Icon name="check-circle" size={16}/> {t("Free to apply","التقديم مجاني")}</li>
              <li><Icon name="check-circle" size={16}/> {t("No credit-card required","بدون بطاقة ائتمان")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Onboarding in 2–3 days","التدريب خلال ٢-٣ أيام")}</li>
              <li><Icon name="check-circle" size={16}/> {t("Dedicated launch support","دعم إطلاق مخصص")}</li>
            </ul>
            <div className="dr-form-aside-contact">
              <div className="dr-form-aside-contact-head">{t("Prefer to talk first?","تفضل التواصل أولاً؟")}</div>
              <a href="tel:+96522201840"><Icon name="phone" size={14}/> +965 2220 1840</a>
              <a href="mailto:dealers@behbehani.com"><Icon name="info" size={14}/> dealers@behbehani.com</a>
            </div>
          </aside>

          <div className="dr-form-card">
            <div className="dr-form-stepper">
              {[1,2,3].map(s=>(
                <div key={s} className={`dr-form-step ${step===s ? "on" : ""} ${step>s ? "done" : ""}`}>
                  <span>{step>s ? <Icon name="check" size={12}/> : s}</span>
                  <strong>
                    {s===1 ? t("Dealership","المعرض") :
                     s===2 ? t("Inventory","المخزون") :
                             t("Plan & confirm","الخطة والتأكيد")}
                  </strong>
                </div>
              ))}
            </div>

            <div className="dr-form-body">
              {step===1 && (
                <>
                  <h3>{t("Tell us about your dealership","عرّفنا بمعرضك")}</h3>
                  <p className="dr-form-hint">{t("Required to verify your business.","مطلوب للتحقق من النشاط.")}</p>
                  <div className="dr-form-grid">
                    <label className="dr-field span-2">
                      <span>{t("Dealership name","اسم المعرض")} <em>*</em></span>
                      <input value={form.company} onChange={e=>updF("company", e.target.value)} placeholder={t("e.g. Bavaria Cars","مثلاً بافاريا كارز")}/>
                    </label>
                    <label className="dr-field">
                      <span>{t("Contact name","اسم المسؤول")} <em>*</em></span>
                      <input value={form.contact} onChange={e=>updF("contact", e.target.value)} placeholder={t("Full name","الاسم الكامل")}/>
                    </label>
                    <label className="dr-field">
                      <span>{t("Commercial Reg. (CR)","السجل التجاري")} <em>*</em></span>
                      <input value={form.crNo} onChange={e=>updF("crNo", e.target.value)} placeholder="123456"/>
                    </label>
                    <label className="dr-field">
                      <span>{t("Mobile","الهاتف")} <em>*</em></span>
                      <div className="dr-phone">
                        <span className="dr-phone-prefix">+965</span>
                        <input value={form.phone} onChange={e=>updF("phone", e.target.value)} placeholder="9999 1234"/>
                      </div>
                    </label>
                    <label className="dr-field">
                      <span>{t("Email","البريد")} <em>*</em></span>
                      <input type="email" value={form.email} onChange={e=>updF("email", e.target.value)} placeholder="contact@dealer.com"/>
                    </label>
                    <label className="dr-field span-2">
                      <span>{t("Showroom area","موقع المعرض")} <em>*</em></span>
                      <select value={form.area} onChange={e=>updF("area", e.target.value)}>
                        {["Jabriya","Salmiya","Hawalli","Farwaniya","Kuwait City","Shuwaikh","Ahmadi","Jahra"].map(a=>(
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="dr-form-foot">
                    <span/>
                    <Button variant="primary" size="md"
                            disabled={!form.company || !form.contact || !form.crNo || !form.phone || !form.email}
                            onClick={()=>setStep(2)}>
                      {t("Continue","متابعة")} <Icon name="arrow-right" size={14}/>
                    </Button>
                  </div>
                </>
              )}

              {step===2 && (
                <>
                  <h3>{t("What do you stock?","ما هو مخزونك؟")}</h3>
                  <p className="dr-form-hint">{t("Helps us tune your storefront and lead routing.","يساعدنا في ضبط واجهتك وتوجيه العملاء.")}</p>

                  <label className="dr-field">
                    <span>{t("Inventory size","حجم المخزون")}</span>
                    <div className="dr-pillgroup">
                      {[["1-20",t("1–20 cars","١-٢٠ سيارة")], ["20-50",t("20–50 cars","٢٠-٥٠")], ["50-150",t("50–150 cars","٥٠-١٥٠")], ["150+",t("150+ cars","١٥٠+")]].map(([v,l])=>(
                        <button key={v} type="button"
                                className={`dr-pill ${form.inventory===v?"on":""}`}
                                onClick={()=>updF("inventory", v)}>{l}</button>
                      ))}
                    </div>
                  </label>

                  <label className="dr-field">
                    <span>{t("Brands you carry","الماركات التي تبيعها")}</span>
                    <div className="dr-pillgroup">
                      {BRANDS.slice(0,12).map(b=>(
                        <button key={b.id} type="button"
                                className={`dr-pill ${form.brands.includes(b.id)?"on":""}`}
                                onClick={()=>toggleBrand(b.id)}>{t(b.name, b.nameAr)}</button>
                      ))}
                    </div>
                    <div className="dr-form-hint dr-form-hint-sub">
                      {form.brands.length} {t("selected","محدد")}
                    </div>
                  </label>

                  <div className="dr-form-foot">
                    <Button variant="ghost" size="md" onClick={()=>setStep(1)}>
                      <Icon name="chevron-left" size={14}/> {t("Back","عودة")}
                    </Button>
                    <Button variant="primary" size="md" onClick={()=>setStep(3)}>
                      {t("Continue","متابعة")} <Icon name="arrow-right" size={14}/>
                    </Button>
                  </div>
                </>
              )}

              {step===3 && (
                <>
                  <h3>{t("Choose your plan","اختر خطتك")}</h3>
                  <p className="dr-form-hint">{t("You can switch plans anytime from your dashboard.","يمكنك تغيير الخطة من لوحتك.")}</p>

                  <div className="dr-form-plans">
                    {plans.map(p=>(
                      <label key={p.id} className={`dr-form-plan ${plan===p.id?"on":""}`}>
                        <input type="radio" name="plan" checked={plan===p.id} onChange={()=>setPlan(p.id)}/>
                        <div className="dr-form-plan-body">
                          <div className="dr-form-plan-head">
                            <strong>{p.name}</strong>
                            <span>
                              {p.price===0 ? t("Free","مجاناً") : `${p.price} ${p.unit}`}
                            </span>
                          </div>
                          <div className="dr-form-plan-blurb">{p.blurb}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="dr-form-agree">
                    <input type="checkbox" checked={form.agree} onChange={e=>updF("agree", e.target.checked)}/>
                    <span>{t("I confirm I'm authorised to register this dealership and agree to the Terms & Privacy Policy.",
                              "أؤكد أنني مخوّل لتسجيل هذا المعرض وأوافق على الشروط وسياسة الخصوصية.")}</span>
                  </label>

                  <div className="dr-form-foot">
                    <Button variant="ghost" size="md" onClick={()=>setStep(2)}>
                      <Icon name="chevron-left" size={14}/> {t("Back","عودة")}
                    </Button>
                    <Button variant="primary" size="lg" disabled={!form.agree} onClick={submit}>
                      {t("Submit application","قدّم الطلب")} <Icon name="arrow-right" size={14}/>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="container dr-section">
        <header className="dr-section-head">
          <span className="section-eyebrow">FAQ</span>
          <h2>{t("Questions, answered","أسئلة وأجوبة")}</h2>
        </header>
        <div className="dr-faq">
          {faqs.map((f,i)=>(
            <article key={i} className={`dr-faq-item ${openFaq===i?"open":""}`}>
              <button onClick={()=>setOpenFaq(openFaq===i?-1:i)}>
                <span>{f.q}</span>
                <Icon name={openFaq===i?"chevron-down":"chevron-right"} size={18}/>
              </button>
              {openFaq===i && <div className="dr-faq-a">{f.a}</div>}
            </article>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="dr-cta">
        <div className="container dr-cta-inner">
          <div>
            <h2>{t("Ready to grow your dealership?","جاهز لتنمية معرضك؟")}</h2>
            <p>{t("Join 250+ verified dealers selling more, faster on Behbehani.","انضم لأكثر من ٢٥٠ معرضاً يبيع أكثر وأسرع.")}</p>
          </div>
          <div className="dr-cta-actions">
            <Button variant="white" size="lg" onClick={scrollToForm}>
              {t("Register now","سجّل الآن")}
              <span className="btn-arrow"><Icon name="arrow-right" size={14}/></span>
            </Button>
            <Button variant="ghost" size="lg" onClick={()=>go({page:"browse"})}>
              {t("Browse cars instead","تصفح السيارات")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

Object.assign(window, { DealerRegisterPage });
