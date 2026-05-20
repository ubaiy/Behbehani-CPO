/* eslint-disable */
// App orchestrator — router, locale, auth state, favorites, toast

function App(){
  const [route, setRoute] = React.useState(() => {
    try { return JSON.parse(sessionStorage.getItem("bm_route")) || {page:"home"}; }
    catch { return {page:"home"}; }
  });
  const [locale, setLocale] = React.useState(() => localStorage.getItem("bm_locale") || "en");
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("bm_user")) || null; }
    catch { return null; }
  });
  const [favs, setFavs] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("bm_favs")) || []); }
    catch { return new Set(); }
  });
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState(null);

  // Persist
  React.useEffect(() => { sessionStorage.setItem("bm_route", JSON.stringify(route)); }, [route]);
  React.useEffect(() => { localStorage.setItem("bm_locale", locale); document.documentElement.lang = locale; document.documentElement.dir = locale==="ar" ? "rtl" : "ltr"; }, [locale]);
  React.useEffect(() => { user ? localStorage.setItem("bm_user", JSON.stringify(user)) : localStorage.removeItem("bm_user"); }, [user]);
  React.useEffect(() => { localStorage.setItem("bm_favs", JSON.stringify([...favs])); }, [favs]);

  // Reset scroll on route change
  React.useEffect(() => { window.scrollTo({top:0, behavior:"instant"}); }, [route.page, route.id, route.tab, route.path]);

  const go = (r) => setRoute(r);
  const toggleFav = (id) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setToastMsg({msg: locale==="ar"?"تمت إزالتها من المفضلة":"Removed from favorites", kind:"info"}); }
      else              { next.add(id);    setToastMsg({msg: locale==="ar"?"تمت إضافتها للمفضلة":"Saved to favorites", kind:"success"}); }
      return next;
    });
  };
  const signIn = (u) => { setUser(u); setToastMsg({msg: locale==="ar"?`أهلاً ${u.name.split(" ")[0]}!`:`Welcome, ${u.name.split(" ")[0]}!`, kind:"success"}); };
  const signOut = () => { setUser(null); setRoute({page:"home"}); setToastMsg({msg: locale==="ar"?"تم تسجيل الخروج":"Signed out", kind:"info"}); };
  const toast = (msg, kind="info") => setToastMsg({msg, kind});

  // Auto-dismiss toast
  React.useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(()=>setToastMsg(null), 2500);
    return ()=>clearTimeout(id);
  }, [toastMsg]);

  // Render page
  let Page;
  switch (route.page) {
    case "home":     Page = <HomePage     locale={locale} go={go} onSearchOpen={()=>setSearchOpen(true)} favs={favs} toggleFav={toggleFav}/>; break;
    case "browse":   Page = <BrowsePage   locale={locale} go={go} route={route} favs={favs} toggleFav={toggleFav}/>; break;
    case "vdp":      Page = <VDPPage      locale={locale} go={go} route={route} favs={favs} toggleFav={toggleFav} user={user} onSignIn={()=>setSignInOpen(true)} toast={toast}/>; break;
    case "reserve":  Page = <ReservePage  locale={locale} go={go} route={route} user={user} onSignIn={()=>setSignInOpen(true)} toast={toast}/>; break;
    case "sell":     Page = <SellPage     locale={locale} go={go} route={route} user={user} onSignIn={()=>setSignInOpen(true)} toast={toast}/>; break;
    case "finance":  Page = <FinancePage  locale={locale} go={go} route={route}/>; break;
    case "services": Page = <ServicesPage locale={locale} go={go} toast={toast}/>; break;
    case "dealers":  Page = <DealerRegisterPage locale={locale} go={go}/>; break;
    case "account":  Page = user
                              ? <AccountPage locale={locale} go={go} route={route} user={user} favs={favs} toggleFav={toggleFav} signOut={signOut} toast={toast}/>
                              : (setTimeout(()=>setSignInOpen(true),50), <HomePage locale={locale} go={go} onSearchOpen={()=>setSearchOpen(true)} favs={favs} toggleFav={toggleFav}/>);
                     break;
    default:         Page = <HomePage     locale={locale} go={go} onSearchOpen={()=>setSearchOpen(true)} favs={favs} toggleFav={toggleFav}/>;
  }

  // Hide footer on wizard pages
  const hideFooter = route.page==="reserve" && route.id;

  return (
    <>
      <Header
        route={route} go={go}
        locale={locale} setLocale={setLocale}
        favCount={favs.size}
        onSearchOpen={()=>setSearchOpen(true)}
        onSignIn={()=>setSignInOpen(true)}
        user={user} signOut={signOut}
      />
      <main>{Page}</main>
      {!hideFooter && <Footer locale={locale} go={go}/>}
      <SignInModal open={signInOpen} onClose={()=>setSignInOpen(false)} onSignIn={signIn} locale={locale}/>
      <SearchDialog open={searchOpen} onClose={()=>setSearchOpen(false)} go={go} locale={locale}/>
      {toastMsg && <Toast msg={toastMsg.msg} kind={toastMsg.kind}/>}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
