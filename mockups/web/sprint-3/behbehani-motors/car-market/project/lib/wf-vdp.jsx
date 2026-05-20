// wf-vdp.jsx — Vehicle Detail Page variations.

function InspectionPanel({compact=false}){
  const groups = [
    ['Exterior', 14, 'A−', 'Minor scratch · rear bumper'],
    ['Mechanical', 22, 'A', 'All pass · 0 issues'],
    ['Electronic', 12, 'A', 'All pass'],
    ['Interior', 11, 'B+', 'Wear on driver seat bolster'],
    ['Test drive', 12, 'A', 'Brakes, steering, transmission OK'],
  ];
  return (
    <Box rough p={compact?14:22} accent="blue-2">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
        <div>
          <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>71-POINT INSPECTION</H>
          <div style={{height:4}}/>
          <H family="caveat" size={compact?22:28} weight={700}>Overall · A−</H>
        </div>
        <Box rough w={70} h={70} fill="royal" style={{display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%'}}>
          <H size={24} color="#fff" weight={700}>67<span style={{fontSize:14,opacity:.7}}>/71</span></H>
        </Box>
      </div>
      <div style={{height:14}}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8}}>
        {groups.map(([g,n,grade])=>(
          <Box key={g} rough thin p={10} style={{background:'#fff'}}>
            <H size={11} color="var(--muted)">{g}</H>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <H size={20} weight={700}>{grade}</H>
              <H size={10} color="var(--muted)">{n} pts</H>
            </div>
          </Box>
        ))}
      </div>
      <div style={{height:14}}/>
      <div style={{display:'flex', flexDirection:'column', gap:5}}>
        {groups.slice(0,compact?2:5).map(([g,,,note])=>(
          <div key={g} style={{display:'flex', gap:8}}>
            <H size={12} weight={700} style={{width:90}}>{g}</H>
            <H size={12} color="var(--muted)">{note}</H>
          </div>
        ))}
      </div>
      <div style={{height:10}}/>
      <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>View full 71-point report → (PDF · AR/EN)</H>
    </Box>
  );
}

function SpecGrid(){
  const specs = [
    ['Make','Toyota'], ['Model','Camry GLX'], ['Year','2022'],
    ['Mileage','42,300 km'], ['Transmission','Automatic'], ['Fuel','Petrol'],
    ['Engine','2.5L · 4 cyl'], ['Drivetrain','FWD'], ['Body','Sedan'],
    ['Color (ext.)','Pearl white'], ['Color (int.)','Black leather'], ['Seats','5'],
    ['Regional specs','GCC'], ['VIN','••••••3471'], ['Prev. owners','1'],
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px 24px'}}>
      {specs.map(([k,v])=>(
        <div key={k} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed var(--light)', padding:'4px 0'}}>
          <H size={12} color="var(--muted)">{k}</H>
          <H size={12} weight={700}>{v}</H>
        </div>
      ))}
    </div>
  );
}

