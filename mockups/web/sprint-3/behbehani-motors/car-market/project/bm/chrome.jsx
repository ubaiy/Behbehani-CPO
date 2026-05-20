/* eslint-disable */
// Header, footer, sign-in modal — shared chrome

const Header = ({route, go, locale, setLocale, favCount, onSearchOpen, onSignIn, user, signOut}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false);
  const t = (en, ar) => locale==="ar" ? ar : en;
  const isActive = (k) => route.page===k;

  const nav = [
    { id:"browse",  label:t("Buy a Car","شراء سيارة") },
    { id:"sell",    label:t("Sell a Car","بيع سيارة") },
    { id:"finance", label:t("Financing","التمويل") },
    { id:"services",label:t("Car Services","خدمات السيارات") },
    { id:"dealers", label:t("For Dealers","للمعارض") },
  ];

  return (
    <header className="hdr">
      <div className="hdr-inner">
        <button className="hdr-brand" onClick={()=>go({page:"home"})} aria-label="Morad Yousuf Behbehani — Home">
          <img src="bm/logo.png" alt="Morad Yousuf Behbehani" className="hdr-logo-img"/>
        </button>

        <nav className="hdr-nav">
          {nav.map(n=>(
            <button key={n.id} onClick={()=>go({page:n.id})}
                    className={`hdr-nav-link ${isActive(n.id)?"is-active":""}`}>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="hdr-actions">
          <button className="hdr-action" onClick={onSearchOpen} aria-label="Search">
            <Icon name="search" size={18}/>
          </button>
          <button className="hdr-action" onClick={()=>setLocale(locale==="en"?"ar":"en")}>
            <Icon name="globe" size={18}/>
            <span className="hdr-locale">{locale==="en"?"EN":"عربي"}</span>
          </button>
          <button className="hdr-action hdr-fav" onClick={()=>go({page:"account", tab:"favorites"})} aria-label="Favorites">
            <Icon name="heart" size={18}/>
            {favCount>0 && <span className="hdr-badge">{favCount}</span>}
          </button>
          <div className="hdr-acct-wrap">
            <button className="hdr-action hdr-acct" onClick={()=>user ? setAcctOpen(o=>!o) : onSignIn()}>
              <Icon name="user" size={18}/>
              <span>{user ? user.name.split(" ")[0] : t("Sign in","دخول")}</span>
            </button>
            {acctOpen && user && (
              <div className="hdr-acct-menu" onMouseLeave={()=>setAcctOpen(false)}>
                <button onClick={()=>{setAcctOpen(false); go({page:"account",tab:"overview"});}}>{t("My account","حسابي")}</button>
                <button onClick={()=>{setAcctOpen(false); go({page:"account",tab:"orders"});}}>{t("Orders","الطلبات")}</button>
                <button onClick={()=>{setAcctOpen(false); go({page:"account",tab:"favorites"});}}>{t("Favorites","المفضلة")}</button>
                <button onClick={()=>{setAcctOpen(false); go({page:"account",tab:"financing"});}}>{t("Financing","التمويل")}</button>
                <hr/>
                <button onClick={()=>{setAcctOpen(false); signOut();}}>{t("Sign out","تسجيل خروج")}</button>
              </div>
            )}
          </div>

          <button className="hdr-mobile" onClick={()=>setMenuOpen(o=>!o)}>
            <Icon name={menuOpen?"x":"menu"} size={22}/>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="hdr-drawer">
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{setMenuOpen(false); go({page:n.id});}} className="hdr-drawer-link">{n.label}</button>
          ))}
          <hr/>
          <button onClick={()=>{setMenuOpen(false); user ? go({page:"account",tab:"overview"}) : onSignIn();}} className="hdr-drawer-link">
            <Icon name="user" size={16}/> {user ? t("My account","حسابي") : t("Sign in","دخول")}
          </button>
        </div>
      )}
    </header>
  );
};

