// Resource resolver: uses bundled blob URL if available, otherwise the remote URL
function __R(id, fallback){ return (typeof window!=="undefined" && window.__resources && window.__resources[id]) || fallback; }
window.__R = __R;

/* eslint-disable */
// Mock data for Behbehani Motors marketplace prototype.

const BRAND = {
  name:      "Behbehani Motors",
  nameAr:    "بهبهاني للسيارات",
  tagline:   "Kuwait's trusted way to buy, sell and own.",
  taglineAr: "الطريقة الموثوقة في الكويت لشراء وبيع وامتلاك السيارات.",
  phone:     "+965 22 282 282",
};

// Top brands in Kuwait — used for hero "shop by brand"
const BRANDS = [
  { id:"toyota",     name:"Toyota",      nameAr:"تويوتا",     domain:"toyota.com" },
  { id:"lexus",      name:"Lexus",       nameAr:"لكزس",       domain:"lexus.com" },
  { id:"mercedes",   name:"Mercedes",    nameAr:"مرسيدس",     domain:"mercedes-benz.com" },
  { id:"bmw",        name:"BMW",         nameAr:"بي إم دبليو", domain:"bmw.com" },
  { id:"nissan",     name:"Nissan",      nameAr:"نيسان",      domain:"nissan-global.com" },
  { id:"ford",       name:"Ford",        nameAr:"فورد",       domain:"ford.com" },
  { id:"range",      name:"Land Rover",  nameAr:"لاند روفر",  domain:"landroverusa.com" },
  { id:"porsche",    name:"Porsche",     nameAr:"بورشه",      domain:"porsche.com" },
  { id:"honda",      name:"Honda",       nameAr:"هوندا",      domain:"honda.com" },
  { id:"audi",       name:"Audi",        nameAr:"أودي",       domain:"audi.com" },
  { id:"tesla",      name:"Tesla",       nameAr:"تسلا",       domain:"tesla.com" },
  { id:"gmc",        name:"GMC",         nameAr:"جي إم سي",   domain:"gmc.com" },
  { id:"chevrolet",  name:"Chevrolet",   nameAr:"شيفروليه",   domain:"chevrolet.com" },
  { id:"kia",        name:"Kia",         nameAr:"كيا",        domain:"kia.com" },
  { id:"hyundai",    name:"Hyundai",     nameAr:"هيونداي",    domain:"hyundai.com" },
  { id:"jeep",       name:"Jeep",        nameAr:"جيب",        domain:"jeep.com" },
];

const BODY_TYPES = [
  { id:"sedan",       name:"Sedan",       nameAr:"سيدان" },
  { id:"suv",         name:"SUV",         nameAr:"دفع رباعي" },
  { id:"coupe",       name:"Coupe",       nameAr:"كوبيه" },
  { id:"convertible", name:"Convertible", nameAr:"مكشوفة" },
  { id:"pickup",      name:"Pickup",      nameAr:"بيك أب" },
  { id:"hatchback",   name:"Hatchback",   nameAr:"هاتشباك" },
  { id:"minivan",     name:"Minivan",     nameAr:"ميني فان" },
];