function VdpHeader(){
  return (
    <>
      <NavBar active="Buy a Car"/>
      <div style={{padding:'10px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <H size={12} color="var(--muted)">Used cars › Toyota › Camry › 2022 GLX</H>
      </div>
    </>
  );
}

function VdpTitleRow({reserveBtn=true}){
  return (
    <div style={{padding:'20px 28px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20}}>
      <div>
        <H family="caveat" size={32} weight={700}>2022 Toyota Camry GLX</H>
        <div style={{height:6}}/>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <Chip accent>71-pt inspected</Chip>
          <Chip>1 owner</Chip>
          <Chip>GCC specs</Chip>
          <Chip>No accident</Chip>
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        <H size={11} color="var(--muted)">Fair price · KWD 6,750</H>
        <H family="caveat" size={32} weight={700} color="var(--royal)">KWD 6,750</H>
        <H size={12} color="var(--muted)">≈ KWD 145 / month · 60 mo</H>
        {reserveBtn && (
          <>
            <div style={{height:10}}/>
            <Btn primary big>Reserve for KWD 100 →</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ── A · Gallery hero, sequential scroll
function VdpGallery(){
  return (
    <Browser url="behbehanimotors.com.kw / car-details/toyota-camry-glx/8421">
      <VdpHeader/>

      <div style={{padding:'18px 28px'}}>
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, height:420}}>
          <Img variant="car" h="100%"><span style={{fontSize:13}}>Hero · 25+ HD photos · 360°</span></Img>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <Img variant="" h="100%" label="Interior"/>
            <Img variant="" h="100%" label="Engine bay"/>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <Img variant="" h="100%" label="360° spin"/>
            <Img variant="" h="100%" label="Walkaround video · 1:48"/>
          </div>
        </div>
        <div style={{height:8}}/>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <Btn>⊞ View all 28 photos</Btn>
          <Btn>↻ 360° interactive</Btn>
          <Btn>▶ Play walkaround</Btn>
          <div style={{flex:1}}/>
          <Btn>♡ Save</Btn>
          <Btn>↗ Share</Btn>
        </div>
      </div>

      <VdpTitleRow/>
      <TrustBar/>

      <div style={{padding:'30px 28px', display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:30}}>
        <div style={{display:'flex', flexDirection:'column', gap:26}}>
          <Section title="At a glance">
            <SpecGrid/>
          </Section>

          <Section title="71-point inspection report" badge="Trust anchor">
            <InspectionPanel/>
          </Section>

          <Section title="Features & equipment">
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10}}>
              {['Safety','Comfort','Technology','Performance'].map(g=>(
                <Box key={g} rough p={12} thin>
                  <H size={12} weight={700}>{g}</H>
                  <div style={{height:6}}/>
                  <Lines n={4} widths={['long','mid','short','long']}/>
                </Box>
              ))}
            </div>
          </Section>

          <Section title="Vehicle history">
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10}}>
              {[['Owners','1'],['Accidents','None reported'],['Service history','3 records · Toyota service']].map(([k,v])=>(
                <Box key={k} rough p={12} thin><H size={11} color="var(--muted)">{k}</H><H size={15} weight={700}>{v}</H></Box>
              ))}
            </div>
          </Section>
        </div>

        {/* Right rail — finance / insurance / delivery quick calcs */}
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          <Box rough p={16} accent="blue-2">
            <H size={12} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:1.5}}>FINANCE THIS CAR</H>
            <div style={{height:10}}/>
            <H size={11} color="var(--muted)">Monthly payment</H>
            <H family="caveat" size={28} weight={700} color="var(--royal)">KWD 145</H>
            <div style={{height:8}}/>
            <div style={{display:'flex', gap:6}}>
              <Box rough thin p="4px 8px" style={{flex:1, background:'#fff'}}><H size={11}>Down: 500</H></Box>
              <Box rough thin p="4px 8px" style={{flex:1, background:'#fff'}}><H size={11}>60 mo ▾</H></Box>
            </div>
            <div style={{height:10}}/>
            <Btn primary style={{width:'100%', justifyContent:'center'}}>Pre-qualify · soft check</Btn>
          </Box>
          <Box rough p={16}>
            <H size={12} weight={700} family="ui" style={{letterSpacing:1.5}}>ONE-CLICK INSURANCE</H>
            <div style={{height:6}}/>
            <H size={12} color="var(--muted)">From KWD 95/year · third-party · or KWD 220/y comprehensive</H>
            <div style={{height:10}}/>
            <Btn>See quotes</Btn>
          </Box>
          <Box rough p={16}>
            <H size={12} weight={700} family="ui" style={{letterSpacing:1.5}}>HOME DELIVERY</H>
            <div style={{height:6}}/>
            <H size={12}>Delivered to <u>Hawalli</u> in 2 days</H>
            <H size={11} color="var(--muted)">Free above KWD 3,000</H>
          </Box>
          <Box rough p={16}>
            <H size={13} weight={700}>Sold by Behbehani Retail</H>
            <H size={11} color="var(--muted)">★★★★★ · 1,240 reviews · responds in 12 min</H>
            <div style={{height:8}}/>
            <div style={{display:'flex', gap:6}}>
              <Btn>Make offer</Btn>
              <Btn>Test drive</Btn>
              <Btn>Chat</Btn>
            </div>
          </Box>
        </div>
      </div>

      <Section title="Similar cars" inline>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'0 28px 30px'}}>
          {Array.from({length:4}).map((_,i)=>(
            <CarCard key={i} h={220} w="100%" model={['Honda Accord','Nissan Altima','Mazda 6','Hyundai Sonata'][i]} price={`KWD ${(6.4+i*0.2).toFixed(1)}K`}/>
          ))}
        </div>
      </Section>
      <Annot top={460} right={20} dir="right" w={130}>Gallery-first feels generic — explore alternatives</Annot>
      <Footer/>
    </Browser>
  );
}