const Footer = ({locale, go}) => {
  const t = (en, ar) => locale==="ar" ? ar : en;
  const col = (title, items) => (
    <div>
      <h4>{title}</h4>
      <ul>{items.map(([label, action])=>(
        <li key={label}><button onClick={action}>{label}</button></li>
      ))}</ul>
    </div>
  );
  return (
    <footer className="ftr">
      <div className="ftr-top">
        <div className="ftr-brand">
          <div className="ftr-logo"><img src="bm/logo.png" alt="Morad Yousuf Behbehani" className="ftr-logo-img"/></div>
          <div className="ftr-co">Morad Yousuf Behbehani</div>
          <div className="ftr-tag">{t("Kuwait's trusted way to buy, sell and own. Since 1935.","الطريقة الموثوقة في الكويت لشراء وبيع وامتلاك السيارات. منذ ١٩٣٥.")}</div>
          <div className="ftr-trust">
            <Badge variant="white-on-dark" icon="shield">{t("71-pt inspection","فحص ٧١ نقطة")}</Badge>
            <Badge variant="white-on-dark" icon="return">{t("3-day return","إرجاع ٣ أيام")}</Badge>
            <Badge variant="white-on-dark" icon="truck">{t("Home delivery","توصيل منزلي")}</Badge>
          </div>
        </div>
        <div className="ftr-cols">
          {col(t("Buy","الشراء"), [
            [t("Browse used cars","تصفح السيارات"), ()=>go({page:"browse"})],
            [t("By body type","حسب الشكل"), ()=>go({page:"browse"})],
            [t("By monthly payment","حسب القسط"), ()=>go({page:"browse",monthly:true})],
            [t("Compare cars","قارن السيارات"), ()=>{}],
          ])}
          {col(t("Sell","البيع"), [
            [t("Instant valuation","تقييم فوري"), ()=>go({page:"sell",path:"instant"})],
            [t("Concierge service","خدمة الكونسيرج"), ()=>go({page:"sell",path:"concierge"})],
            [t("Self-service listing","نشر ذاتي"), ()=>go({page:"sell",path:"self"})],
            [t("Trade-in","الاستبدال"), ()=>go({page:"sell",path:"instant"})],
          ])}
          {col(t("Own","التملك"), [
            [t("Financing","التمويل"), ()=>go({page:"finance"})],
            [t("Insurance","التأمين"), ()=>{}],
            [t("Car services","خدمات السيارات"), ()=>go({page:"services"})],
            [t("Maintenance pickup","صيانة بالاستلام"), ()=>{}],
          ])}
          {col(t("Company","الشركة"), [
            [t("How it works","كيف يعمل"), ()=>{}],
            [t("About us","عن الشركة"), ()=>{}],
            [t("Customer reviews","آراء العملاء"), ()=>{}],
            [t("Contact","اتصل بنا"), ()=>{}],
            [t("Careers","الوظائف"), ()=>{}],
          ])}
        </div>
      </div>
      <div className="ftr-bot">
        <div>© 2026 Behbehani Motors Company. All rights reserved.</div>
        <div className="ftr-legal">
          <button>{t("Privacy Policy","الخصوصية")}</button>
          <button>{t("Terms","الشروط")}</button>
          <button>{t("CITRA compliance","الامتثال CITRA")}</button>
        </div>
      </div>
    </footer>
  );
};

