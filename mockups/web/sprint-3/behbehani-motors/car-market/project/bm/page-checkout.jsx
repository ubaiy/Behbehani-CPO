/* eslint-disable */
// Reserve a vehicle, then the 7-step purchase wizard

const WIZ_STEPS = [
  { id:"payment",  label:"Payment method", labelAr:"طريقة الدفع",  icon:"dollar" },
  { id:"tradein",  label:"Trade-in",       labelAr:"الاستبدال",     icon:"car" },
  { id:"addons",   label:"Add-ons",        labelAr:"الإضافات",      icon:"sparkle" },
  { id:"docs",     label:"Documents",      labelAr:"المستندات",     icon:"upload" },
  { id:"contract", label:"Sign contract",  labelAr:"توقيع العقد",   icon:"doc" },
  { id:"delivery", label:"Delivery slot",  labelAr:"موعد التوصيل",  icon:"truck" },
  { id:"confirm",  label:"Confirm",        labelAr:"التأكيد",       icon:"check-circle" },
];

const ReservePage = ({locale, go, route, user, toast}) => {
  const car = CARS.find(c=>c.id===route.id) || CARS[0];
  const t = (en, ar) => locale==="ar" ? ar : en;
  const b = brandOf(car.brand);
  const [stage, setStage] = React.useState("preview"); // preview | paying | held
  const [payMethod, setPayMethod] = React.useState("knet");
  const [holdExpire, setHoldExpire] = React.useState(null);

  const reserve = () => {
    setStage("paying");
    setTimeout(()=>{
      setStage("held");
      setHoldExpire(Date.now() + 48*60*60*1000);
      toast(t("Reservation confirmed. Your KWD 100 deposit is held safely.","تم التأكيد. تم تجميد المبلغ بأمان."), "success");
    }, 1400);
  };

  return (
    <div className="container reserve-page">
      <div className="reserve-grid">
        <main>
          <button className="link-back" onClick={()=>go({page:"vdp", id:car.id})}>
            <Icon name="chevron-left" size={14}/> {t("Back to car","عودة للسيارة")}
          </button>

          {stage==="preview" && (
            <>
              <h1>{t("Reserve this car for 48 hours","احجز هذه السيارة لـ ٤٨ ساعة")}</h1>
              <p className="reserve-lede">{t("A KWD 100 refundable deposit holds the car off the market while you finalize financing, insurance and delivery — or just decide.",
                "وديعة ١٠٠ د.ك قابلة للاسترداد تحجز السيارة لك أثناء إنهاء التمويل والتأمين والتوصيل.")}</p>

              <section className="reserve-block">
                <h3>{t("What happens after I reserve?","ماذا يحدث بعد الحجز؟")}</h3>
                <ol className="reserve-flow">
                  <li><span>1</span><div><strong>{t("Pay KWD 100 deposit","ادفع ١٠٠ د.ك")}</strong><p>{t("Via KNET or card. Fully refundable.","عبر كي نت أو البطاقة. قابل للاسترداد.")}</p></div></li>
                  <li><span>2</span><div><strong>{t("Car is held for you","نحجز السيارة لك")}</strong><p>{t("48-hour exclusive hold. Other buyers cannot reserve.","حجز حصري لـ ٤٨ ساعة.")}</p></div></li>
                  <li><span>3</span><div><strong>{t("Complete in 7 quick steps","أكمل خلال ٧ خطوات")}</strong><p>{t("Finance, insurance, contract, delivery — all online.","التمويل، التأمين، العقد، التوصيل — كله أونلاين.")}</p></div></li>
                  <li><span>4</span><div><strong>{t("We deliver to your door","نوصلها لباب بيتك")}</strong><p>{t("Track the driver. Inspect on arrival. 3-day return.","تتبع السائق. تفحص عند الوصول. إرجاع ٣ أيام.")}</p></div></li>
                </ol>
              </section>

              <section className="reserve-block">
                <h3>{t("Pay deposit","ادفع الوديعة")}</h3>
                <div className="pay-methods">
                  <label className={`pay-method ${payMethod==="knet"?"on":""}`}>
                    <input type="radio" name="pay" checked={payMethod==="knet"} onChange={()=>setPayMethod("knet")}/>
                    <div className="pay-method-logo knet">KNET</div>
                    <div>
                      <strong>K-Net</strong>
                      <p>{t("Kuwait's national debit network","شبكة الكويت الوطنية")}</p>
                    </div>
                    <Icon name="check-circle" size={20} color="var(--royal)"/>
                  </label>
                  <label className={`pay-method ${payMethod==="card"?"on":""}`}>
                    <input type="radio" name="pay" checked={payMethod==="card"} onChange={()=>setPayMethod("card")}/>
                    <div className="pay-method-logo">VISA<br/>MC</div>
                    <div>
                      <strong>{t("Credit / debit card","بطاقة ائتمان")}</strong>
                      <p>{t("Visa, Mastercard accepted","فيزا وماستركارد")}</p>
                    </div>
                    <Icon name="check-circle" size={20} color="var(--royal)"/>
                  </label>
                </div>
              </section>

              <section className="reserve-block reserve-tos">
                <label>
                  <input type="checkbox" defaultChecked/>
                  <span>{t("I agree to the","أوافق على ")} <a href="#">{t("Reservation Terms","شروط الحجز")}</a> {t("and understand the deposit is fully refundable for 48 hours.","وأن الوديعة قابلة للاسترداد لمدة ٤٨ ساعة.")}</span>
                </label>
              </section>

              <Button variant="primary" size="lg" onClick={reserve} style={{width:"100%"}}>
                <Icon name="shield" size={18}/> {t("Pay KWD 100 and reserve","ادفع ١٠٠ د.ك واحجز")}
              </Button>
            </>
          )}

          {stage==="paying" && (
            <div className="reserve-paying">
              <div className="spinner"/>
              <h2>{t("Processing your deposit…","جاري معالجة الوديعة…")}</h2>
              <p>{t("Connecting to KNET secure gateway. Please don't refresh.","جاري الاتصال ببوابة كي نت الآمنة.")}</p>
            </div>
          )}

          {stage==="held" && (
            <div className="reserve-held">
              <div className="reserve-held-icon"><Icon name="check-circle" size={42} color="#fff"/></div>
              <h1>{t("Reserved! 🎉","تم الحجز! 🎉")}</h1>
              <p className="reserve-lede">{t("This car is now held exclusively for you. Complete the 7 steps below to take delivery.","هذه السيارة محجوزة لك حصرياً. أكمل الخطوات السبع أدناه.")}</p>
              <HoldTimer expireAt={holdExpire} locale={locale}/>
              <Button variant="primary" size="lg" style={{width:"100%", marginTop:24}}
                      onClick={()=>go({page:"checkout", id:car.id, step:0})} iconRight="arrow-right">
                {t("Start 7-step checkout","ابدأ ٧ خطوات الشراء")}
              </Button>
              <Button variant="ghost" style={{width:"100%", marginTop:8}}
                      onClick={()=>go({page:"account", tab:"orders"})}>
                {t("Save for later — go to my account","احفظ للاحقاً")}
              </Button>
            </div>
          )}
        </main>

        <aside className="reserve-side">
          <div className="reserve-car-card">
            <CarImage car={car} className="reserve-car-img"/>
            <div className="reserve-car-body">
              <div className="reserve-car-brand">{t(b.name,b.nameAr)} · {car.year}</div>
              <h3>{car.model}</h3>
              <div className="reserve-car-specs">
                <span><Icon name="gauge" size={12}/> {fmtKM(car.mileage,locale)}</span>
                <span><Icon name="fuel" size={12}/> {car.fuel}</span>
              </div>
              <hr/>
              <div className="reserve-row"><span>{t("Vehicle price","سعر السيارة")}</span><strong>{fmtKWD(car.price,locale)}</strong></div>
              <div className="reserve-row"><span>{t("Reservation deposit","وديعة الحجز")}</span><strong>KWD 100</strong></div>
              <div className="reserve-row reserve-row-refund"><span><Icon name="info" size={12}/> {t("Refundable","قابلة للاسترداد")}</span><strong style={{color:"#16a34a"}}>{t("Yes","نعم")}</strong></div>
              <hr/>
              <div className="reserve-row reserve-row-total"><span>{t("Due now","المستحق الآن")}</span><strong>KWD 100</strong></div>
              <div className="reserve-trust-list">
                <div><Icon name="shield" size={14} color="var(--royal)"/> {t("71-pt inspected","فحص ٧١ نقطة")}</div>
                <div><Icon name="return" size={14} color="var(--royal)"/> {t("3-day money-back return","إرجاع ٣ أيام")}</div>
                <div><Icon name="truck" size={14} color="var(--royal)"/> {t("Free Kuwait-wide delivery","توصيل مجاني")}</div>
                <div><Icon name="clock" size={14} color="var(--royal)"/> {t("48-hour hold","حجز ٤٨ ساعة")}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const HoldTimer = ({expireAt, locale}) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  },[]);
  const t = (en, ar) => locale==="ar" ? ar : en;
  if (!expireAt) return null;
  const remaining = Math.max(0, expireAt - now);
  const h = Math.floor(remaining/3600000);
  const m = Math.floor((remaining%3600000)/60000);
  const s = Math.floor((remaining%60000)/1000);
  return (
    <div className="hold-timer">
      <Icon name="clock" size={18}/>
      <div>
        <div className="hold-timer-label">{t("Hold expires in","ينتهي الحجز خلال")}</div>
        <div className="hold-timer-val">{h}h {String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s</div>
      </div>
    </div>
  );
};