function Section({title, badge, children, inline}){
  return (
    <div style={{padding: inline?'18px 0 0':0}}>
      <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom: inline?12:14, padding: inline?'0 28px':0}}>
        <H family="caveat" size={24} weight={700}>{title}</H>
        {badge && <Badge royal>{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}

// ── B · Sticky price/CTA rail (most VDPs work this way)
function VdpSticky(){
  return (
    <Browser url="behbehanimotors.com.kw / car-details · sticky rail">
      <VdpHeader/>

      <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:0}}>
        <div style={{padding:'18px 0 18px 28px'}}>
          <Img variant="car" h={420} w="100%"><span style={{fontSize:13}}>Hero photo · click for gallery</span></Img>
          <div style={{height:8}}/>
          <div style={{display:'flex', gap:6}}>
            {Array.from({length:6}).map((_,i)=> <Img key={i} variant="" h={70} w={92}/>)}
            <Box rough w={92} h={70} style={{display:'flex',alignItems:'center',justifyContent:'center'}}><H size={12} weight={700}>+22</H></Box>
          </div>

          <div style={{height:30}}/>
          <H family="caveat" size={32} weight={700}>2022 Toyota Camry GLX</H>
          <div style={{height:6}}/>
          <div style={{display:'flex', gap:6}}>
            <Chip accent>71-pt inspected · A−</Chip>
            <Chip>1 owner</Chip>
            <Chip>GCC</Chip>
          </div>

          <div style={{height:24}}/>
          <H family="caveat" size={22} weight={700}>About this car</H>
          <Lines n={3} widths={['full','long','mid']}/>

          <div style={{height:24}}/>
          <SpecGrid/>

          <div style={{height:30}}/>
          <Section title="71-point inspection"><InspectionPanel/></Section>

          <div style={{height:30}}/>
          <H family="caveat" size={22} weight={700}>Vehicle history</H>
          <div style={{height:8}}/>
          <Box rough p={12} style={{display:'flex', gap:20}}>
            <div><H size={11} color="var(--muted)">Owners</H><H size={18} weight={700}>1</H></div>
            <div><H size={11} color="var(--muted)">Accidents</H><H size={18} weight={700}>None</H></div>
            <div><H size={11} color="var(--muted)">Service records</H><H size={18} weight={700}>3</H></div>
          </Box>
        </div>

        {/* Sticky right rail */}
        <div style={{padding:'18px 28px 0'}}>
          <div style={{position:'sticky', top:0, display:'flex', flexDirection:'column', gap:14}}>
            <Box rough p={20} fill="paper-2">
              <H size={11} color="var(--muted)">Listed price · KWD</H>
              <H family="caveat" size={42} weight={700} color="var(--royal)">6,750.000</H>
              <H size={12} color="var(--muted)">↓ KWD 250 from last week · Fair price band</H>
              <div style={{height:14}}/>
              <Btn primary big style={{width:'100%', justifyContent:'center', padding:'14px'}}>RESERVE FOR KWD 100</Btn>
              <H size={11} color="var(--muted)" style={{textAlign:'center', marginTop:4}}>Refundable · 48-hour hold</H>
              <div style={{height:10}}/>
              <div style={{display:'flex', gap:6}}>
                <Btn style={{flex:1, justifyContent:'center'}}>Make offer</Btn>
                <Btn style={{flex:1, justifyContent:'center'}}>Test drive</Btn>
              </div>
            </Box>

            <Box rough p={16} accent="blue-2">
              <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>FINANCE</H>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                <H family="caveat" size={26} weight={700} color="var(--royal)">KWD 145</H>
                <H size={11} color="var(--muted)">/ mo · 60 mo · 4.99%</H>
              </div>
              <div style={{height:6}}/>
              <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>Compare offers from 6 banks →</H>
            </Box>

            <Box rough p={16}>
              <H size={11} weight={700} family="ui" style={{letterSpacing:2}}>INSURANCE</H>
              <H size={12}>From KWD 95/yr · activate at checkout</H>
            </Box>

            <Box rough p={16}>
              <H size={11} weight={700} family="ui" style={{letterSpacing:2}}>DELIVERY</H>
              <H size={12}>To Hawalli · 2 days</H>
              <H size={11} color="var(--muted)">Live driver tracking included</H>
            </Box>
          </div>
        </div>
      </div>
      <Annot top={180} right={6} dir="right" w={130}>Sticky CTA is the conversion workhorse</Annot>
      <Footer/>
    </Browser>
  );
}

