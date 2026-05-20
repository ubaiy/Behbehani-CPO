// wf-home.jsx — 4 home page variations + 1 RTL mirror.
// Each composes the same base primitives but differs structurally so the
// user can see the design space, not just one resolution of it.

// ── A · Classic marketplace ────────────────────────────────────────────
// Hero search bar, body-type tiles, multiple curated rails. Carwow / Cars24
// territory. Familiar but generic. Safe default.
function HomeClassic({rtl=false}){
  return (
    <Browser url="behbehanimotors.com.kw / home">
      <div className={rtl?'rtl-mirror':''}>
        <NavBar active="Buy a Car"/>

        {/* Hero with search */}
        <div style={{position:'relative', padding:'40px 28px', background:'linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)', borderBottom:'1.5px solid var(--ink)'}}>
          <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:30, alignItems:'center'}}>
            <div>
              <H family="caveat" size={44} weight={700} style={{lineHeight:1.05}}>{rtl ? 'سيارتك القادمة. مفحوصة، ممولة، موصلة.' : 'Your next car. '}<span className="underline">{rtl ? '' : 'Inspected. Financed. Delivered.'}</span></H>
              <div style={{height:14}}/>
              <H size={16} color="var(--muted)">{rtl ? 'احجز بـ ١٠٠ د.ك · ضمان استرداد ٣ أيام / ٣٠٠ كم' : 'Reserve for KWD 100 · 3-day / 300 km money-back guarantee'}</H>
              <div style={{height:22}}/>
              <Box rough p={6} style={{display:'flex', gap:6, background:'#fff'}}>
                <Box rough thin p="10px 14px" style={{flex:1}}><H size={13} color="var(--muted)">{rtl ? 'الماركة والموديل' : 'Make & model'}</H></Box>
                <Box rough thin p="10px 14px" style={{flex:1}}><H size={13} color="var(--muted)">{rtl ? 'الميزانية' : 'Budget · KWD'}</H></Box>
                <Box rough thin p="10px 14px" style={{flex:1}}><H size={13} color="var(--muted)">{rtl ? 'القسط الشهري' : 'or monthly · KWD'}</H></Box>
                <Btn primary big>{rtl ? 'بحث' : 'Search'} →</Btn>
              </Box>
              <div style={{height:10}}/>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {(rtl ? ['تويوتا','مرسيدس','بي ام دبليو','لكزس','بورش','جي ام سي'] : ['Toyota','Mercedes','BMW','Lexus','Porsche','GMC','Nissan']).map(b=>
                  <Chip key={b}>{b}</Chip>
                )}
                <Chip>+ 25 brands</Chip>
              </div>
            </div>
            <Box rough h={300} p={0} style={{overflow:'hidden'}}>
              <Img variant="car" h="100%"/>
              <div style={{position:'absolute', bottom:10, left:10}}><Badge royal>Featured</Badge></div>
            </Box>
          </div>
        </div>

        <TrustBar/>

        {/* Body type tiles */}
        <div style={{padding:'30px 28px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <H family="caveat" size={26} weight={700}>{rtl ? 'تسوق حسب نوع السيارة' : 'Shop by body type'}</H>
            <H size={13} color="var(--royal)" style={{borderBottom:'1.5px solid var(--royal)'}}>{rtl ? 'عرض الكل ←' : 'See all →'}</H>
          </div>
          <div style={{height:16}}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12}}>
            {(rtl ? ['سيدان','SUV','كوبيه','مكشوفة','بيك أب','هاتشباك'] : ['Sedan','SUV','Coupe','Convertible','Pickup','Hatchback']).map(t=>(
              <Box key={t} rough h={110} style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4}}>
                <div style={{width:60, height:30, background:'#dad7cf', borderRadius:4}}/>
                <H size={13}>{t}</H>
              </Box>
            ))}
          </div>
        </div>

        {/* Price brackets row */}
        <div style={{padding:'10px 28px 30px'}}>
          <H family="caveat" size={22} weight={700}>{rtl ? 'تسوق حسب الميزانية' : 'Shop by budget'}</H>
          <div style={{height:12}}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10}}>
            {['< 3K','3 – 6K','6 – 10K','10 – 15K','15 – 20K','20K +'].map(b=>(
              <Box key={b} rough h={60} accent="blue" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><H size={14} weight={700} color="var(--royal)">KWD {b}</H></Box>
            ))}
          </div>
        </div>

        {/* Featured rail */}
        <Rail title={rtl ? 'سيارات مميزة' : 'Featured used cars'} subtitle={rtl ? '12 سيارة' : '12 cars'}/>
        <Rail title={rtl ? 'سيارات مفحوصة ٧١ نقطة' : '71-pt inspected'} subtitle="42 cars" badge="Trust pillar"/>
        <Rail title={rtl ? 'انخفاضات الأسعار' : 'Price drops this week'} subtitle="↓ savings" drop/>

        {/* How it works */}
        <div style={{padding:'40px 28px', background:'var(--paper-2)', borderTop:'1.5px solid var(--ink)', position:'relative'}}>
          <H family="caveat" size={28} weight={700}>{rtl ? 'كيف تعمل المنصة' : 'How it works'}</H>
          <div style={{height:18}}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18}}>
            {[
              ['1', rtl?'تصفح وقارن':'Browse & compare', rtl?'٢٥+ صورة و فحص ٧١ نقطة':'25+ photos · 71-pt report'],
              ['2', rtl?'احجز بـ ١٠٠ د.ك':'Reserve for KWD 100', rtl?'حجز قابل للاسترداد لـ ٤٨ ساعة':'48 h refundable hold'],
              ['3', rtl?'موّل و أمّن':'Finance & insure', rtl?'عروض من عدة بنوك':'Side-by-side bank offers'],
              ['4', rtl?'توصيل لباب البيت':'Delivered home', rtl?'٣ أيام / ٣٠٠ كم استرداد':'3-day / 300 km return'],
            ].map(([n,t,s])=>(
              <Box key={n} rough p={18}>
                <div style={{display:'flex', gap:10, alignItems:'center'}}>
                  <Box rough w={36} h={36} fill="royal" style={{display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%'}}><H size={16} color="#fff" weight={700}>{n}</H></Box>
                  <H size={15} weight={700}>{t}</H>
                </div>
                <div style={{height:8}}/>
                <H size={13} color="var(--muted)">{s}</H>
              </Box>
            ))}
          </div>
          {!rtl && <Annot top={40} right={20} dir="right" w={130}>Trust pillars must feel deliberate, not bolted on</Annot>}
        </div>

        {/* Sell your car CTA strip */}
        <div style={{padding:'30px 28px', background:'var(--royal)', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <H family="caveat" size={28} color="#fff" weight={700}>{rtl ? 'بع سيارتك في دقيقتين' : 'Sell your car in 2 minutes'}</H>
            <H size={14} color="#fff" style={{opacity:.85}}>{rtl ? 'تقييم فوري · عرض مضمون ٧ أيام' : 'Instant valuation · guaranteed 7-day offer'}</H>
          </div>
          <Btn big style={{background:'#fff', color:'var(--royal)', borderColor:'#fff'}}>{rtl ? 'احصل على عرضي' : 'Get my offer'} →</Btn>
        </div>

        <Footer/>
      </div>
    </Browser>
  );
}

function Rail({title, subtitle, badge, drop}){
  return (
    <div style={{padding:'18px 28px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
        <div style={{display:'flex', gap:10, alignItems:'baseline'}}>
          <H family="caveat" size={24} weight={700}>{title}</H>
          {badge && <Badge royal>{badge}</Badge>}
          {subtitle && <H size={12} color="var(--muted)">{subtitle}</H>}
        </div>
        <H size={13} color="var(--royal)">See all →</H>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
        <CarCard h={230} w="100%" badge="Inspected" blue/>
        <CarCard h={230} w="100%" badge={drop?'↓ price':'Low km'} drop={drop} price="KWD 8,900"/>
        <CarCard h={230} w="100%" badge="Warranty" model="Lexus RX 350"/>
        <CarCard h={230} w="100%" model="Nissan Patrol" price="KWD 14,200"/>
      </div>
    </div>
  );
}

// ── B · Buy + Sell dual hero ───────────────────────────────────────────
// Split first fold: BUY (left) and SELL (right). Promises both sides of the
// platform up front. Good if business wants both flows weighted equally.
function HomeDual(){
  return (
    <Browser url="behbehanimotors.com.kw / home · dual hero">
      <NavBar/>

      <div style={{position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr', height:480, borderBottom:'1.5px solid var(--ink)'}}>
        {/* Buy side */}
        <div style={{padding:'34px 28px', borderRight:'1.5px solid var(--ink)', background:'var(--paper)', position:'relative'}}>
          <H size={11} weight={700} color="var(--muted)" family="ui" style={{letterSpacing:2}}>FOR BUYERS</H>
          <div style={{height:6}}/>
          <H family="caveat" size={40} weight={700} style={{lineHeight:1.05}}>Find your next car.<br/><span style={{color:'var(--royal)'}}>Reserve from KWD 100.</span></H>
          <div style={{height:18}}/>
          <Box rough p={4} style={{display:'flex', gap:4, background:'#fff'}}>
            <Box rough thin p="8px 12px" style={{flex:1}}><H size={13} color="var(--muted)">Make / model</H></Box>
            <Btn primary>Search</Btn>
          </Box>
          <div style={{height:12}}/>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {['Toyota','Lexus','BMW','Mercedes','GMC','Porsche'].map(b=> <Chip key={b}>{b}</Chip>)}
          </div>
          <div style={{height:24}}/>
          <H size={13} color="var(--muted)">▸ 1,240 cars in stock · 71-pt inspected · home delivery</H>
          <div style={{position:'absolute', bottom:24, left:28, right:28}}>
            <div style={{height:80, border:'1.5px dashed var(--ink)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <Img variant="car" h={70} w="92%" style={{border:'none'}}/>
            </div>
          </div>
        </div>

        {/* Sell side */}
        <div style={{padding:'34px 28px', background:'var(--royal)', color:'#fff', position:'relative'}}>
          <H size={11} weight={700} family="ui" style={{letterSpacing:2, opacity:.85}}>FOR SELLERS</H>
          <div style={{height:6}}/>
          <H family="caveat" size={40} weight={700} color="#fff" style={{lineHeight:1.05}}>Sell yours in days.<br/>Get a guaranteed offer.</H>
          <div style={{height:18}}/>
          <Box rough p={4} style={{display:'flex', gap:4, background:'#fff'}}>
            <Box rough thin p="8px 12px" style={{flex:1, background:'#fff'}}><H size={13} color="var(--muted)">Plate or Make & model + year</H></Box>
            <Btn style={{background:'#fff', color:'var(--royal)', borderColor:'#fff', fontWeight:700}}>Get offer</Btn>
          </Box>
          <div style={{height:24}}/>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {['✓ Instant valuation in 30 seconds','✓ Guaranteed for 7 days','✓ Concierge service available','✓ We handle MOI transfer'].map(t=>
              <H key={t} size={14} color="#fff" style={{opacity:.95}}>{t}</H>
            )}
          </div>
        </div>
        <Annot top={120} left="48%" dir="up" color="#fff" w={150}>The 50/50 split signals "we do both equally well"</Annot>
      </div>

      <TrustBar/>

      <Rail title="Just arrived" subtitle="this week"/>
      <Rail title="Inspected · warrantied" badge="Certified"/>
      <Rail title="Premium under KWD 20K"/>

      <div style={{padding:'30px 28px', borderTop:'1.5px solid var(--ink)'}}>
        <H family="caveat" size={26} weight={700}>Why Behbehani?</H>
        <div style={{height:14}}/>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18}}>
          {[
            ['71-pt inspection','Every retail car. Mechanical, electronic, body, test-drive.'],
            ['Side-by-side bank offers','NBK · KFH · Burgan · ABK — pick the best APR live.'],
            ['3-day / 300 km return','Drive it home. Change your mind? We collect.'],
          ].map(([t,d])=>(
            <Box key={t} rough p={20} accent="blue-2">
              <H size={16} weight={700}>{t}</H>
              <div style={{height:8}}/>
              <H size={13} color="var(--muted)">{d}</H>
            </Box>
          ))}
        </div>
      </div>
      <Footer/>
    </Browser>
  );
}

// ── C · Editorial / premium ────────────────────────────────────────────
// Full-bleed featured car, magazine-style typography, fewer but bigger rails.
// Says "we are a premium dealer with curated stock". Quieter than A & B.
function HomeEditorial(){
  return (
    <Browser url="behbehanimotors.com.kw / home · editorial">
      <NavBar minimal/>

      <div style={{position:'relative', height:580, borderBottom:'1.5px solid var(--ink)', overflow:'hidden'}}>
        <Img variant="car" h="100%" w="100%" style={{border:'none'}}/>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 30%, rgba(0,0,0,.6) 100%)'}}/>
        <div style={{position:'absolute', left:40, right:40, bottom:40, color:'#fff'}}>
          <H size={12} color="#fff" weight={700} family="ui" style={{letterSpacing:3, opacity:.9}}>FEATURE OF THE WEEK</H>
          <div style={{height:8}}/>
          <H family="caveat" size={56} color="#fff" weight={700} style={{lineHeight:1}}>2024 Lexus LX 600</H>
          <div style={{height:8}}/>
          <H size={18} color="#fff" style={{opacity:.9}}>One owner · 12,400 km · GCC specs · with full warranty</H>
          <div style={{height:20}}/>
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <Btn big primary style={{background:'#fff', color:'var(--royal)', borderColor:'#fff'}}>Reserve for KWD 100</Btn>
            <Btn big style={{background:'transparent', color:'#fff', borderColor:'#fff'}}>View detail</Btn>
            <H size={16} color="#fff" weight={700} style={{marginLeft:'auto'}}>KWD 38,500</H>
          </div>
        </div>
        <Annot top={40} right={30} dir="right" color="#fff" w={150}>Editorial cover gives space — assumes premium positioning</Annot>
      </div>

      {/* Quiet search */}
      <div style={{padding:'30px 40px', background:'var(--paper-2)', borderBottom:'1.5px solid var(--ink)'}}>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <H size={14} weight={700}>Looking for something specific?</H>
          <Box rough p="6px 14px" style={{flex:1, background:'#fff'}}><H size={13} color="var(--muted)">Make, model, or budget…</H></Box>
          <Btn primary>Search 1,240 cars</Btn>
        </div>
      </div>

      <Rail title="The collection" subtitle="curated, inspected, ready"/>
      <Rail title="Under KWD 10,000" subtitle="best value picks"/>

      <div style={{padding:'50px 40px', background:'#1a1a1a', color:'#fff'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:40, alignItems:'center'}}>
          <div>
            <H family="caveat" size={36} color="#fff" weight={700}>The 71-point inspection.</H>
            <div style={{height:14}}/>
            <H size={15} color="#fff" style={{opacity:.85, lineHeight:1.6}}>Every retail car spends a day with our technicians before it hits the floor. Mechanical, electronic, interior, body, and a full test drive — documented, photographed, and embedded right on the listing.</H>
            <div style={{height:18}}/>
            <Btn style={{background:'#fff', color:'#000', borderColor:'#fff'}}>See a sample report →</Btn>
          </div>
          <Box rough h={260} fill="paper-2" p={20}>
            <H size={14} weight={700}>EXTERIOR</H>
            <Lines n={3} widths={['mid','long','short']}/>
            <div style={{height:10}}/>
            <H size={14} weight={700}>MECHANICAL</H>
            <Lines n={3} widths={['long','mid','long']}/>
            <div style={{height:10}}/>
            <H size={14} weight={700}>TEST DRIVE</H>
            <Lines n={2} widths={['full','mid']}/>
          </Box>
        </div>
      </div>

      <Rail title="Sell with us" subtitle="concierge service"/>
      <Footer/>
    </Browser>
  );
}

// ── D · Search-first / dense ───────────────────────────────────────────
// No hero — filters and results above the fold. For people who treat the
// home page as a directory. Inspired by Dubizzle / classifieds patterns.
function HomeSearchFirst(){
  return (
    <Browser url="behbehanimotors.com.kw / home · search-first">
      <NavBar/>

      {/* Compact search row */}
      <div style={{padding:'18px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
          <H size={13} weight={700}>1,240 cars in Kuwait</H>
          <div style={{display:'flex', gap:6}}>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>All brands ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>Body ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>Year ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>Price ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>KM ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>Fuel ▾</H></Box>
            <Box rough thin p="6px 10px" style={{background:'#fff'}}><H size={12}>Transmission ▾</H></Box>
          </div>
          <div style={{flex:1}}/>
          <Btn primary>Apply →</Btn>
        </div>
      </div>

      {/* Active facets */}
      <div style={{padding:'10px 28px', borderBottom:'1px solid var(--light)', display:'flex', gap:6, alignItems:'center'}}>
        <H size={12} color="var(--muted)">Popular:</H>
        {['Toyota Camry','Lexus','SUVs under 10K','Auto only','Inspected','Reserve-enabled'].map(p=>
          <Chip key={p} accent>{p}</Chip>
        )}
      </div>

      {/* Big results grid taking most of the page */}
      <div style={{padding:'20px 28px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14}}>
          <H family="caveat" size={22} weight={700}>Latest listings</H>
          <H size={13} color="var(--muted)">Sort: Newest ▾  ·  ⊞ Grid / ☰ List</H>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
          {Array.from({length:12}).map((_,i)=>(
            <CarCard key={i} h={220} w="100%"
              badge={i%4===0?'Inspected':i%4===1?'Reserve':null}
              drop={i===5}
              reserved={i===7}
              price={`KWD ${(5+i*0.6).toFixed(1)}K`}
              monthly={`KWD ${110+i*8}/mo`}
              model={['Toyota Camry','Lexus IS','BMW 3-series','Nissan Patrol','GMC Yukon','Mercedes C200','Mazda CX-5','Hyundai Elantra','Porsche Macan','Kia Sportage','Honda Accord','Ford Edge'][i]}
              blue={i%4===0}/>
          ))}
        </div>
      </div>

      <Annot top={210} right={12} dir="right" w={140}>Bet the home page is a filter, not a brochure</Annot>

      {/* Lower density rails — secondary */}
      <Rail title="Inspected & warrantied" subtitle="trust shelf"/>

      <Footer/>
    </Browser>
  );
}

Object.assign(window, { HomeClassic, HomeDual, HomeEditorial, HomeSearchFirst });
