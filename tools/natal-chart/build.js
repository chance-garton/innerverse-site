const c=require('all-the-cities'),{find}=require('geo-tz'),fs=require('fs');
const min=+process.argv[2];
const rows=c.filter(x=>x.population>=min).sort((a,b)=>b.population-a.population);
const tzs=[],tzi={};const out=[];
for(const x of rows){const [lon,lat]=x.loc.coordinates;const tz=find(lat,lon)[0]||'UTC';
 if(!(tz in tzi)){tzi[tz]=tzs.length;tzs.push(tz)}
 const adm=/^[A-Z]{2,3}$/.test(x.adminCode)?x.adminCode:'';
 out.push([x.name,adm,x.country,lat.toFixed(3),lon.toFixed(3),tzi[tz]].join('|'))}
const s=JSON.stringify({tz:tzs,c:out.join('\n')});fs.writeFileSync('cities.json',s);
console.log(min,rows.length,(s.length/1e6).toFixed(2)+'MB', require('zlib').gzipSync(s).length/1e6);