// ── C · Inspection-first — lead with the 71-pt report
function VdpInspection(){
  return (
    <Browser url="behbehanimotors.com.kw / car-details · inspection-first">
      <VdpHeader/>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderBottom:'1.5px solid var(--ink)'}}>
        <div style={{position:'relative'}}>
          <Img variant="car" h={460} w="100%" style={{borderRadius:0, borderLeft:'none', borderTop:'none', borderBottom:'none'}}/>
          <div style={{position:'absolute', top:14, left:14, display:'flex', gap:6}}>
            <Badge royal>71-pt inspected</Badge>
            <Badge>3-day return</Badge>
          </div>
          <div style={{position:'absolute', bottom:14, left:14, color:'#fff'}}>
            <H size={11} color="#fff" weight={700} family="ui" style={{letterSpacing:2}}>1 / 28 PHOTOS</H>
          </div>
        </div>
        <div style={{padding:'30px 28px', background:'var(--royal)', color:'#fff'}}>
          <H size={11} color="#fff" weight={700} family="ui" style={{letterSpacing:2, opacity:.85}}>BEFORE YOU EVEN SEE THE CAR</H>
          <div style={{height:6}}/>
          <H family="caveat" size={36} color="#fff" weight={700}>We've inspected it. 71 points. Documented.</H>
          <div style={{height:18}}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10}}>
            {[['Exterior','A−'],['Mechanical','A'],['Electronic','A'],['Interior','B+'],['Test drive','A'],['Overall','A−']].map(([g,grade])=>(
              <Box key={g} rough thin p={10} style={{background:'rgba(255,255,255,.12)', borderColor:'rgba(255,255,255,.4)'}}>
                <H size={11} color="#fff" style={{opacity:.8}}>{g}</H>
                <H size={22} weight={700} color="#fff">{grade}</H>
              </Box>
            ))}
          </div>
          <div style={{height:16}}/>
          <Btn big style={{background:'#fff', color:'var(--royal)', borderColor:'#fff'}}>See the full report →</Btn>
        </div>
      </div>

      <VdpTitleRow/>

      <div style={{padding:'24px 28px', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:30}}>
        <div>
          <H family="caveat" size={24} weight={700}>What the inspector found</H>
          <div style={{height:8}}/>
          <H size={13} color="var(--muted)">Items flagged ‘Needs attention’ (3) and ‘Failed’ (0). Click any item for photo evidence.</H>
          <div style={{height:14}}/>
          {[
            ['EX-12','Rear bumper · minor scratch','Low','📷'],
            ['IN-04','Driver seat bolster wear','Medium','📷'],
            ['EL-09','Cabin filter due in 3,000 km','Low','—'],
          ].map(([id,note,sev,p])=>(
            <Box key={id} rough thin p={10} style={{display:'flex', gap:14, marginBottom:8, alignItems:'center'}}>
              <Box rough thin w={50} h={40} style={{display:'flex', alignItems:'center', justifyContent:'center'}}><H size={11} weight={700}>{id}</H></Box>
              <div style={{flex:1}}><H size={13}>{note}</H></div>
              <Chip>{sev}</Chip>
              <H size={14}>{p}</H>
            </Box>
          ))}
          <div style={{height:14}}/>
          <H size={13} color="var(--royal)" style={{textDecoration:'underline'}}>Show all 68 passing items + photos →</H>
        </div>

        <Box rough p={20} accent="blue-2">
          <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:1.5}}>READY TO MOVE FORWARD</H>
          <div style={{height:8}}/>
          <H family="caveat" size={26} weight={700}>Reserve · KWD 100</H>
          <H size={12} color="var(--muted)">Refundable · holds car for 48 hours</H>
          <div style={{height:14}}/>
          <Btn primary big style={{width:'100%', justifyContent:'center'}}>Reserve →</Btn>
          <div style={{height:10}}/>
          <H size={12}>★ Includes free 7-day extended return window</H>
        </Box>
      </div>

      <Annot top={420} left="48%" dir="up" color="#fff" w={150}>Inspection-first re-frames the page around trust</Annot>

      <Section title="The rest of the details" inline>
        <div style={{padding:'0 28px 30px'}}>
          <SpecGrid/>
        </div>
      </Section>
      <Footer/>
    </Browser>
  );
}

