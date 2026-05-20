/* eslint-disable */
// Reserve + 7-step purchase wizard

const STEPS = [
  { id:1, key:"payment",  label:"Payment method",   labelAr:"الدفع" },
  { id:2, key:"tradein",  label:"Trade-in",         labelAr:"الاستبدال" },
  { id:3, key:"addons",   label:"Add-ons",          labelAr:"الإضافات" },
  { id:4, key:"docs",     label:"Documents",        labelAr:"المستندات" },
  { id:5, key:"contract", label:"Contract",         labelAr:"العقد" },
  { id:6, key:"delivery", label:"Delivery slot",    labelAr:"التوصيل" },
  { id:7, key:"confirm",  label:"Confirmation",     labelAr:"التأكيد" },
];

const ReservePage = ({locale, go, route, user, onSignIn, toast}) => {
  const car = CARS.find(c=>c.id===route.id) || CARS[0];
  const t = (en, ar) => locale==="ar" ? ar : en;
  const b = brandOf(car.brand);
  const [step, setStep] = React.useState(0); // 0 = deposit screen
  // Wizard state
  const [payment, setPayment] = React.useState("cash");
  const [tradeIn, setTradeIn] = React.useState(false);
  const [addons, setAddons] = React.useState({warranty:true, gap:false, ceramic:false, tint:false});
  const [docsUp, setDocsUp] = React.useState({civilid:true, salary:false, statement:false});
  const [signed, setSigned] = React.useState(false);
  const [slot, setSlot] = React.useState({date:"Sat, 2 Nov", time:"10:00 – 12:00"});

  const addonsTotal =
    (addons.warranty?250:0) + (addons.gap?180:0) + (addons.ceramic?320:0) + (addons.tint?90:0);
  const tradeInValue = tradeIn ? 2800 : 0;
  const total = car.price + addonsTotal - tradeInValue;

  // Hold timer
  const [holdLeft, setHoldLeft] = React.useState(48*60*60 - 47); // 48h - 47s
  React.useEffect(()=>{
    const id = setInterval(()=>setHoldLeft(s=>Math.max(0, s-1)), 1000);
    return ()=>clearInterval(id);
  },[]);
  const hr = String(Math.floor(holdLeft/3600)).padStart(2,"0");
  const mn = String(Math.floor((holdLeft%3600)/60)).padStart(2,"0");
  const sc = String(holdLeft%60).padStart(2,"0");

  // Deposit screen (step 0)
  if (step===0) {
    return (
      <div className="container reserve-deposit">
        <button className="reserve-back" onClick={()=>go({page:"vdp", id:car.id})}>
          <Icon name="chevron-left" size={16}/> {t("Back to car","العودة للسيارة")}
        </button>

        <div className="reserve-deposit-grid">
          <main>
            <Badge variant="royal">{t("Step 1 of 2: Reserve","الخطوة ١ من ٢: الحجز")}</Badge>
            <h1>{t("Reserve this car for KWD 100","احجز هذه السيارة بـ ١٠٠ د.ك")}</h1>
            <p className="reserve-deposit-sub">
              {t("We'll hold it for 48 hours while you complete your purchase. Fully refundable if you change your mind.",
                 "سنحجزها لك ٤٨ ساعة لإكمال الشراء. قابل للاسترداد بالكامل إذا غيّرت رأيك.")}
            </p>

            <div className="reserve-deposit-features">
              {[
                ["clock",   t("48-hour exclusive hold","حجز ٤٨ ساعة حصرياً"), t("Car is removed from sale during your hold","تُحجب السيارة من البيع خلال فترة الحجز")],
                ["return",  t("Fully refundable","قابل للاسترداد"),          t("Get all KWD 100 back if you cancel","استرد كامل المبلغ عند الإلغاء")],
                ["shield",  t("Locked-in price","سعر مثبت"),                 t("Price won't change while reserved","لن يتغير السعر أثناء الحجز")],
                ["check-circle", t("Applies to final price","يخصم من السعر النهائي"), t("KWD 100 deducted from your total","يُخصم من الإجمالي")],
              ].map(([ic,ti,su])=>(
                <div key={ti} className="reserve-feature">
                  <div className="reserve-feature-icon"><Icon name={ic} size={20}/></div>
                  <div>
                    <h4>{ti}</h4>
                    <p>{su}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="reserve-payment">
              <h3>{t("Pay refundable deposit","ادفع المقدم القابل للاسترداد")}</h3>
              <div className="reserve-pay-methods">
                <label className="pay-method">
                  <input type="radio" name="dep" defaultChecked/>
                  <div className="pay-method-body">
                    <div className="pay-method-logo knet">KNET</div>
                    <div>
                      <div className="pay-method-name">{t("KNET — Kuwait debit card","كي-نت")}</div>
                      <div className="pay-method-hint">{t("Pay with your local bank card","ادفع ببطاقة البنك المحلي")}</div>
                    </div>
                  </div>
                </label>
                <label className="pay-method">
                  <input type="radio" name="dep"/>
                  <div className="pay-method-body">
                    <div className="pay-method-logo visa">VISA</div>
                    <div>
                      <div className="pay-method-name">{t("Visa / Mastercard","فيزا / ماستر")}</div>
                      <div className="pay-method-hint">{t("Local or international card","بطاقة محلية أو دولية")}</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </main>

          <aside>
            <div className="reserve-aside">
              <CarImage car={car} className="reserve-aside-img"/>
              <h4>{car.year} {t(b.name,b.nameAr)} {car.model}</h4>
              <div className="reserve-aside-meta">{fmtKM(car.mileage,locale)} · {car.transmission}</div>
              <hr/>
              <div className="reserve-aside-row"><span>{t("Car price","سعر السيارة")}</span><strong>{fmtKWD(car.price,locale)}</strong></div>
              <div className="reserve-aside-row"><span>{t("Refundable deposit","المقدم القابل للاسترداد")}</span><strong>{fmtKWD(100,locale)}</strong></div>
              <div className="reserve-aside-row faded"><span>{t("Applied to final total","يُخصم من الإجمالي")}</span><span>−{fmtKWD(100,locale)}</span></div>
              <hr/>
              <div className="reserve-aside-total"><span>{t("Due now","المستحق الآن")}</span><strong>{fmtKWD(100,locale)}</strong></div>
              <Button variant="primary" size="lg" style={{width:"100%"}} onClick={()=>{
                if (!user) { onSignIn(); return; }
                setStep(1);
              }}>
                <Icon name="shield" size={16}/> {t("Pay KWD 100 & reserve","ادفع واحجز")}
              </Button>
              <div className="reserve-aside-tos"><Icon name="info" size={12}/> {t("You're paying a refundable deposit. No commitment to buy.","تدفع مقدماً قابلاً للاسترداد. لا التزام بالشراء.")}</div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ----- Wizard (steps 1-7) -----
  const onNext = () => {
    if (step===7) {
      toast(t("Order placed! Check your email.","تم الطلب! راجع بريدك."),"success");
      go({page:"account", tab:"orders"});
    } else {
      setStep(s=>Math.min(7, s+1));
    }
  };
  const stepObj = STEPS[step-1];

  return (
    <div className="wizard">
      <div className="wizard-header">
        <div className="container wizard-header-inner">
          <button className="wizard-back" onClick={()=>step>1 ? setStep(s=>s-1) : go({page:"vdp", id:car.id})}>
            <Icon name="chevron-left" size={16}/> {t("Back","عودة")}
          </button>
          <div className="wizard-title">
            <strong>{t(b.name,b.nameAr)} {car.model}</strong>
            <span>· {t("Order","طلب")} #BMC-{car.id.slice(-4)}</span>
          </div>
          <div className="wizard-hold">
            <Icon name="clock" size={14}/>
            <span>{t("Hold expires in","ينتهي الحجز خلال")} <strong>{hr}:{mn}:{sc}</strong></span>
          </div>
        </div>
      </div>

      <div className="container wizard-body">
        {/* Vertical stepper */}
        <aside className="wizard-steps">
          {STEPS.map((s,i)=>{
            const done = step>s.id;
            const active = step===s.id;
            return (
              <button key={s.id} className={`wstep ${done?"done":""} ${active?"active":""}`}
                      onClick={()=>step>=s.id && setStep(s.id)} disabled={step<s.id}>
                <span className="wstep-dot">
                  {done ? <Icon name="check" size={12} color="#fff"/> : s.id}
                </span>
                <span>{t(s.label, s.labelAr)}</span>
              </button>
            );
          })}
        </aside>

        <main className="wizard-main">
          <header className="wizard-step-head">
            <div className="wizard-step-num">{t("Step","الخطوة")} {step} {t("of","من")} 7</div>
            <h1>{t(stepObj.label, stepObj.labelAr)}</h1>
          </header>

          {/* Step 1: Payment method */}
          {step===1 && (
            <div className="wstep-body">
              <p>{t("How would you like to pay for the car?","كيف تريد دفع ثمن السيارة؟")}</p>
              {[
                {id:"cash",   icon:"dollar",  ti:t("Pay in full","الدفع كاملاً"),     su:t("By KNET, card or bank transfer","كي-نت، بطاقة أو حوالة")},
                {id:"finance",icon:"calc",    ti:t("Finance with a bank","تمويل بنكي"), su:t("Get multiple bank offers in minutes","عروض بنوك متعددة خلال دقائق")},
                {id:"split",  icon:"sparkle", ti:t("Cash + Trade-in","كاش + استبدال"), su:t("Trade in your old car","استبدل سيارتك القديمة")},
              ].map(opt=>(
                <label key={opt.id} className={`pay-opt ${payment===opt.id?"on":""}`}>
                  <input type="radio" checked={payment===opt.id} onChange={()=>setPayment(opt.id)}/>
                  <div className="pay-opt-icon"><Icon name={opt.icon} size={20}/></div>
                  <div>
                    <h3>{opt.ti}</h3>
                    <p>{opt.su}</p>
                  </div>
                  <Icon name="check-circle" size={20} color={payment===opt.id?"var(--royal)":"#cbd5e1"}/>
                </label>
              ))}

              {payment==="finance" && (
                <div className="wstep-callout">
                  <Icon name="info" size={16}/>
                  <div>
                    <strong>{t("Next: side-by-side bank offers","التالي: عروض بنوك جنباً إلى جنب")}</strong>
                    <p>{t("We'll fetch real offers from ABK, NBK, KFH and Burgan. No impact on your credit.","سنجلب عروضاً حقيقية من البنوك بدون أثر على سجلك.")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Trade-in */}
          {step===2 && (
            <div className="wstep-body">
              <p>{t("Have a car to trade in? Lower your total today.","لديك سيارة للاستبدال؟ قلل من المبلغ.")}</p>
              <label className={`pay-opt ${tradeIn?"on":""}`}>
                <input type="radio" checked={tradeIn} onChange={()=>setTradeIn(true)}/>
                <div className="pay-opt-icon"><Icon name="car" size={20}/></div>
                <div>
                  <h3>{t("Yes, I have a trade-in","نعم، لدي سيارة للاستبدال")}</h3>
                  <p>{t("Get an instant indicative offer in 60 seconds","احصل على عرض مبدئي خلال ٦٠ ثانية")}</p>
                </div>
                <Icon name="check-circle" size={20} color={tradeIn?"var(--royal)":"#cbd5e1"}/>
              </label>
              <label className={`pay-opt ${!tradeIn?"on":""}`}>
                <input type="radio" checked={!tradeIn} onChange={()=>setTradeIn(false)}/>
                <div className="pay-opt-icon"><Icon name="x" size={20}/></div>
                <div>
                  <h3>{t("No trade-in","لا أريد الاستبدال")}</h3>
                  <p>{t("Skip this step","تخطّى هذه الخطوة")}</p>
                </div>
                <Icon name="check-circle" size={20} color={!tradeIn?"var(--royal)":"#cbd5e1"}/>
              </label>
              {tradeIn && (
                <div className="wstep-mini">
                  <h4>{t("Your trade-in details","تفاصيل سيارتك")}</h4>
                  <div className="wstep-form">
                    <div className="wfield"><label>{t("Brand","الماركة")}</label><select defaultValue="toyota"><option>Toyota</option><option>Lexus</option><option>Honda</option></select></div>
                    <div className="wfield"><label>{t("Model","الموديل")}</label><input defaultValue="Corolla XLI"/></div>
                    <div className="wfield"><label>{t("Year","السنة")}</label><input defaultValue="2018"/></div>
                    <div className="wfield"><label>{t("Mileage (km)","الممشى")}</label><input defaultValue="78,400"/></div>
                  </div>
                  <div className="wstep-offer">
                    <div>
                      <div className="wstep-offer-label">{t("Indicative offer","عرض مبدئي")}</div>
                      <div className="wstep-offer-value">{fmtKWD(2800,locale)}</div>
                    </div>
                    <Badge variant="green-soft" icon="check-circle">{t("Guaranteed 7 days","مضمون ٧ أيام")}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Add-ons */}
          {step===3 && (
            <div className="wstep-body">
              <p>{t("Optional protection and accessories. Skip any you don't want.","حماية وإكسسوارات اختيارية. تخطّى أيها.")}</p>
              <div className="addon-grid">
                {[
                  {id:"warranty", icon:"shield",  ti:t("Extended warranty","ضمان ممتد"),    su:t("2 years / 50,000 km bumper-to-bumper","سنتان / ٥٠٠٠٠ كم"),       price:250},
                  {id:"gap",      icon:"return",  ti:t("GAP insurance","تأمين GAP"),         su:t("Covers the gap if your car is totalled","يغطي الفرق عند الخسارة الكلية"),  price:180},
                  {id:"ceramic",  icon:"sparkle", ti:t("Ceramic coating","طلاء سيراميك"),   su:t("Premium paint protection — 5 years","حماية طلاء ممتازة"),       price:320},
                  {id:"tint",     icon:"camera",  ti:t("Window tint","تظليل النوافذ"),      su:t("3M Crystalline — 70% heat rejection","3M كرستالاين"),          price:90},
                ].map(a=>(
                  <label key={a.id} className={`addon-card ${addons[a.id]?"on":""}`}>
                    <input type="checkbox" checked={addons[a.id]} onChange={()=>setAddons({...addons, [a.id]:!addons[a.id]})}/>
                    <Icon name={a.icon} size={26} color="var(--royal)"/>
                    <h4>{a.ti}</h4>
                    <p>{a.su}</p>
                    <div className="addon-price">{fmtKWD(a.price,locale)}</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step===4 && (
            <div className="wstep-body">
              <p>{t("Upload your documents securely. Encrypted at rest, CITRA compliant.","ارفق مستنداتك بأمان. مشفّر، متوافق مع CITRA.")}</p>
              <div className="docs-list">
                {[
                  {id:"civilid",   ti:t("Civil ID (front & back)","البطاقة المدنية (الوجهين)"),      su:t("JPG or PDF, max 5 MB","JPG أو PDF")},
                  {id:"salary",    ti:t("Salary certificate","شهادة راتب"),                          su:t("From your employer, dated within 30 days","من جهة العمل")},
                  {id:"statement", ti:t("Bank statements (last 3 months)","كشف الحساب (٣ أشهر)"),  su:t("PDF preferred","PDF مفضل")},
                ].map(d=>(
                  <div key={d.id} className={`doc-row ${docsUp[d.id]?"on":""}`}>
                    <div className="doc-icon"><Icon name={docsUp[d.id]?"check-circle":"doc"} size={22} color={docsUp[d.id]?"#16a34a":"var(--muted)"}/></div>
                    <div className="doc-meta">
                      <h4>{d.ti}</h4>
                      <p>{docsUp[d.id] ? t("Uploaded · 2.1 MB","تم رفعه") : d.su}</p>
                    </div>
                    {docsUp[d.id]
                      ? <button onClick={()=>setDocsUp({...docsUp, [d.id]:false})} className="doc-action">{t("Replace","استبدال")}</button>
                      : <button onClick={()=>setDocsUp({...docsUp, [d.id]:true})}  className="doc-action up"><Icon name="upload" size={14}/> {t("Upload","رفع")}</button>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Contract */}
          {step===5 && (
            <div className="wstep-body">
              <p>{t("Review your contract and sign electronically.","راجع العقد ووقّع إلكترونياً.")}</p>
              <div className="contract-box">
                <div className="contract-head">
                  <Icon name="doc" size={20}/>
                  <strong>{t("Vehicle Sale Agreement","عقد بيع المركبة")}</strong>
                  <button className="link-btn">{t("View full PDF","عرض PDF")}</button>
                </div>
                <div className="contract-summary">
                  <div><span>{t("Vehicle","المركبة")}</span><strong>{car.year} {b.name} {car.model}</strong></div>
                  <div><span>VIN</span><strong>••••••{car.id.slice(-6)}</strong></div>
                  <div><span>{t("Sale price","سعر البيع")}</span><strong>{fmtKWD(car.price,locale)}</strong></div>
                  <div><span>{t("Return policy","سياسة الإرجاع")}</span><strong>{t("3 days / 300 km","٣ أيام / ٣٠٠ كم")}</strong></div>
                  <div><span>{t("Warranty","الضمان")}</span><strong>{t("90 days mechanical","٩٠ يوم ميكانيكي")}</strong></div>
                </div>
                <hr/>
                <div className="contract-cbk">
                  <Icon name="info" size={14}/>
                  {t("CBK disclosure: This is a cash sale. No interest applies. Total payable equals KWD","إفصاح بنك الكويت المركزي")} {car.price}.
                </div>
              </div>
              <label className={`sign-box ${signed?"on":""}`}>
                <input type="checkbox" checked={signed} onChange={e=>setSigned(e.target.checked)}/>
                <div>
                  <strong>{t("I have read and agree to the contract above.","قرأت وأوافق على العقد أعلاه.")}</strong>
                  <p>{t("E-signature will be applied with audit trail.","سيتم التوقيع الإلكتروني مع سجل تدقيق.")}</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 6: Delivery */}
          {step===6 && (
            <div className="wstep-body">
              <p>{t("Choose a date and time. Our driver will deliver to your door.","اختر التاريخ والوقت. سيوصل السائق لباب بيتك.")}</p>
              <div className="slot-grid">
                {["Fri, 1 Nov","Sat, 2 Nov","Sun, 3 Nov","Mon, 4 Nov","Tue, 5 Nov","Wed, 6 Nov"].map(d=>(
                  <button key={d} className={`slot-day ${slot.date===d?"on":""}`}
                          onClick={()=>setSlot({...slot, date:d})}>
                    <strong>{d.split(", ")[0]}</strong>
                    <span>{d.split(", ")[1]}</span>
                  </button>
                ))}
              </div>
              <h4 className="slot-time-head">{t("Time window","الفترة الزمنية")}</h4>
              <div className="slot-times">
                {["09:00 – 10:00","10:00 – 12:00","12:00 – 14:00","14:00 – 16:00","16:00 – 18:00","18:00 – 20:00"].map(time=>(
                  <button key={time} className={`slot-time ${slot.time===time?"on":""}`}
                          onClick={()=>setSlot({...slot, time})}>{time}</button>
                ))}
              </div>
              <div className="addr-box">
                <Icon name="map-pin" size={18} color="var(--royal)"/>
                <div>
                  <strong>{t("Delivery address","عنوان التوصيل")}</strong>
                  <p>{t("Block 4, Street 12, House 8, Hawalli","قطعة ٤، شارع ١٢، منزل ٨، حولي")}</p>
                </div>
                <button className="link-btn">{t("Change","تغيير")}</button>
              </div>
            </div>
          )}

          {/* Step 7: Confirmation */}
          {step===7 && (
            <div className="wstep-body wstep-confirm">
              <div className="confirm-icon"><Icon name="check-circle" size={56} color="#16a34a"/></div>
              <h2>{t("Almost done!","تقريباً انتهينا!")}</h2>
              <p>{t("Review your order. Once confirmed, we'll start preparing your delivery.","راجع طلبك. بعد التأكيد، سنبدأ تجهيز التوصيل.")}</p>
              <div className="confirm-list">
                <div><Icon name="check" size={16} color="#16a34a"/> {t("Payment","الدفع")}: {payment==="cash" ? t("Pay in full","كاش") : payment==="finance" ? t("Bank finance","تمويل بنكي") : t("Cash + trade-in","كاش+استبدال")}</div>
                <div><Icon name="check" size={16} color="#16a34a"/> {t("Documents uploaded","المستندات مرفوعة")}</div>
                <div><Icon name="check" size={16} color="#16a34a"/> {t("Contract signed","العقد موقّع")}</div>
                <div><Icon name="check" size={16} color="#16a34a"/> {t("Delivery","التوصيل")}: {slot.date} · {slot.time}</div>
              </div>
            </div>
          )}

          <footer className="wizard-foot">
            <Button variant="ghost" onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step<=1}>
              <Icon name="chevron-left" size={16}/> {t("Previous","السابق")}
            </Button>
            <Button variant="primary" size="lg" onClick={onNext}
                    disabled={(step===5 && !signed)}>
              {step===7 ? t("Confirm order","تأكيد الطلب") : t("Continue","متابعة")}
              <Icon name="arrow-right" size={16}/>
            </Button>
          </footer>
        </main>

        {/* Order summary aside */}
        <aside className="wizard-summary">
          <h4>{t("Order summary","ملخص الطلب")}</h4>
          <CarImage car={car} className="wizard-summary-img"/>
          <div className="wizard-summary-title">{car.year} {t(b.name,b.nameAr)} {car.model}</div>
          <div className="wizard-summary-meta">{fmtKM(car.mileage,locale)} · {car.transmission}</div>
          <hr/>
          <div className="wsum-row"><span>{t("Car price","السعر")}</span><strong>{fmtKWD(car.price,locale)}</strong></div>
          {addonsTotal>0 && <div className="wsum-row"><span>{t("Add-ons","الإضافات")}</span><strong>+{fmtKWD(addonsTotal,locale)}</strong></div>}
          {tradeInValue>0 && <div className="wsum-row credit"><span>{t("Trade-in credit","رصيد الاستبدال")}</span><strong>−{fmtKWD(tradeInValue,locale)}</strong></div>}
          <div className="wsum-row credit"><span>{t("Deposit applied","المقدم")}</span><strong>−{fmtKWD(100,locale)}</strong></div>
          <hr/>
          <div className="wsum-total"><span>{t("Total","الإجمالي")}</span><strong>{fmtKWD(total-100,locale)}</strong></div>
          <div className="wsum-hint">
            <Icon name="shield" size={12}/>
            <span>{t("Includes 3-day return + 90-day warranty","يشمل إرجاع ٣ أيام + ضمان ٩٠ يوم")}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

Object.assign(window, { ReservePage });