// ---------- Checkout wizard ----------
const CheckoutPage = ({locale, go, route, user, toast}) => {
  const car = CARS.find(c=>c.id===route.id) || CARS[0];
  const t = (en, ar) => locale==="ar" ? ar : en;
  const b = brandOf(car.brand);
  const [step, setStep] = React.useState(route.step || 0);

  // wizard state
  const [data, setData] = React.useState({
    paymentMode:"finance",     // cash | finance
    bankId:"abk",
    down:20, tenure:60,
    hasTradeIn:false, tradeIn:{brand:"", model:"", year:""},
    addOns:new Set(["warranty"]),
    docs:{civilId:false, salary:false, passport:false},
    contractSigned:false,
    deliveryDate:"2026-05-20",
    deliveryTime:"morning",
    address:"Hawalli, Block 3, Street 12, House 45",
  });

  const next = () => setStep(s=>Math.min(WIZ_STEPS.length-1, s+1));
  const prev = () => setStep(s=>Math.max(0, s-1));

  return (
    <div className="checkout-wrap">
      <div className="container">
        <button className="link-back" onClick={()=>go({page:"vdp", id:car.id})}>
          <Icon name="chevron-left" size={14}/> {t("Back","عودة")}
        </button>
        <h1 className="checkout-title">{t("Complete your purchase","أكمل عملية الشراء")}</h1>

        <div className="checkout-stepper">
          {WIZ_STEPS.map((s,i)=>(
            <React.Fragment key={s.id}>
              <button className={`stepper-step ${i===step?"on":""} ${i<step?"done":""}`} onClick={()=>setStep(i)}>
                <span className="stepper-num">{i<step?<Icon name="check" size={14}/>:i+1}</span>
                <span className="stepper-label">{t(s.label, s.labelAr)}</span>
              </button>
              {i<WIZ_STEPS.length-1 && <div className={`stepper-line ${i<step?"done":""}`}/>}
            </React.Fragment>
          ))}
        </div>

        <div className="checkout-body">
          <main className="checkout-main">
            {step===0 && <StepPayment data={data} setData={setData} car={car} locale={locale}/>}
            {step===1 && <StepTradeIn  data={data} setData={setData} car={car} locale={locale}/>}
            {step===2 && <StepAddOns   data={data} setData={setData} car={car} locale={locale}/>}
            {step===3 && <StepDocs     data={data} setData={setData} car={car} locale={locale} toast={toast}/>}
            {step===4 && <StepContract data={data} setData={setData} car={car} locale={locale}/>}
            {step===5 && <StepDelivery data={data} setData={setData} car={car} locale={locale}/>}
            {step===6 && <StepConfirm  data={data} setData={setData} car={car} locale={locale} go={go} toast={toast}/>}

            {step<6 && (
              <div className="checkout-nav">
                <Button variant="ghost" onClick={prev} disabled={step===0} icon="chevron-left">
                  {t("Back","السابق")}
                </Button>
                <Button variant="primary" size="lg" onClick={next} iconRight="arrow-right">
                  {step===5 ? t("Review order","مراجعة الطلب") : t("Continue","متابعة")}
                </Button>
              </div>
            )}
          </main>

          <aside className="checkout-summary">
            <h3>{t("Order summary","ملخص الطلب")}</h3>
            <div className="checkout-summary-car">
              <CarImage car={car}/>
              <div>
                <div className="cs-meta">{t(b.name,b.nameAr)} · {car.year}</div>
                <strong>{car.model}</strong>
                <div className="cs-meta">{fmtKM(car.mileage,locale)} · {car.fuel}</div>
              </div>
            </div>
            <hr/>
            <CSRow label={t("Vehicle","السيارة")} value={fmtKWD(car.price,locale)}/>
            {data.hasTradeIn && <CSRow label={t("Trade-in credit","الاستبدال")} value={`- ${fmtKWD(2200,locale)}`} good/>}
            {[...data.addOns].map(a=>(
              <CSRow key={a} label={addOnLabel(a, locale)} value={fmtKWD(addOnPrice(a),locale)}/>
            ))}
            <CSRow label={t("Insurance (comprehensive)","التأمين الشامل")} value={fmtKWD(420,locale)}/>
            <CSRow label={t("Delivery","التوصيل")} value={t("Free","مجاني")} good/>
            <hr/>
            {data.paymentMode==="cash" ? (
              <CSRow label={<strong>{t("Total","الإجمالي")}</strong>} value={<strong>{fmtKWD(car.price + 420 + [...data.addOns].reduce((s,a)=>s+addOnPrice(a),0) - (data.hasTradeIn?2200:0), locale)}</strong>} big/>
            ) : (
              <>
                <CSRow label={t("Down payment","الدفعة المقدمة")} value={fmtKWD(Math.round(car.price * data.down/100),locale)}/>
                <CSRow label={t("Monthly","الشهري")} value={<strong>{fmtKWD(car.monthly,locale)}/{t("mo","شهر")}</strong>} big/>
              </>
            )}
            <div className="checkout-summary-hold">
              <Icon name="clock" size={14}/>
              <div>{t("Your reservation is held","حجزك ساري")}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const CSRow = ({label, value, good, big}) => (
  <div className={`cs-row ${big?"big":""}`}>
    <span>{label}</span>
    <span style={{color:good?"#16a34a":""}}>{value}</span>
  </div>
);

const addOnPrice = (a) => ({warranty:280, paintProtection:350, ceramic:480, gap:120, tint:180}[a] || 0);
const addOnLabel = (a, locale) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return {
    warranty: t("Extended warranty (12 mo)","ضمان ممتد ١٢ شهر"),
    paintProtection: t("Paint protection film","حماية الطلاء"),
    ceramic: t("Ceramic coating","طلاء سيراميك"),
    gap: t("GAP insurance","تأمين GAP"),
    tint: t("Window tinting","تظليل النوافذ"),
  }[a] || a;
};

// ---------- Step 1: Payment ----------
const StepPayment = ({data, setData, car, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <section className="step-card">
      <h2>{t("How will you pay?","كيف ستدفع؟")}</h2>
      <p className="step-lede">{t("Pay cash and own the car outright, or finance with a partner bank.","ادفع نقداً وامتلك السيارة فوراً، أو موّلها مع بنك شريك.")}</p>

      <div className="pay-mode">
        <label className={`pay-mode-opt ${data.paymentMode==="cash"?"on":""}`}>
          <input type="radio" checked={data.paymentMode==="cash"} onChange={()=>setData({...data, paymentMode:"cash"})}/>
          <Icon name="dollar" size={28} color={data.paymentMode==="cash"?"var(--royal)":"var(--muted)"}/>
          <h4>{t("Pay in full","دفع كامل")}</h4>
          <p>{t("Bank transfer or KNET. Take ownership immediately.","تحويل بنكي أو كي نت. ملكية فورية.")}</p>
        </label>
        <label className={`pay-mode-opt ${data.paymentMode==="finance"?"on":""}`}>
          <input type="radio" checked={data.paymentMode==="finance"} onChange={()=>setData({...data, paymentMode:"finance"})}/>
          <Icon name="calc" size={28} color={data.paymentMode==="finance"?"var(--royal)":"var(--muted)"}/>
          <h4>{t("Finance","تمويل")}</h4>
          <p>{t("Side-by-side bank offers. Pre-qualify in minutes.","عروض بنوك متعددة. تأهل خلال دقائق.")}</p>
        </label>
      </div>

      {data.paymentMode==="finance" && (
        <>
          <h3 style={{marginTop:24}}>{t("Choose your bank","اختر البنك")}</h3>
          <div className="bank-cards">
            {PARTNER_BANKS.map(bnk=>{
              const principal = car.price * (1 - data.down/100);
              const r = bnk.apr/100/12;
              const monthly = principal * r / (1 - Math.pow(1+r, -data.tenure));
              return (
                <label key={bnk.id} className={`bank-card ${data.bankId===bnk.id?"on":""}`}>
                  <input type="radio" checked={data.bankId===bnk.id} onChange={()=>setData({...data, bankId:bnk.id})}/>
                  <div className="bank-card-head">
                    <div className="bank-card-logo">{bnk.short}</div>
                    {bnk.recommended && <Badge variant="royal">{t("Recommended","موصى به")}</Badge>}
                  </div>
                  <h4>{bnk.name}</h4>
                  <div className="bank-card-rows">
                    <div><span>{t("APR","الفائدة")}</span><strong>{bnk.apr}%</strong></div>
                    <div><span>{t("Monthly","الشهري")}</span><strong>{fmtKWD(Math.round(monthly),locale)}</strong></div>
                    <div><span>{t("Fee","الرسوم")}</span><strong>KWD {bnk.fee}</strong></div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="finance-sliders">
            <div className="finance-slider">
              <label>{t("Down payment","الدفعة المقدمة")} <strong>{data.down}% ({fmtKWD(Math.round(car.price * data.down/100), locale)})</strong></label>
              <input type="range" min="0" max="60" step="5" value={data.down} onChange={e=>setData({...data, down:+e.target.value})}/>
            </div>
            <div className="finance-slider">
              <label>{t("Tenure","المدة")} <strong>{data.tenure} {t("months","شهر")}</strong></label>
              <input type="range" min="12" max="84" step="6" value={data.tenure} onChange={e=>setData({...data, tenure:+e.target.value})}/>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

// ---------- Step 2: Trade-in ----------
const StepTradeIn = ({data, setData, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  return (
    <section className="step-card">
      <h2>{t("Trading in another car?","عندك سيارة للاستبدال؟")}</h2>
      <p className="step-lede">{t("Get an instant valuation. We deduct the offer from your purchase. Optional.","احصل على تقييم فوري. نخصمه من سعر الشراء. اختياري.")}</p>

      <div className="tradein-mode">
        <label className={!data.hasTradeIn?"on":""}>
          <input type="radio" checked={!data.hasTradeIn} onChange={()=>setData({...data, hasTradeIn:false})}/>
          {t("No trade-in","بدون استبدال")}
        </label>
        <label className={data.hasTradeIn?"on":""}>
          <input type="radio" checked={data.hasTradeIn} onChange={()=>setData({...data, hasTradeIn:true})}/>
          {t("Yes, trade in my car","نعم، استبدل سيارتي")}
        </label>
      </div>

      {data.hasTradeIn && (
        <div className="tradein-form">
          <label className="field">
            <span>{t("Brand","الماركة")}</span>
            <select value={data.tradeIn.brand} onChange={e=>setData({...data, tradeIn:{...data.tradeIn, brand:e.target.value}})}>
              <option value="">{t("Select brand","اختر الماركة")}</option>
              {BRANDS.map(b=><option key={b.id} value={b.id}>{t(b.name,b.nameAr)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t("Model","الموديل")}</span>
            <input value={data.tradeIn.model} onChange={e=>setData({...data, tradeIn:{...data.tradeIn, model:e.target.value}})}
                   placeholder={t("e.g. Corolla","مثل: كورولا")}/>
          </label>
          <label className="field">
            <span>{t("Year","السنة")}</span>
            <input value={data.tradeIn.year} onChange={e=>setData({...data, tradeIn:{...data.tradeIn, year:e.target.value}})}
                   placeholder="2019"/>
          </label>
          <label className="field">
            <span>{t("Mileage (km)","الممشى")}</span>
            <input placeholder="65,000"/>
          </label>

          {data.tradeIn.brand && data.tradeIn.year && (
            <div className="tradein-offer">
              <div>
                <div className="tradein-offer-label">{t("Indicative offer","عرض تقديري")}</div>
                <div className="tradein-offer-amt">{fmtKWD(2200,locale)} – {fmtKWD(2600,locale)}</div>
                <div className="tradein-offer-note">{t("Final offer after on-site inspection (free, ~30 min)","العرض النهائي بعد الفحص المجاني")}</div>
              </div>
              <Button variant="secondary"><Icon name="camera" size={14}/> {t("Add photos for accurate offer","أضف صوراً")}</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ---------- Step 3: Add-ons ----------
const StepAddOns = ({data, setData, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const addOns = [
    { id:"warranty",        title:t("Extended warranty","ضمان ممتد"),         sub:t("12 months mechanical + electrical","١٢ شهر ميكانيكي وكهربائي"), price:280, icon:"shield" },
    { id:"paintProtection", title:t("Paint protection film","حماية الطلاء"),   sub:t("PPF on hood + front bumper","فلم حماية للكبوت والصدام"), price:350, icon:"sparkle" },
    { id:"ceramic",         title:t("Ceramic coating","طلاء سيراميك"),         sub:t("9H, 5-year warranty","٩H ضمان ٥ سنوات"), price:480, icon:"sparkle" },
    { id:"gap",             title:t("GAP insurance","تأمين GAP"),              sub:t("Covers gap between loan & insurance","تأمين الفرق بين القرض والتأمين"), price:120, icon:"shield" },
    { id:"tint",            title:t("Window tinting","تظليل النوافذ"),         sub:t("Premium ceramic tint, full","تظليل سيراميك كامل"), price:180, icon:"car" },
  ];
  const toggle = (id) => {
    const s = new Set(data.addOns);
    s.has(id) ? s.delete(id) : s.add(id);
    setData({...data, addOns:s});
  };
  return (
    <section className="step-card">
      <h2>{t("Add ons for your peace of mind","إضافات لراحة بالك")}</h2>
      <p className="step-lede">{t("All optional. Cancel within 7 days if you change your mind.","كلها اختيارية. يمكن الإلغاء خلال ٧ أيام.")}</p>
      <div className="addon-list">
        {addOns.map(a=>(
          <label key={a.id} className={`addon ${data.addOns.has(a.id)?"on":""}`}>
            <input type="checkbox" checked={data.addOns.has(a.id)} onChange={()=>toggle(a.id)}/>
            <div className="addon-icon"><Icon name={a.icon} size={22}/></div>
            <div className="addon-body">
              <h4>{a.title}</h4>
              <p>{a.sub}</p>
            </div>
            <div className="addon-price">{fmtKWD(a.price,locale)}</div>
          </label>
        ))}
      </div>
    </section>
  );
};

// ---------- Step 4: Documents ----------
const StepDocs = ({data, setData, locale, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const docs = [
    { id:"civilId",  title:t("Civil ID (both sides)","البطاقة المدنية"),         req:true,  hint:t("PDF or photo","PDF أو صورة") },
    { id:"salary",   title:t("Salary certificate","شهادة راتب"),                 req:data.paymentMode==="finance", hint:t("Last 3 months","آخر ٣ أشهر") },
    { id:"passport", title:t("Passport (expats only)","جواز السفر (للمقيمين)"), req:false, hint:t("Including residence","مع الإقامة") },
  ];
  const upload = (id) => {
    setData({...data, docs:{...data.docs, [id]:true}});
    toast(t("Document uploaded","تم رفع المستند"), "success");
  };
  return (
    <section className="step-card">
      <h2>{t("Upload your documents","ارفع مستنداتك")}</h2>
      <p className="step-lede">{t("Encrypted at rest. Accessible only to your finance officer. Deleted after 30 days if not used.","مشفرة. يصل إليها مسؤول التمويل فقط. تُحذف خلال ٣٠ يوم.")}</p>

      <div className="doc-list">
        {docs.map(d=>(
          <div key={d.id} className={`doc-row ${data.docs[d.id]?"done":""}`}>
            <Icon name={data.docs[d.id]?"check-circle":"doc"} size={22} color={data.docs[d.id]?"#16a34a":"var(--muted)"}/>
            <div>
              <strong>{d.title} {d.req && <span style={{color:"#dc2626"}}>*</span>}</strong>
              <p>{d.hint}</p>
            </div>
            <Button variant={data.docs[d.id]?"ghost":"secondary"} onClick={()=>upload(d.id)}>
              <Icon name="upload" size={14}/>
              {data.docs[d.id] ? t("Replace","تغيير") : t("Upload","ارفع")}
            </Button>
          </div>
        ))}
      </div>

      <div className="doc-security">
        <Icon name="shield" size={16} color="var(--royal)"/>
        <div>
          <strong>{t("Your data is protected.","بياناتك محمية.")}</strong>
          <p>{t("256-bit encryption. CITRA-compliant. Audit logged.","تشفير ٢٥٦ بت. متوافق مع CITRA. سجل كامل.")}</p>
        </div>
      </div>
    </section>
  );
};

// ---------- Step 5: Contract ----------
const StepContract = ({data, setData, car, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const [reading, setReading] = React.useState(false);
  return (
    <section className="step-card">
      <h2>{t("Sign your sale contract","وقّع عقد البيع")}</h2>
      <p className="step-lede">{t("E-signature via secure provider. Tamper-evident audit trail. Compliant with Kuwait e-signature law.","توقيع إلكتروني آمن. سجل تدقيق محفوظ. متوافق مع القانون.")}</p>

      <div className="contract-doc">
        <div className="contract-doc-icon"><Icon name="doc" size={28}/></div>
        <div>
          <h4>{t("Vehicle Sale Agreement","عقد بيع المركبة")} — {car.id}</h4>
          <p>{t("12 pages · ","١٢ صفحة · ")}{t("EN + AR","عربي وإنجليزي")} · CBK compliant</p>
        </div>
        <Button variant="secondary" onClick={()=>setReading(true)}>
          <Icon name="doc" size={14}/> {t("Preview","معاينة")}
        </Button>
      </div>

      <div className="contract-summary">
        <h4>{t("Key terms","الشروط الرئيسية")}</h4>
        <ul>
          <li><strong>{t("Vehicle:","السيارة:")}</strong> {car.year} {brandOf(car.brand).name} {car.model} (VIN ••••••{car.id.slice(-6)})</li>
          <li><strong>{t("Purchase price:","سعر الشراء:")}</strong> {fmtKWD(car.price,locale)}</li>
          <li><strong>{t("Payment method:","طريقة الدفع:")}</strong> {data.paymentMode==="cash"?t("Cash","نقداً"):t("Financed via ","ممول عبر ")+PARTNER_BANKS.find(b=>b.id===data.bankId).name}</li>
          <li><strong>{t("Return window:","فترة الإرجاع:")}</strong> 3 {t("days","أيام")} / 300 km</li>
          <li><strong>{t("Warranty:","الضمان:")}</strong> {t("90-day mechanical","ضمان ميكانيكي ٩٠ يوم")} {data.addOns.has("warranty") && t("+ Extended 12-month","+ ممتد ١٢ شهر")}</li>
        </ul>
      </div>

      <div className="signature-pad">
        <label>{t("Draw your signature below","ارسم توقيعك أدناه")}</label>
        <SignaturePad/>
        <label className="contract-confirm">
          <input type="checkbox" checked={data.contractSigned} onChange={e=>setData({...data, contractSigned:e.target.checked})}/>
          <span>{t("I have read and agree to the Vehicle Sale Agreement, the Reservation Terms, and the Return Policy.","أقرّ بقراءة العقد والموافقة على الشروط وسياسة الإرجاع.")}</span>
        </label>
      </div>
    </section>
  );
};

const SignaturePad = () => {
  const ref = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  React.useEffect(()=>{
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2.5; ctx.strokeStyle = "var(--royal)"; ctx.lineCap = "round";
  },[]);
  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    const y = (e.touches?e.touches[0].clientY:e.clientY) - r.top;
    return [x,y];
  };
  const start = (e) => {
    setDrawing(true);
    const ctx = ref.current.getContext("2d");
    const [x,y] = pos(e);
    ctx.beginPath(); ctx.moveTo(x,y);
  };
  const move = (e) => {
    if (!drawing) return;
    const ctx = ref.current.getContext("2d");
    const [x,y] = pos(e);
    ctx.lineTo(x,y); ctx.stroke();
  };
  const clear = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0,0,c.width,c.height);
  };
  return (
    <div className="sig-wrap">
      <canvas ref={ref} width={560} height={140}
              onMouseDown={start} onMouseMove={move} onMouseUp={()=>setDrawing(false)} onMouseLeave={()=>setDrawing(false)}
              onTouchStart={start} onTouchMove={move} onTouchEnd={()=>setDrawing(false)}/>
      <button className="sig-clear" onClick={clear}>Clear</button>
    </div>
  );
};

// ---------- Step 6: Delivery ----------
const StepDelivery = ({data, setData, locale}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const slots = [
    { date:"2026-05-19", day:t("Tomorrow","غداً"),     dayName:"Tue" },
    { date:"2026-05-20", day:t("Wed","الأربعاء"),       dayName:"Wed" },
    { date:"2026-05-21", day:t("Thu","الخميس"),         dayName:"Thu" },
    { date:"2026-05-22", day:t("Fri","الجمعة"),         dayName:"Fri" },
    { date:"2026-05-23", day:t("Sat","السبت"),          dayName:"Sat" },
  ];
  return (
    <section className="step-card">
      <h2>{t("Pick your delivery slot","اختر موعد التوصيل")}</h2>
      <p className="step-lede">{t("Free delivery across Kuwait. We'll send the driver's live location 30 minutes before arrival.","توصيل مجاني في كل الكويت. سترى موقع السائق ٣٠ دقيقة قبل الوصول.")}</p>

      <h4>{t("Delivery address","عنوان التوصيل")}</h4>
      <textarea value={data.address} onChange={e=>setData({...data, address:e.target.value})} rows={2}/>

      <h4 style={{marginTop:20}}>{t("Choose a day","اختر اليوم")}</h4>
      <div className="slot-days">
        {slots.map(s=>(
          <button key={s.date}
                  className={`slot-day ${data.deliveryDate===s.date?"on":""}`}
                  onClick={()=>setData({...data, deliveryDate:s.date})}>
            <div className="slot-day-name">{s.day}</div>
            <div className="slot-day-date">{s.date.slice(8)} {t("May","مايو")}</div>
          </button>
        ))}
      </div>

      <h4 style={{marginTop:20}}>{t("Choose a time","اختر الوقت")}</h4>
      <div className="slot-times">
        {[
          {id:"morning",   label:t("Morning · 9 AM – 12 PM","صباحاً ٩ – ١٢")},
          {id:"afternoon", label:t("Afternoon · 1 – 4 PM","ظهراً ١ – ٤")},
          {id:"evening",   label:t("Evening · 5 – 8 PM","مساءً ٥ – ٨")},
        ].map(s=>(
          <button key={s.id}
                  className={`slot-time ${data.deliveryTime===s.id?"on":""}`}
                  onClick={()=>setData({...data, deliveryTime:s.id})}>
            <Icon name="clock" size={16}/>
            {s.label}
          </button>
        ))}
      </div>

      <div className="delivery-info">
        <Icon name="truck" size={20} color="var(--royal)"/>
        <div>
          <strong>{t("What to expect on the day","ما تتوقعه يوم التوصيل")}</strong>
          <ul>
            <li>{t("Live GPS tracking from our depot to your door","تتبع مباشر من المستودع لباب البيت")}</li>
            <li>{t("Digital handover checklist with our driver","قائمة تسليم رقمية مع السائق")}</li>
            <li>{t("Final inspection before you sign","فحص نهائي قبل التوقيع")}</li>
            <li>{t("3-day money-back window starts on delivery","تبدأ فترة الإرجاع من يوم التسليم")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

// ---------- Step 7: Confirm ----------
const StepConfirm = ({data, setData, car, locale, go, toast}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const place = () => {
    toast(t("Order placed! Confirmation sent via SMS and email.","تم الطلب! وصلتك رسالة وبريد."), "success");
    setTimeout(()=>go({page:"account", tab:"orders"}), 1200);
  };
  return (
    <section className="step-card">
      <h2>{t("Review and confirm","المراجعة والتأكيد")}</h2>
      <p className="step-lede">{t("One last look. Once you confirm, the car is yours.","نظرة أخيرة. عند التأكيد، السيارة لك.")}</p>

      <div className="confirm-section">
        <h4>{t("Payment","الدفع")}</h4>
        <p>{data.paymentMode==="cash" ? t("Pay in full via bank transfer or KNET","دفع كامل") : t("Financed via ","ممول عبر ")+PARTNER_BANKS.find(b=>b.id===data.bankId).name+` · ${data.tenure} ${t("months","شهر")} · ${data.down}% ${t("down","مقدم")}`}</p>
      </div>
      {data.hasTradeIn && (
        <div className="confirm-section">
          <h4>{t("Trade-in","الاستبدال")}</h4>
          <p>{data.tradeIn.year} {brandOf(data.tradeIn.brand).name} {data.tradeIn.model} — {t("Estimated","تقدير")} {fmtKWD(2200,locale)} – {fmtKWD(2600,locale)} {t("after inspection","بعد الفحص")}</p>
        </div>
      )}
      <div className="confirm-section">
        <h4>{t("Add-ons","الإضافات")}</h4>
        <p>{[...data.addOns].length===0 ? t("None","لا شيء") : [...data.addOns].map(a=>addOnLabel(a,locale)).join(" · ")}</p>
      </div>
      <div className="confirm-section">
        <h4>{t("Delivery","التوصيل")}</h4>
        <p>{data.deliveryDate} · {data.deliveryTime} · {data.address}</p>
      </div>

      <Button variant="primary" size="lg" onClick={place} style={{width:"100%", marginTop:24}}>
        <Icon name="check-circle" size={18}/> {t("Confirm and place order","أكد الطلب")}
      </Button>
    </section>
  );
};

Object.assign(window, { ReservePage, CheckoutPage });