// Image URLs are real Unsplash photos. onError in <img> falls back to a
// gradient placeholder so layout never breaks.
const CARS = [
  { id:"BMC-2401", brand:"toyota",    model:"Camry XLE",          year:2022, mileage:45200, price:5200,  monthly:108,  body:"sedan",       transmission:"Automatic", fuel:"Petrol",   exterior:"Pearl White",   interior:"Beige Leather", cylinders:4, drive:"FWD", specs:"GCC",      seats:5, location:"Hawalli",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car01","https://images.unsplash.com/photo-1621135802920-133df287f89c?w=1200&q=80"),  color:"#e8eaee", accidents:0, owners:1 },
  { id:"BMC-2402", brand:"lexus",     model:"RX 350 F-Sport",     year:2021, mileage:32100, price:9800,  monthly:202,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Atomic Silver", interior:"Black Leather", cylinders:6, drive:"AWD", specs:"GCC",      seats:7, location:"Salmiya",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Premium",     image:__R("car02","https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80"),  color:"#c8ccd2", accidents:0, owners:1 },
  { id:"BMC-2403", brand:"mercedes",  model:"C 300 AMG-Line",     year:2023, mileage:18400, price:11500, monthly:237,  body:"sedan",       transmission:"Automatic", fuel:"Petrol",   exterior:"Obsidian Black",interior:"Red Leather",   cylinders:4, drive:"RWD", specs:"GCC",      seats:5, location:"Kuwait City",seller:"Behbehani Motors",sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Low Mileage", image:__R("car03","https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=80"),  color:"#1a1d22", accidents:0, owners:1 },
  { id:"BMC-2404", brand:"bmw",       model:"X5 xDrive40i",       year:2022, mileage:38900, price:14200, monthly:293,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Carbon Black",  interior:"Cognac Leather",cylinders:6, drive:"AWD", specs:"European",seats:7, location:"Jabriya",   seller:"Auto Plaza KW",    sellerType:"Dealer",   inspected:true,  warranty:false, return:false, delivery:true,  badge:"Inspected",   image:__R("car04","https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80"),  color:"#0f1116", accidents:0, owners:2 },
  { id:"BMC-2405", brand:"nissan",    model:"Patrol Platinum",    year:2021, mileage:55800, price:12800, monthly:264,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Hermosa Blue",  interior:"Tan Leather",   cylinders:8, drive:"4WD", specs:"GCC",      seats:8, location:"Farwaniya", seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car05","https://images.unsplash.com/photo-1606664922998-f180baa4ef91?w=1200&q=80"),  color:"#2b3a4f", accidents:0, owners:1 },
  { id:"BMC-2406", brand:"ford",      model:"Mustang GT 5.0",     year:2020, mileage:42300, price:8500,  monthly:175,  body:"coupe",       transmission:"Manual",    fuel:"Petrol",   exterior:"Race Red",      interior:"Black Cloth",   cylinders:8, drive:"RWD", specs:"American",seats:4, location:"Salmiya",   seller:"Reza Motors",      sellerType:"Dealer",   inspected:true,  warranty:false, return:false, delivery:true,  badge:"Recently Added", image:__R("car06","https://images.unsplash.com/photo-1547744822-39ade1b67762?w=1200&q=80"),  color:"#a91322", accidents:1, owners:2 },
  { id:"BMC-2407", brand:"range",     model:"Range Rover Sport",  year:2022, mileage:28600, price:18500, monthly:381,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Santorini Black",interior:"Ivory Leather",cylinders:6, drive:"AWD", specs:"European",seats:5, location:"Kuwait City",seller:"Behbehani Motors",sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Premium",     image:__R("car07","https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&q=80"),  color:"#101319", accidents:0, owners:1 },
  { id:"BMC-2408", brand:"porsche",   model:"911 Carrera S",      year:2021, mileage:15200, price:32000, monthly:660,  body:"coupe",       transmission:"Automatic", fuel:"Petrol",   exterior:"GT Silver",     interior:"Black Leather", cylinders:6, drive:"RWD", specs:"European",seats:4, location:"Salmiya",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Premium",     image:__R("car08","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"),  color:"#b8babd", accidents:0, owners:1 },
  { id:"BMC-2409", brand:"honda",     model:"Accord Sport 2.0T",  year:2023, mileage:22400, price:6200,  monthly:128,  body:"sedan",       transmission:"Automatic", fuel:"Petrol",   exterior:"Modern Steel",  interior:"Black Cloth",   cylinders:4, drive:"FWD", specs:"GCC",      seats:5, location:"Hawalli",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car02","https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80"),  color:"#39414b", accidents:0, owners:1 },
  { id:"BMC-2410", brand:"audi",      model:"A6 45 TFSI",         year:2022, mileage:35100, price:10800, monthly:223,  body:"sedan",       transmission:"Automatic", fuel:"Petrol",   exterior:"Daytona Grey",  interior:"Atlas Beige",   cylinders:4, drive:"AWD", specs:"European",seats:5, location:"Jabriya",   seller:"Bavaria Cars",     sellerType:"Dealer",   inspected:true,  warranty:true,  return:false, delivery:true,  badge:"Price Drop",  image:__R("car09","https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80"),  color:"#5a5e63", accidents:0, owners:1 },
  { id:"BMC-2411", brand:"tesla",     model:"Model Y Long Range", year:2023, mileage:12100, price:12500, monthly:258,  body:"suv",         transmission:"Automatic", fuel:"Electric", exterior:"Solid White",   interior:"Black Vegan",   cylinders:0, drive:"AWD", specs:"American",seats:5, location:"Kuwait City",seller:"Behbehani Motors",sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Low Mileage", image:__R("car10","https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200&q=80"),  color:"#dde0e3", accidents:0, owners:1 },
  { id:"BMC-2412", brand:"gmc",       model:"Yukon Denali",       year:2022, mileage:30200, price:13500, monthly:279,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Onyx Black",    interior:"Brownstone",    cylinders:8, drive:"4WD", specs:"American",seats:7, location:"Farwaniya", seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car11","https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=80"),  color:"#0c0e13", accidents:0, owners:1 },
  { id:"BMC-2413", brand:"chevrolet", model:"Tahoe LT",           year:2021, mileage:48700, price:11200, monthly:231,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Empire Beige",  interior:"Jet Black",     cylinders:8, drive:"4WD", specs:"American",seats:8, location:"Salmiya",   seller:"Reza Motors",      sellerType:"Dealer",   inspected:false, warranty:false, return:false, delivery:false, badge:"Recently Added", image:__R("car12","https://images.unsplash.com/photo-1612825173281-9a193378527e?w=1200&q=80"),  color:"#c5b59a", accidents:0, owners:2 },
  { id:"BMC-2414", brand:"kia",       model:"Sportage GT-Line",   year:2023, mileage:18900, price:5800,  monthly:120,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Snow White",    interior:"Charcoal",      cylinders:4, drive:"AWD", specs:"GCC",      seats:5, location:"Hawalli",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car13","https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80"),  color:"#dadce0", accidents:0, owners:1 },
  { id:"BMC-2415", brand:"hyundai",   model:"Sonata N-Line",      year:2022, mileage:38500, price:4800,  monthly:99,   body:"sedan",       transmission:"Automatic", fuel:"Petrol",   exterior:"Phantom Black", interior:"Black Cloth",   cylinders:4, drive:"FWD", specs:"GCC",      seats:5, location:"Farwaniya", seller:"Private Seller",   sellerType:"Private",  inspected:false, warranty:false, return:false, delivery:false, badge:"Self-listed", image:__R("car14","https://images.unsplash.com/photo-1605559911160-a3d95d213904?w=1200&q=80"),  color:"#13141a", accidents:0, owners:2 },
  { id:"BMC-2416", brand:"jeep",      model:"Wrangler Rubicon",   year:2021, mileage:42100, price:9200,  monthly:190,  body:"suv",         transmission:"Automatic", fuel:"Petrol",   exterior:"Sting Grey",    interior:"Black Cloth",   cylinders:6, drive:"4WD", specs:"American",seats:5, location:"Jabriya",   seller:"Behbehani Motors", sellerType:"Platform", inspected:true,  warranty:true,  return:true,  delivery:true,  badge:"Inspected",   image:__R("car15","https://images.unsplash.com/photo-1623006772851-a8bf2c47fec1?w=1200&q=80"),  color:"#5a5d66", accidents:0, owners:1 },
];

const PARTNER_BANKS = [
  { id:"abk",    name:"Al Ahli Bank of Kuwait",     short:"ABK",    apr:4.25, fee:50, recommended:true },
  { id:"nbk",    name:"National Bank of Kuwait",    short:"NBK",    apr:4.50, fee:75, recommended:false },
  { id:"kfh",    name:"Kuwait Finance House",       short:"KFH",    apr:4.40, fee:50, recommended:false },
  { id:"burgan", name:"Burgan Bank",                short:"Burgan", apr:4.75, fee:35, recommended:false },
  { id:"gulf",   name:"Gulf Bank",                  short:"Gulf",   apr:4.60, fee:60, recommended:false },
];

const INSPECTION_POINTS = [
  { group:"Exterior",   total:18, passed:18, items:["Body panels & alignment","Paint condition","Bumpers & trim","Headlights & taillights","Glass & mirrors","Wheels & tires","Wipers & washers","Door seals","Sunroof operation"] },
  { group:"Mechanical", total:16, passed:15, items:["Engine performance","Cold start","Fluid levels","Belts & hoses","Brakes & pads","Suspension","Steering","Exhaust system"] },
  { group:"Electronic", total:14, passed:14, items:["Battery health","Alternator","Starter","Infotainment","Climate control","Power windows","Sensors & cameras"] },
  { group:"Interior",   total:13, passed:13, items:["Seats & upholstery","Dashboard","Carpets & headliner","Seatbelts","Trunk & cargo","Air-con cooling"] },
  { group:"Test Drive", total:10, passed:10, items:["Acceleration","Braking","Cornering","Transmission shifts","Idling","NVH (noise/vibration)"] },
];

// Helper to look up a brand by id
const brandOf = (id) => BRANDS.find(b=>b.id===id) || {name:id, nameAr:id};
const bodyOf  = (id) => BODY_TYPES.find(b=>b.id===id) || {name:id, nameAr:id};

// Currency formatter — KWD has 3 decimal places by Kuwait convention
const fmtKWD = (n, locale="en") => {
  const v = Number(n).toLocaleString(locale==="ar" ? "ar-KW" : "en-KW", {maximumFractionDigits:0});
  return locale==="ar" ? `${v} د.ك` : `KWD ${v}`;
};
const fmtKM = (n, locale="en") => {
  const v = Number(n).toLocaleString(locale==="ar" ? "ar-KW" : "en-KW");
  return locale==="ar" ? `${v} كم` : `${v} km`;
};

Object.assign(window, {
  BRAND, BRANDS, BODY_TYPES, CARS, PARTNER_BANKS, INSPECTION_POINTS,
  brandOf, bodyOf, fmtKWD, fmtKM,
});