// ---------- Sign in modal ----------
const SignInModal = ({open, onClose, onSignIn, locale}) => {
  const [mode, setMode] = React.useState("phone"); // phone | email
  const [step, setStep] = React.useState(1);
  const [phone, setPhone] = React.useState("9999 1234");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const t = (en, ar) => locale==="ar" ? ar : en;
  if (!open) return null;
  // Derive a display name from whatever the user provided.
  const deriveName = () => {
    if (mode === "email" && email.includes("@")) {
      const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      return local
        .split(" ")
        .filter(Boolean)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ") || "Member";
    }
    return "Member";
  };
  const submit = () => {
    onSignIn({name: deriveName(), phone:`+965 ${phone}`, email:email || "member@example.com"});
    onClose();
    setStep(1);
  };
  const socialSignIn = (provider) => {
    const presets = {
      google:   { name: "Ahmad Al-Sabah",  email: "ahmad@gmail.com" },
      apple:    { name: "Ahmad Al-Sabah",  email: "ahmad@icloud.com" },
      facebook: { name: "Ahmad Al-Sabah",  email: "ahmad@facebook.com" },
    };
    const p = presets[provider];
    onSignIn({name: p.name, phone: `+965 ${phone}`, email: p.email});
    onClose();
    setStep(1);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={20}/></button>
        <div className="modal-brand"><img src="bm/logo.png" alt="Morad Yousuf Behbehani" className="modal-brand-img"/></div>
        <h2>{step===1 ? t("Sign in to Behbehani Motors","ادخل إلى بهبهاني للسيارات") : t("Verify your number","تحقق من رقمك")}</h2>
        <p className="modal-sub">{step===1
            ? t("Save favorites, reserve cars and track deliveries.","احفظ المفضلة، احجز سيارات وتتبع التوصيل.")
            : t("We sent a 4-digit code to your phone.","أرسلنا رمز من ٤ أرقام إلى هاتفك.")}</p>

        {step===1 && (
          <>
            <div className="auth-tabs">
              <button className={mode==="phone"?"on":""} onClick={()=>setMode("phone")}>{t("Phone","الهاتف")}</button>
              <button className={mode==="email"?"on":""} onClick={()=>setMode("email")}>{t("Email","البريد")}</button>
            </div>
            {mode==="phone" ? (
              <label className="field">
                <span>{t("Mobile number","رقم الهاتف")}</span>
                <div className="phone-input">
                  <span className="phone-prefix">+965</span>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9999 1234"/>
                </div>
              </label>
            ) : (
              <label className="field">
                <span>{t("Email","البريد")}</span>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
              </label>
            )}
            <Button variant="primary" size="lg" onClick={()=>setStep(2)} style={{width:"100%"}}>
              {t("Continue","متابعة")} <Icon name="arrow-right" size={16}/>
            </Button>
            <div className="auth-divider"><span>{t("or","أو")}</span></div>
            <div className="auth-socials auth-socials-3">
              <button className="auth-social" onClick={()=>socialSignIn("google")} aria-label="Sign in with Google">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.32z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                <span>Google</span>
              </button>
              <button className="auth-social" onClick={()=>socialSignIn("apple")} aria-label="Sign in with Apple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
                  <path d="M17.6 12.6c0-3 2.5-4.5 2.6-4.5-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-1 0-2.4-1.1-4-1-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1 1.8 0 2.4 1 4 1 1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-4.9zM14.6 3.7c.8-1 1.4-2.4 1.2-3.7-1.2.1-2.6.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.6 1.3.1 2.7-.7 3.6-1.7z"/>
                </svg>
                <span>Apple</span>
              </button>
              <button className="auth-social" onClick={()=>socialSignIn("facebook")} aria-label="Sign in with Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                  <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
            <p className="modal-foot">{t("By continuing you agree to our Terms & Privacy Policy.","بالمتابعة فأنت توافق على الشروط وسياسة الخصوصية.")}</p>
          </>
        )}
        {step===2 && (
          <>
            <label className="field">
              <span>{t("4-digit code","رمز التحقق")}</span>
              <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,4))}
                     placeholder="1234" inputMode="numeric" className="otp-input"/>
            </label>
            <Button variant="primary" size="lg" onClick={submit} style={{width:"100%"}}
                    disabled={otp.length<4}>
              {t("Verify and sign in","تحقق ودخول")}
            </Button>
            <button className="auth-back" onClick={()=>setStep(1)}>
              <Icon name="chevron-left" size={14}/> {t("Back","عودة")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Global search dialog ----------
const SearchDialog = ({open, onClose, go, locale}) => {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState({});
  const t = (en, ar) => locale==="ar" ? ar : en;
  React.useEffect(()=>{ if(open){ setTimeout(()=>document.getElementById("__search_input")?.focus(), 50); }},[open]);
  if (!open) return null;
  const results = CARS.filter(c=>{
    if (!q) return false;
    const b = brandOf(c.brand).name;
    return (`${b} ${c.model} ${c.year}`).toLowerCase().includes(q.toLowerCase());
  }).slice(0, 6);
  const go2 = (r) => { onClose(); go(r); };
  return (
    <div className="modal-bg search-bg" onClick={onClose}>
      <div className="search-dialog" onClick={e=>e.stopPropagation()}>
        <div className="search-input">
          <Icon name="search" size={20} color="var(--muted)"/>
          <input id="__search_input" value={q} onChange={e=>setQ(e.target.value)}
                 placeholder={t("Search by make, model or year…","ابحث بالماركة، الموديل أو السنة…")}/>
          <button onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        {!q && (
          <>
            <div className="search-section-title">{t("Popular brands","ماركات شائعة")}</div>
            <div className="search-brands">
              {BRANDS.slice(0,8).map(b=>(
                <button key={b.id} onClick={()=>go2({page:"browse", brand:b.id})}>{t(b.name, b.nameAr)}</button>
              ))}
            </div>
            <div className="search-section-title">{t("Quick filters","فلاتر سريعة")}</div>
            <div className="search-brands">
              <button onClick={()=>go2({page:"browse", under:6000})}>{t("Under KWD 6,000","أقل من ٦٠٠٠")}</button>
              <button onClick={()=>go2({page:"browse", body:"suv"})}>{t("SUVs","دفع رباعي")}</button>
              <button onClick={()=>go2({page:"browse", inspected:true})}>{t("Inspected only","المفحوصة فقط")}</button>
              <button onClick={()=>go2({page:"browse", fuel:"Electric"})}>{t("Electric","كهربائية")}</button>
            </div>
          </>
        )}
        {q && results.length>0 && (
          <div className="search-results">
            {results.map(c=>(
              <button key={c.id} className="search-result" onClick={()=>go2({page:"vdp", id:c.id})}>
                <CarImage car={c} className="search-result-img"/>
                <div>
                  <div className="search-result-title">{c.year} {brandOf(c.brand).name} {c.model}</div>
                  <div className="search-result-meta">{fmtKWD(c.price,locale)} · {fmtKM(c.mileage,locale)}</div>
                </div>
                <Icon name="arrow-right" size={16} color="var(--muted)"/>
              </button>
            ))}
          </div>
        )}
        {q && results.length===0 && (
          <div className="search-empty">{t("No matches. Try a different search.","لا توجد نتائج. حاول بحث آخر.")}</div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { Header, Footer, SignInModal, SearchDialog });