// ── D · Mobile companion
function VdpMobile(){
  return (
    <Phone>
      {/* Hero */}
      <div style={{position:'relative'}}>
        <Img variant="car" h={220} w="100%" style={{borderRadius:0, borderLeft:'none', borderRight:'none', borderTop:'none'}}/>
        <div style={{position:'absolute', top:10, left:10, display:'flex', gap:6}}>
          <Badge royal>Inspected</Badge>
        </div>
        <div style={{position:'absolute', top:10, right:10, display:'flex', gap:6}}>
          <div style={{width:30, height:30, borderRadius:'50%', background:'#fff', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>♡</div>
          <div style={{width:30, height:30, borderRadius:'50%', background:'#fff', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>↗</div>
        </div>
        <div style={{position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.6)', color:'#fff', padding:'2px 10px', borderRadius:99, fontSize:11, fontFamily:'Kalam'}}>1 / 28</div>
      </div>

      <div style={{padding:'14px 16px'}}>
        <H family="caveat" size={22} weight={700}>2022 Toyota Camry GLX</H>
        <div style={{display:'flex', gap:6, marginTop:4}}>
          <Chip accent>71-pt</Chip>
          <Chip>1 owner</Chip>
          <Chip>GCC</Chip>
        </div>
        <div style={{height:10}}/>
        <Box rough p={12} accent="blue-2">
          <H size={11} color="var(--muted)">Listed price</H>
          <H family="caveat" size={26} weight={700} color="var(--royal)">KWD 6,750</H>
          <H size={11} color="var(--muted)">~ KWD 145/mo · 60 mo</H>
        </Box>
        <div style={{height:10}}/>
        <div style={{display:'flex', gap:6}}>
          <Btn primary big style={{flex:1, justifyContent:'center'}}>Reserve · 100</Btn>
          <Btn icon>✉</Btn>
          <Btn icon>☎</Btn>
        </div>

        <div style={{height:14}}/>
        <Box rough p={10} accent="blue">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <H size={12} weight={700} color="var(--royal)">71-pt inspection · A−</H>
            <H size={12} color="var(--royal)">View →</H>
          </div>
        </Box>

        <div style={{height:14}}/>
        <H size={13} weight={700}>Specs</H>
        <Lines n={3} widths={['full','long','mid']}/>

        <div style={{height:14}}/>
        <H size={13} weight={700}>Finance · insurance · delivery</H>
        <div style={{display:'flex', gap:6, marginTop:6}}>
          <Box rough thin p={8} style={{flex:1}}><H size={11}>From 145/mo</H></Box>
          <Box rough thin p={8} style={{flex:1}}><H size={11}>Ins. 95/yr</H></Box>
          <Box rough thin p={8} style={{flex:1}}><H size={11}>2-day</H></Box>
        </div>

        <div style={{height:14}}/>
        <H size={13} weight={700}>Similar</H>
        <div style={{display:'flex', gap:8, overflowX:'auto', paddingTop:6}}>
          {Array.from({length:3}).map((_,i)=> <CarCard key={i} h={170} w={150} model={['Accord','Altima','Sonata'][i]} price={`KWD ${(6.4+i*0.2).toFixed(1)}K`}/>)}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{position:'sticky', bottom:0, padding:'10px 16px', background:'var(--paper)', borderTop:'1.5px solid var(--ink)'}}>
        <Btn primary big style={{width:'100%', justifyContent:'center'}}>Reserve for KWD 100</Btn>
      </div>
    </Phone>
  );
}

Object.assign(window, { VdpGallery, VdpSticky, VdpInspection, VdpMobile });
